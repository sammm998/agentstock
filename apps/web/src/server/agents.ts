import "server-only";
import {
  canOnPlatform,
  canTransition,
  checkReservation,
  getTool,
  planMission,
  type MissionKind,
  type MissionMode,
  type MissionStatus,
  type PlatformRole,
  type TaskStatus,
} from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, audit } from "./core";
import { executeTool } from "./agent-tools";

const START_OF_UTC_DAY = `(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')`;

export interface MissionRow {
  id: string;
  owner_id: string;
  kind: MissionKind;
  title: string;
  brief: string;
  region: string;
  mode: MissionMode;
  price_cents: number;
  external_channel: boolean;
  status: MissionStatus;
  status_reason: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskRow {
  id: string;
  mission_id: string;
  key: string;
  seq: number;
  agent_id: string;
  tool_id: string;
  tool_version: number;
  title: string;
  depends_on: string[];
  status: TaskStatus;
  status_reason: string;
  requires_approval: boolean;
  attempts: number;
  updated_at: Date;
}

export interface BudgetRow {
  currency: string;
  total_cents: number;
  per_day_cents: number;
  per_task_cents: number;
  simulated: boolean;
}

async function event(
  db: Queryable,
  e: { missionId: string; taskId?: string | null; actor: "user" | "agent" | "system"; from?: string | null; to?: string | null; kind: string; message: string; data?: object },
) {
  await db.query(
    `insert into task_events (mission_id, task_id, actor, from_agent, to_agent, kind, message, data) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [e.missionId, e.taskId ?? null, e.actor, e.from ?? null, e.to ?? null, e.kind, e.message, JSON.stringify(e.data ?? {})],
  );
}

async function setTaskStatus(db: Queryable, task: Pick<TaskRow, "id" | "status">, to: TaskStatus, reason = "") {
  if (!canTransition(task.status, to)) throw new Error(`Illegal task transition ${task.status} → ${to}`);
  await db.query(`update tasks set status = $2, status_reason = $3, updated_at = now() where id = $1`, [task.id, to, reason]);
}

async function setMissionStatus(db: Queryable, missionId: string, status: MissionStatus, reason = "") {
  await db.query(`update missions set status = $2, status_reason = $3, updated_at = now() where id = $1`, [missionId, status, reason]);
}

async function ownedMission(db: Queryable, ownerId: string, missionId: string, lock = false): Promise<MissionRow> {
  const [m] = await db.query<MissionRow>(`select * from missions where id = $1 and owner_id = $2${lock ? " for update" : ""}`, [missionId, ownerId]);
  if (!m) throw new UserError("Mission not found");
  return m;
}

// ---------------------------------------------------------------- global kill switch

export async function agentsHalted(db: Queryable = { query: q }): Promise<boolean> {
  const [row] = await db.query<{ value: boolean }>(`select value from platform_flags where key = 'agents_halted'`);
  return row?.value ?? false;
}

export async function setAgentsHalted(actor: { id: string; role: PlatformRole }, halted: boolean) {
  if (!canOnPlatform(actor.role, "suspend_user")) throw new UserError("Only admins can stop all agents");
  await tx(async (db) => {
    await db.query(
      `insert into platform_flags (key, value, updated_by) values ('agents_halted', $1, $2)
       on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
      [halted, actor.id],
    );
    await audit(db, actor.id, halted ? "agents.halted" : "agents.resumed");
  });
}

// ---------------------------------------------------------------- missions

export async function createMission(
  ownerId: string,
  input: { kind: MissionKind; title: string; brief: string; region: string; mode: MissionMode; totalCents: number; perDayCents: number; perTaskCents: number; ownershipConfirmed: boolean; priceCents?: number; externalChannel?: boolean },
): Promise<string> {
  const plan = planMission(input.kind, { externalChannel: input.externalChannel });
  return tx(async (db) => {
    const [active] = await db.query<{ n: number }>(`select count(*)::int as n from missions where owner_id = $1 and status in ('active','paused','blocked')`, [ownerId]);
    if ((active?.n ?? 0) >= 10) throw new UserError("You can have at most 10 open missions. Stop or complete one first.");
    const [m] = await db.query<{ id: string }>(
      `insert into missions (owner_id, kind, title, brief, region, mode, ownership_confirmed, price_cents, external_channel) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [ownerId, input.kind, input.title, input.brief, input.region, input.mode, input.ownershipConfirmed, input.priceCents ?? 900, input.externalChannel ?? false],
    );
    const missionId = m!.id;
    await db.query(`insert into budgets (mission_id, total_cents, per_day_cents, per_task_cents) values ($1, $2, $3, $4)`, [missionId, input.totalCents, input.perDayCents, input.perTaskCents]);
    let seq = 0;
    for (const t of plan) {
      const tool = getTool(t.toolId)!;
      const requiresApproval = tool.requiresApproval || input.mode === "approve_each";
      await db.query(
        `insert into tasks (mission_id, key, seq, agent_id, tool_id, tool_version, title, depends_on, requires_approval) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [missionId, t.key, seq++, t.agentId, tool.id, tool.version, t.title, t.dependsOn, requiresApproval],
      );
    }
    await event(db, { missionId, actor: "agent", from: "core", kind: "planned", message: `Hustera Core planned ${plan.length} tasks for “${input.title}”.` });
    await audit(db, ownerId, "mission.created", missionId);
    return missionId;
  });
}

