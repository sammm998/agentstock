import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ChartLine, MousePointerClick, Megaphone, ShoppingBag } from "lucide-react";
import { agentDisplayName, formatCents, getAgent } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { myEventStream, myLiveMissions, myPortfolios, publicFund, todayCounters } from "@/server/live";
import { PortfolioCard } from "@/components/portfolio";
import { AutoRefresh } from "@/components/live";
import { AgentIcon } from "@/components/visuals";
import { PageHeader, TimeAgo } from "@/components/ui";
import { WorkflowMini } from "@/components/workflow-diagram";

export const metadata: Metadata = { title: "Control room" };

export default async function LivePage() {
  const viewer = await requireViewer();
  const [missions, events, counters, portfolios, fund] = await Promise.all([myLiveMissions(viewer.id), myEventStream(viewer.id), todayCounters(viewer.id), myPortfolios(viewer.id), publicFund()]);
  const stats = [
    { label: "Sales (24h)", value: `${counters.sales} · ${formatCents(counters.revenue_cents)}`, icon: ShoppingBag, color: "#34d399" },
    { label: "Affiliate clicks (24h)", value: String(counters.clicks), icon: MousePointerClick, color: "#a78bfa" },
    { label: "Posts published (24h)", value: String(counters.posts), icon: Megaphone, color: "#fb923c" },
    { label: "Paper trades (24h)", value: String(counters.trades), icon: ChartLine, color: "#5ac8fa" },
  ];
  return (
    <>
      <AutoRefresh seconds={5} />
      <PageHeader title="Control room" description="Every agent you run, what it is doing right now, and what it earned, clicked, posted or traded — refreshed live." actions={<Link href="/agents" className="btn-primary">Start an agent</Link>} />
      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className="card p-4">
              <span className="icon-tile mb-3 size-9 rounded-xl" style={{ color: s.color }}><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span>
              <p className="text-xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="running-h">
          <h2 id="running-h" className="mb-3 flex items-center gap-2 text-lg font-bold"><span className="animate-pulse-ring size-2 rounded-full bg-mint" aria-hidden="true" /> Your agents</h2>
          {missions.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {missions.map((m) => {
                const a = getAgent(m.agent_id);
                const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
                return (
                  <li key={m.id}>
                    <Link href={`/projects/${m.id}`} className="card lift block p-4">
                      <div className="flex items-center gap-3">
                        {a ? <AgentIcon icon={a.icon} accent={a.accent} size={36} /> : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{m.title}</p>
                          <p className="text-xs text-muted">{agentDisplayName(m.agent_id)} · {m.status}{m.repeat_hours ? ` · every ${m.repeat_hours}h` : ""}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{pct}%</span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo to-mint transition-all" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-2 text-xs text-muted">{m.current ? <>Now: <span className="text-cloud">{m.current}</span> ({m.current_status?.replace("_", " ")})</> : m.next_run_at ? <>Next run <TimeAgo date={m.next_run_at} /></> : "All steps done"}</p>
                      {a && <div className="mt-3"><WorkflowMini steps={a.steps} accent={a.accent} max={8} /></div>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="card p-8 text-center text-sm text-muted">No agents running yet. <Link href="/agents" className="underline">Pick one from the catalog</Link>.</div>
          )}

          {(portfolios.length > 0 || fund.length > 0) && (
            <>
              <h2 className="mb-3 mt-8 text-lg font-bold">Portfolios</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {portfolios.map((p) => <PortfolioCard key={p.id} p={p} />)}
                {fund.filter((f) => !portfolios.some((p) => p.id === f.id)).map((p) => <PortfolioCard key={p.id} p={p} />)}
              </div>
              <p className="mt-2 text-xs text-muted">Simulated trading only. Real-money trading and profit sharing are disabled until Hustera holds the required licences.</p>
            </>
          )}
        </section>

        <section aria-labelledby="stream-h" className="card h-fit p-5">
          <h2 id="stream-h" className="flex items-center gap-2 font-semibold"><Activity size={16} className="text-mint" aria-hidden="true" /> Live activity</h2>
          {events.length ? (
            <ol className="mt-4 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-white/15 pl-3 text-sm">
                  <p><span className="font-semibold">{agentDisplayName(e.from_agent ?? "core")}</span> <span className="text-muted">· {e.title}</span></p>
                  <p className="text-muted">{e.message}</p>
                  <p className="text-[11px] text-muted/80"><TimeAgo date={e.created_at} /></p>
                </li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-muted">Activity from your agents appears here as it happens.</p>}
        </section>
      </div>
    </>
  );
}
