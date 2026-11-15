import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Bot, CheckCircle2, Circle, CircleAlert, Clock, OctagonX, Pause, Play, RotateCcw, User } from "lucide-react";
import { MISSION_KIND_LABEL, agentDisplayName, formatCents, getAgent, getTool, planWorkflow, type TaskStatus } from "@hustera/domain";
import { AutoRefresh } from "@/components/live";
import { WorkflowDiagram, type StepState } from "@/components/workflow-diagram";
import { requireViewer } from "@/server/session";
import { getMission, missionResults } from "@/server/agents";
import { isUuid } from "@/server/core";
import { approvalAction, missionRepeatAction, missionStateAction, retryTaskAction, runMissionAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { MissionStatusBadge, TaskStatusText } from "@/components/missions";
import { Illustrative, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Mission" };

const ICON: Record<TaskStatus, typeof Circle> = {
  queued: Circle,
  awaiting_approval: Clock,
  running: Clock,
  succeeded: CheckCircle2,
  failed: CircleAlert,
  blocked: CircleAlert,
  cancelled: OctagonX,
};

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getMission(viewer.id, id);
  if (!data) notFound();
  const { mission, budget, tasks, events, artifacts, spend, halted } = data;
  const results = await missionResults(viewer.id, mission.id);
  const open = mission.status !== "completed" && mission.status !== "stopped";
  const pct = budget.total_cents ? Math.min(100, Math.round((spend.committedCents / budget.total_cents) * 100)) : 0;
  const artifactByTask = new Map(artifacts.filter((a) => a.task_id).map((a) => [a.task_id!, a]));
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;
  const agent = getAgent(mission.kind);
  const repeatOptions = agent?.repeat ?? (["revenue_report", "market_watch"].includes(mission.kind) ? [24, 168] : []);
  const every = (h: number) => (h === 1 ? "hour" : h === 24 ? "day" : h === 168 ? "week" : `${h} hours`);
  const states = Object.fromEntries(tasks.map((t) => [t.key, t.status as StepState]));
  const flow = agent ? planWorkflow(agent.id, { ...(mission.params ?? {}), externalChannel: mission.external_channel ? "on" : "" }).filter((s) => tasks.some((t) => t.key === s.key)) : [];
  const working = mission.status === "active" && mission.mode === "autonomous" && tasks.some((t) => t.status === "queued" || t.status === "running") && !tasks.some((t) => t.status === "awaiting_approval");

  return (
    <div className="space-y-6">
      <Link href="/projects" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> Projects</Link>

      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{mission.title}</h1>
              <MissionStatusBadge status={mission.status} />
              <Illustrative>Test mode</Illustrative>
            </div>
            <p className="mt-1 text-sm text-muted">{agent ? agent.name : (MISSION_KIND_LABEL[mission.kind] ?? agentDisplayName(mission.kind))} · {mission.region} · {mission.mode === "autonomous" ? "Autonomous drafts" : "Approve each step"}</p>
            {mission.status_reason && <p className="mt-2 text-sm text-warning">{mission.status_reason}</p>}
            {halted && <p className="mt-2 text-sm text-danger">All agents are currently paused by Hustera administrators.</p>}
          </div>
          {open && (
            <div className="flex flex-wrap gap-2">
              {mission.status === "active" && (
                <ActionForm action={runMissionAction} showOk>
                  {hidden("missionId", mission.id)}
                  <button className="btn-primary"><Play size={16} aria-hidden="true" /> Run agents</button>
                </ActionForm>
              )}
              <ActionForm action={missionStateAction}>
                {hidden("missionId", mission.id)}
                {mission.status === "active" ? (
                  <button name="op" value="pause" className="btn-secondary"><Pause size={16} aria-hidden="true" /> Pause</button>
                ) : (
                  <button name="op" value="resume" className="btn-secondary"><Play size={16} aria-hidden="true" /> Resume</button>
                )}
              </ActionForm>
              <ActionForm action={missionStateAction} confirm="Stop this mission? Queued tasks are cancelled and held budget is released.">
                {hidden("missionId", mission.id)}
                <button name="op" value="stop" className="btn-danger"><OctagonX size={16} aria-hidden="true" /> Stop</button>
              </ActionForm>
            </div>
          )}
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-muted">Brief</summary>
          <p className="mt-2 whitespace-pre-wrap">{mission.brief}</p>
        </details>
      </header>

      {working && <AutoRefresh seconds={3} />}
      {agent && flow.length > 0 && (
        <details className="card p-6" open={mission.status === "active"}>
          <summary className="cursor-pointer font-semibold">Live workflow · {tasks.filter((t) => t.status === "succeeded").length}/{tasks.length} steps done</summary>
          <div className="mt-5"><WorkflowDiagram steps={flow} accent={agent.accent} states={states} /></div>
        </details>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="tasks-h" className="space-y-3">
          <h2 id="tasks-h" className="eyebrow">Tasks</h2>
          <ol className="space-y-3">
            {tasks.map((t) => {
              const Icon = ICON[t.status];
              const tool = getTool(t.tool_id);
              const artifact = artifactByTask.get(t.id);
              return (
                <li key={t.id} className="card p-5">
                  <div className="flex items-start gap-3">
                    <Icon size={20} className={t.status === "succeeded" ? "text-mint" : t.status === "blocked" || t.status === "failed" ? "text-danger" : "text-muted"} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{t.title}</h3>
                        <TaskStatusText status={t.status} />
                      </div>
                      <p className="text-xs text-muted">
                        Agent: {agentDisplayName(t.agent_id)} · Tool: {tool?.name ?? t.tool_id} v{t.tool_version} · up to {tool?.maxCostCents ?? 0}¢{tool?.simulated ? " (simulated)" : ""}
                      </p>
                      {t.status_reason && <p className="mt-2 text-sm text-warning">{t.status_reason}</p>}
                      {t.status === "awaiting_approval" && (
                        <ActionForm action={approvalAction} className="mt-3 flex gap-2">
                          {hidden("missionId", mission.id)}
                          {hidden("taskId", t.id)}
                          <button name="decision" value="approve" className="btn-primary btn-sm">Approve</button>
                          <button name="decision" value="reject" className="btn-secondary btn-sm">Reject</button>
                        </ActionForm>
                      )}
                      {(t.status === "blocked" || t.status === "failed") && open && (
                        <ActionForm action={retryTaskAction} className="mt-3">
                          {hidden("missionId", mission.id)}
                          {hidden("taskId", t.id)}
                          <button className="btn-secondary btn-sm"><RotateCcw size={14} aria-hidden="true" /> Retry</button>
                        </ActionForm>
                      )}
                      {artifact && (
                        <details className="mt-3 rounded-xl border border-line bg-midnight/40 p-4">
                          <summary className="cursor-pointer text-sm font-medium text-mint">{artifact.title}{artifact.simulated ? " · draft" : ""}</summary>
                          <div className="mt-4"><Markdown source={artifact.content} /></div>
                        </details>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="space-y-6">
          {repeatOptions.length > 0 && (
            <section className="card p-5" aria-labelledby="sched-h">
              <h2 id="sched-h" className="font-semibold">Schedule</h2>
              <p className="mt-1 text-sm text-muted">{mission.repeat_hours ? <>Runs every {every(mission.repeat_hours)}{mission.next_run_at ? <> · next <TimeAgo date={mission.next_run_at} /></> : null}</> : "Runs once"}</p>
              <ActionForm action={missionRepeatAction} showOk className="mt-3 flex gap-2">
                <input type="hidden" name="missionId" value={mission.id} />
                <select name="repeatHours" defaultValue={mission.repeat_hours ?? ""} aria-label="Schedule" className="input"><option value="">Run once</option>{repeatOptions.map((h) => <option key={h} value={h}>Every {every(h)}</option>)}</select>
                <button className="btn-secondary btn-sm">Save</button>
              </ActionForm>
            </section>
          )}
          <section className="card border-mint/25 p-5" aria-labelledby="results-h">
            <h2 id="results-h" className="font-semibold">Results</h2>
            {results.products === 0 ? (
              <p className="mt-2 text-sm text-muted">No product in your store yet. Results appear here once the agent publishes.</p>
            ) : (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted">Live products</dt><dd className="text-lg font-bold">{results.live}</dd></div>
                  <div><dt className="text-muted">Paid orders</dt><dd className="text-lg font-bold">{results.paid}</dd></div>
                  <div><dt className="text-muted">Real revenue</dt><dd className="text-lg font-bold text-mint">{formatCents(results.revenue_real)}</dd></div>
                  <div><dt className="text-muted">Test revenue</dt><dd className="text-lg font-bold">{formatCents(results.revenue_test)}</dd></div>
                </dl>
                {results.refunded > 0 && <p className="mt-2 text-xs text-muted">{results.refunded} refunded</p>}
                {results.product_id && results.store_slug && results.product_status === "active" && (
                  <Link href={`/store/${results.store_slug}/${results.product_id}`} className="btn-secondary btn-sm mt-3 w-full">View product page</Link>
                )}
              </>
            )}
          </section>
          <section className="card p-5" aria-labelledby="budget-h">
            <div className="flex items-center justify-between">
              <h2 id="budget-h" className="font-semibold">Budget</h2>
              <Illustrative>Simulated</Illustrative>
            </div>
            <p className="mt-3 text-2xl font-bold">{formatCents(spend.committedCents, budget.currency)} <span className="text-sm font-normal text-muted">of {formatCents(budget.total_cents, budget.currency)}</span></p>
            <div className="mt-2 h-2 rounded-full bg-midnight" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
              <div className={`h-2 rounded-full ${pct > 85 ? "bg-warning" : "bg-gradient-to-r from-indigo to-mint"}`} style={{ width: `${pct}%` }} />
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Settled</dt><dd>{formatCents(spend.settledCents, budget.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Today</dt><dd>{formatCents(spend.committedTodayCents, budget.currency)} / {formatCents(budget.per_day_cents, budget.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Per task</dt><dd>≤ {formatCents(budget.per_task_cents, budget.currency)}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Costs are reserved at their upper bound before each task and settled afterwards. No real money moves until a payment provider is connected.</p>
          </section>

          <section className="card p-5" aria-labelledby="log-h">
            <h2 id="log-h" className="font-semibold">Activity</h2>
            <ol className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2.5 text-sm">
                  <span className="mt-0.5 text-muted" aria-hidden="true">{e.actor === "user" ? <User size={14} /> : <Bot size={14} />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{e.message}</p>
                    <p className="text-xs text-muted"><TimeAgo date={e.created_at} /></p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