export async function listMissions(ownerId: string) {
  return q<MissionRow & { done: number; total: number }>(
    `select m.*, (select count(*) from tasks t where t.mission_id = m.id and t.status = 'succeeded')::int as done,
            (select count(*) from tasks t where t.mission_id = m.id)::int as total
       from missions m where m.owner_id = $1 order by m.created_at desc`,
    [ownerId],
  );
}

async function usage(db: Queryable, missionId: string) {
  const [u] = await db.query<{ committed: number; today: number; settled: number }>(
    `select coalesce(sum(case when status = 'held' then amount_cents when status = 'settled' then settled_cents else 0 end), 0)::int as committed,
            coalesce(sum(case when status = 'held' then amount_cents when status = 'settled' then settled_cents else 0 end) filter (where created_at >= ${START_OF_UTC_DAY}), 0)::int as today,
            coalesce(sum(settled_cents) filter (where status = 'settled'), 0)::int as settled
       from budget_reservations where mission_id = $1`,
    [missionId],
  );
  return { committedCents: u?.committed ?? 0, committedTodayCents: u?.today ?? 0, settledCents: u?.settled ?? 0 };
}

export async function getMission(ownerId: string, missionId: string) {
  const mission = await one<MissionRow>(`select * from missions where id = $1 and owner_id = $2`, [missionId, ownerId]);
  if (!mission) return null;
  const [budget, tasks, events, artifacts, spend, halted] = await Promise.all([
    one<BudgetRow>(`select * from budgets where mission_id = $1`, [missionId]),
    q<TaskRow>(`select * from tasks where mission_id = $1 order by seq`, [missionId]),
    q<{ id: number; actor: string; from_agent: string | null; to_agent: string | null; kind: string; message: string; created_at: Date }>(
      `select id, actor, from_agent, to_agent, kind, message, created_at from task_events where mission_id = $1 order by id desc limit 200`,
      [missionId],
    ),
    q<{ id: string; task_id: string | null; kind: string; title: string; content: string; simulated: boolean; created_at: Date }>(
      `select id, task_id, kind, title, content, simulated, created_at from artifacts where mission_id = $1 order by created_at`,
      [missionId],
    ),
    tx((db) => usage(db, missionId)),
    agentsHalted(),
  ]);
  return { mission, budget: budget!, tasks, events, artifacts, spend, halted };
}

// ---------------------------------------------------------------- execution

export type StepResult = "progressed" | "waiting" | "done" | "halted";

/**
 * Advances a mission by at most one task. Runs in a single transaction so the
 * budget reservation, the tool result and the task state stay consistent.
 */
