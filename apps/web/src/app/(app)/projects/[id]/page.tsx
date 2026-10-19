import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Bot, CheckCircle2, Circle, CircleAlert, Clock, OctagonX, Pause, Play, RotateCcw, User } from "lucide-react";
import { MISSION_KIND_LABEL, formatCents, getTool, type TaskStatus } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { getMission } from "@/server/agents";
import { isUuid } from "@/server/core";
import { approvalAction, missionStateAction, retryTaskAction, runMissionAction } from "@/app/actions";
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
  const open = mission.status !== "completed" && mission.status !== "stopped";
  const pct = budget.total_cents ? Math.min(100, Math.round((spend.committedCents / budget.total_cents) * 100)) : 0;
  const artifactByTask = new Map(artifacts.filter((a) => a.task_id).map((a) => [a.task_id!, a]));
  const hidden = (name: string, value: string) => <input type="hidden" name={name} value={value} />;

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
            <p className="mt-1 text-sm text-muted">{MISSION_KIND_LABEL[mission.kind]} · {mission.region} · {mission.mode === "autonomous" ? "Autonomous drafts" : "Approve each step"}</p>
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
                        Agent: {t.agent_id} · Tool: {tool?.name ?? t.tool_id} v{t.tool_version} · up to {tool?.maxCostCents ?? 0}¢{tool?.simulated ? " (simulated)" : ""}
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
