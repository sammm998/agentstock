import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { canOnPlatform } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { openAppeals, reportQueue } from "@/server/moderation";
import { decideAppealAction, haltAgentsAction, resolveReportAction } from "@/app/actions";
import { agentsHalted } from "@/server/agents";
import { ActionForm } from "@/components/action-form";
import { EmptyState, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Moderation" };

const ACTION_LABEL: Record<string, string> = {
  post: "Remove post",
  comment: "Remove comment",
  channel_message: "Remove message",
  user: "Suspend account",
  space: "Make Space private",
  rewards_entry: "Restore Sparks",
};

export default async function ModerationPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer();
  if (!canOnPlatform(viewer.role, "view_reports")) notFound();
  const closed = (await searchParams).view === "closed";
  const [reports, appeals, halted] = await Promise.all([reportQueue(viewer.role, closed ? "closed" : "open"), openAppeals(viewer.role), agentsHalted()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation"
        description="Review reports against the community guidelines. Every decision is logged and can be appealed."
        actions={<Link href={closed ? "/moderation" : "/moderation?view=closed"} className="btn-secondary btn-sm">{closed ? "Open queue" : "Resolved"}</Link>}
      />
      {canOnPlatform(viewer.role, "suspend_user") && (
        <section className={`card flex flex-wrap items-center justify-between gap-4 p-5 ${halted ? "border-danger/40" : ""}`} aria-labelledby="killswitch">
          <div>
            <h2 id="killswitch" className="font-semibold">Agent emergency stop</h2>
            <p className="text-sm text-muted">{halted ? "All agent missions are paused platform-wide." : "Agents are running normally. Stopping pauses every mission immediately."}</p>
          </div>
          <ActionForm action={haltAgentsAction} confirm={halted ? undefined : "Pause all agents for every user?"}>
            <button name="op" value={halted ? "resume" : "halt"} className={halted ? "btn-primary" : "btn-danger"}>{halted ? "Resume agents" : "Stop all agents"}</button>
          </ActionForm>
        </section>
      )}
      <section aria-labelledby="reports">
        <h2 id="reports" className="eyebrow mb-3">{closed ? "Resolved reports" : `Open reports (${reports.length})`}</h2>
        {reports.length ? (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="chip capitalize">{r.target_type.replace("_", " ")}</span>
                  <span className="chip border-danger/30 text-danger">{r.reason.replace(/_/g, " ")}</span>
                  <span className="text-muted">by @{r.reporter ?? "deleted"} · <TimeAgo date={r.created_at} /></span>
                  {closed && <span className="chip capitalize text-mint">{r.status}</span>}
                </div>
                <blockquote className="mt-3 rounded-xl bg-midnight/50 px-4 py-3 text-sm">
                  {r.owner_handle && <span className="mb-1 block text-xs text-muted">@{r.owner_handle}</span>}
                  {r.preview ?? <em className="text-muted">Content no longer exists</em>}
                </blockquote>
                {r.details && <p className="mt-2 text-sm text-muted">“{r.details}”</p>}
                {!closed && (
                  <ActionForm action={resolveReportAction} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="reportId" value={r.id} />
                    <input name="note" maxLength={500} placeholder="Note for the log (shown to the user)" aria-label="Resolution note" className="input min-w-48 flex-1" />
                    <button name="decision" value="action" className="btn-danger btn-sm">{ACTION_LABEL[r.target_type]}</button>
                    <button name="decision" value="dismiss" className="btn-secondary btn-sm">Dismiss</button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={closed ? "Nothing resolved yet" : "The queue is clear"}>Thanks for keeping Hustera safe.</EmptyState>
        )}
      </section>

      {canOnPlatform(viewer.role, "decide_appeals") && (
        <section aria-labelledby="appeals">
          <h2 id="appeals" className="eyebrow mb-3">Open appeals ({appeals.length})</h2>
          {appeals.length ? (
            <ul className="space-y-3">
              {appeals.map((a) => (
                <li key={a.id} className="card p-5 text-sm">
                  <p><span className="font-semibold">@{a.handle}</span> appeals <span className="text-muted">{a.action}</span> · <TimeAgo date={a.created_at} /></p>
                  {a.note && <p className="mt-1 text-muted">Original reason: {a.note}</p>}
                  <p className="mt-3 rounded-xl bg-midnight/50 px-4 py-3">{a.body}</p>
                  <ActionForm action={decideAppealAction} className="mt-3 flex gap-2">
                    <input type="hidden" name="appealId" value={a.id} />
                    <button name="decision" value="overturn" className="btn-primary btn-sm">Overturn & restore</button>
                    <button name="decision" value="uphold" className="btn-secondary btn-sm">Uphold</button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No open appeals.</p>
          )}
        </section>
      )}
    </div>
  );
}