async function step(ownerId: string, missionId: string): Promise<StepResult> {
  return tx(async (db) => {
    if (await agentsHalted(db)) return "halted";
    const mission = await ownedMission(db, ownerId, missionId, true);
    if (mission.status !== "active") return "waiting";

    const tasks = await db.query<TaskRow>(`select * from tasks where mission_id = $1 order by seq for update`, [missionId]);
    const byKey = new Map(tasks.map((t) => [t.key, t]));
    const ready = tasks.filter((t) => t.status === "queued" && t.depends_on.every((d) => byKey.get(d)?.status === "succeeded"));

    // Ask for every approval that is due at once, so independent tasks don't wait on each other.
    let runnable: TaskRow | undefined;
    let requested = false;
    for (const t of ready) {
      if (t.requires_approval) {
        const [approval] = await db.query<{ decision: string | null }>(`select decision from approvals where task_id = $1 order by requested_at desc limit 1`, [t.id]);
        if (approval?.decision !== "approved") {
          await setTaskStatus(db, t, "awaiting_approval");
          t.status = "awaiting_approval";
          await db.query(`insert into approvals (task_id) values ($1)`, [t.id]);
          const cost = getTool(t.tool_id)?.maxCostCents ?? 0;
          await event(db, { missionId, taskId: t.id, actor: "agent", from: "core", kind: "approval_requested", message: `Approval needed: ${t.title} (up to ${cost}¢, test mode).` });
          requested = true;
          continue;
        }
      }
      runnable ??= t;
    }
    if (!runnable && requested) return "waiting";

    if (!runnable) {
      if (tasks.every((t) => t.status === "succeeded")) {
        await setMissionStatus(db, missionId, "completed");
        await event(db, { missionId, actor: "agent", from: "core", kind: "completed", message: "All tasks finished." });
        return "done";
      }
      if (tasks.some((t) => t.status === "awaiting_approval")) return "waiting";
      const stuck = tasks.find((t) => t.status === "blocked" || t.status === "failed" || t.status === "cancelled");
      const reason = stuck ? `“${stuck.title}” is ${stuck.status}${stuck.status_reason ? `: ${stuck.status_reason}` : ""}` : "No runnable tasks";
      // An essential step that can't run marks the mission blocked rather than pretending success.
      await setMissionStatus(db, missionId, "blocked", reason);
      await event(db, { missionId, actor: "system", kind: "blocked", message: `Mission blocked — ${reason}` });
      return "done";
    }

    const tool = getTool(runnable.tool_id);
    if (!tool || tool.version !== runnable.tool_version) {
      await setTaskStatus(db, runnable, "blocked", "Tool version is no longer available");
      return "progressed";
    }

    const [budget] = await db.query<BudgetRow>(`select * from budgets where mission_id = $1`, [missionId]);
    const used = await usage(db, missionId);
    const decision = checkReservation({ totalCents: budget!.total_cents, perDayCents: budget!.per_day_cents, perTaskCents: budget!.per_task_cents }, used, tool.maxCostCents);
    if (!decision.ok) {
      await setTaskStatus(db, runnable, "blocked", decision.reason);
      await setMissionStatus(db, missionId, "paused", decision.reason);
      await event(db, { missionId, taskId: runnable.id, actor: "system", kind: "budget_denied", message: `Budget engine denied “${runnable.title}”: ${decision.reason}. Mission paused.` });
      return "waiting";
    }

    const [reservation] = await db.query<{ id: string }>(
      `insert into budget_reservations (mission_id, task_id, amount_cents, simulated) values ($1, $2, $3, $4) returning id`,
      [missionId, runnable.id, tool.maxCostCents, tool.simulated],
    );
    await setTaskStatus(db, runnable, "running");
    await db.query(`update tasks set attempts = attempts + 1 where id = $1`, [runnable.id]);
    await event(db, { missionId, taskId: runnable.id, actor: "agent", from: "core", to: runnable.agent_id, kind: "dispatched", message: `${runnable.agent_id === "core" ? "Core is working on" : `Core → ${runnable.agent_id}:`} ${runnable.title} (reserved ${tool.maxCostCents}¢, test mode)` });

    const inputs: Record<string, string> = {};
    const prior = await db.query<{ key: string; content: string }>(
      `select distinct on (t.key) t.key, a.content from artifacts a join tasks t on t.id = a.task_id where a.mission_id = $1 order by t.key, a.created_at desc`,
      [missionId],
    );
    for (const a of prior) inputs[a.key] = a.content;

    const outcome = await executeTool(tool.id, { db, ownerId, missionId, kind: mission.kind, title: mission.title, brief: mission.brief, region: mission.region, priceCents: mission.price_cents, inputs });
    const running = { id: runnable.id, status: "running" as TaskStatus };

    if (outcome.ok) {
      const cost = Math.min(outcome.result.costCents, tool.maxCostCents);
      const [artifact] = await db.query<{ id: string }>(
        `insert into artifacts (mission_id, task_id, kind, title, content, simulated) values ($1, $2, $3, $4, $5, $6) returning id`,
        [missionId, runnable.id, outcome.result.artifact.kind, outcome.result.artifact.title, outcome.result.artifact.content, tool.simulated],
      );
      await db.query(`update budget_reservations set status = 'settled', settled_cents = $2, settled_at = now() where id = $1`, [reservation!.id, cost]);
      await setTaskStatus(db, running, "succeeded");
      await event(db, { missionId, taskId: runnable.id, actor: "agent", from: runnable.agent_id, to: "core", kind: "result", message: `${runnable.agent_id === "core" ? "Core" : `${runnable.agent_id} → Core`}: ${outcome.result.message} (cost ${cost}¢${tool.simulated ? ", simulated" : ""})`, data: { artifactId: artifact!.id } });
    } else {
      await db.query(`update budget_reservations set status = 'released', settled_at = now() where id = $1`, [reservation!.id]);
      if (outcome.blocked) {
        await setTaskStatus(db, running, "blocked", outcome.reason);
        await event(db, { missionId, taskId: runnable.id, actor: "agent", from: runnable.agent_id, to: "core", kind: "blocked", message: `${runnable.agent_id} → Core: cannot complete “${runnable.title}” — ${outcome.reason}` });
      } else {
        await setTaskStatus(db, running, "failed", outcome.error);
        await event(db, { missionId, taskId: runnable.id, actor: "agent", from: runnable.agent_id, to: "core", kind: "failed", message: `${runnable.title} failed: ${outcome.error}` });
      }
    }
    return "progressed";
  });
}

/** Runs a mission until it waits for the user, is blocked, or finishes. */
export async function runMission(ownerId: string, missionId: string, maxSteps = 20): Promise<StepResult> {
  let last: StepResult = "waiting";
  for (let i = 0; i < maxSteps; i++) {
    last = await step(ownerId, missionId);
    if (last !== "progressed") break;
  }
  if (last === "halted") throw new UserError("All agents are paused by Hustera administrators. Try again later.");
  return last;
}

export async function decideApproval(ownerId: string, taskId: string, approve: boolean) {
  await tx(async (db) => {
    const [task] = await db.query<TaskRow>(`select t.* from tasks t join missions m on m.id = t.mission_id where t.id = $1 and m.owner_id = $2 for update of t`, [taskId, ownerId]);
    if (!task) throw new UserError("Task not found");
    if (task.status !== "awaiting_approval") throw new UserError("This task isn't waiting for approval");
    await db.query(
      `update approvals set decision = $2, decided_by = $3, decided_at = now() where id = (select id from approvals where task_id = $1 and decision is null order by requested_at desc limit 1)`,
      [taskId, approve ? "approved" : "rejected", ownerId],
    );
    await setTaskStatus(db, task, approve ? "queued" : "cancelled", approve ? "" : "Rejected by you");
    await event(db, { missionId: task.mission_id, taskId, actor: "user", kind: approve ? "approved" : "rejected", message: `You ${approve ? "approved" : "rejected"} “${task.title}”.` });
  });
}

export async function setMissionState(ownerId: string, missionId: string, action: "pause" | "resume" | "stop") {
  await tx(async (db) => {
    const m = await ownedMission(db, ownerId, missionId, true);
    if (m.status === "stopped" || m.status === "completed") throw new UserError(`Mission is already ${m.status}`);
    if (action === "pause") {
      await setMissionStatus(db, missionId, "paused", "Paused by you");
    } else if (action === "resume") {
      // Budget-blocked tasks get another chance after a resume (e.g. on a new day).
      await db.query(`update tasks set status = 'queued', status_reason = '' where mission_id = $1 and status = 'blocked' and tool_id like 'sandbox.%'`, [missionId]);
      await setMissionStatus(db, missionId, "active");
    } else {
      await db.query(`update tasks set status = 'cancelled', status_reason = 'Mission stopped', updated_at = now() where mission_id = $1 and status in ('queued','awaiting_approval','blocked','failed')`, [missionId]);
      await db.query(`update budget_reservations set status = 'released', settled_at = now() where mission_id = $1 and status = 'held'`, [missionId]);
      await setMissionStatus(db, missionId, "stopped", "Stopped by you");
    }
    await event(db, { missionId, actor: "user", kind: action, message: `You ${action === "stop" ? "stopped" : action === "pause" ? "paused" : "resumed"} the mission.` });
  });
}

export async function retryTask(ownerId: string, taskId: string) {
  await tx(async (db) => {
    const [task] = await db.query<TaskRow>(`select t.* from tasks t join missions m on m.id = t.mission_id where t.id = $1 and m.owner_id = $2 for update of t`, [taskId, ownerId]);
    if (!task) throw new UserError("Task not found");
    if (task.status !== "blocked" && task.status !== "failed") throw new UserError("Only blocked or failed tasks can be retried");
    await setTaskStatus(db, task, "queued");
    await db.query(`update missions set status = 'active', status_reason = '' where id = $1 and status in ('blocked','paused')`, [task.mission_id]);
    await event(db, { missionId: task.mission_id, taskId, actor: "user", kind: "retry", message: `You retried “${task.title}”.` });
  });
}
