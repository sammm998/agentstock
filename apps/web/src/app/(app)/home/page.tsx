import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowRight, Bot, CircleDollarSign, FileText, Users } from "lucide-react";
import { AGENTS, AGENT_CATEGORIES, agentDisplayName, formatCents, getAgent } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { homeFeed } from "@/server/social";
import { platformStats } from "@/server/agents";
import { sparksSummary } from "@/server/sparks";
import { financials } from "@/server/commerce";
import { upcomingEvents } from "@/server/events";
import { myLiveMissions, todayCounters } from "@/server/live";
import { Composer, PostCard } from "@/components/post";
import { AgentIcon, SparksCoin, compactNumber } from "@/components/visuals";
import { AppLauncher, type LauncherApp } from "@/components/app-launcher";
import { MacWindow } from "@/components/agent-preview";
import { CalendarWidget, Widget } from "@/components/widgets";
import { TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Home" };

const PLATFORM_APPS: LauncherApp[] = [
  { href: "/communities", label: "Community", group: "Platform", icon: "users", accent: "#9aa8ff", platform: true },
  { href: "/live", label: "Control room", group: "Platform", icon: "activity", accent: "#4ef2c2", platform: true },
  { href: "/opportunities", label: "Opportunities", group: "Platform", icon: "bulb", accent: "#ffc861", platform: true },
  { href: "/marketplace", label: "Marketplace", group: "Platform", icon: "store", accent: "#ff7a90", platform: true },
  { href: "/projects", label: "Projects", group: "Platform", icon: "folder", accent: "#7dd3fc", platform: true },
  { href: "/wallet", label: "Wallet", group: "Platform", icon: "wallet", accent: "#4ef2c2", platform: true },
  { href: "/card", label: "Hustera Card", group: "Platform", icon: "card", accent: "#c9c4ff", platform: true },
  { href: "/learn", label: "Learn", group: "Platform", icon: "book", accent: "#fb923c", platform: true },
  { href: "/events", label: "Events", group: "Platform", icon: "calendar", accent: "#f87171", platform: true },
  { href: "/messages", label: "Messages", group: "Platform", icon: "chat", accent: "#6ee7b7", platform: true },
  { href: "/rewards", label: "Sparks", group: "Platform", icon: "sparks", accent: "#fde68a", platform: true },
  { href: "/settings", label: "Settings", group: "Platform", icon: "settings", accent: "#cbd5e1", platform: true },
];

export default async function HomePage() {
  const viewer = await requireViewer();
  const now = new Date();
  const [feed, stats, sparks, money, events, missions, today] = await Promise.all([
    homeFeed(viewer.id),
    platformStats(),
    sparksSummary(viewer.id),
    financials(viewer.id, false),
    upcomingEvents(viewer.id),
    myLiveMissions(viewer.id),
    todayCounters(viewer.id),
  ]);
  const apps: LauncherApp[] = [
    ...AGENTS.filter((a) => !a.adminOnly || viewer.role === "admin").map((a) => ({ href: `/agents/${a.id}`, label: a.name, group: a.category, icon: a.icon, accent: a.accent })),
    ...PLATFORM_APPS,
  ];
  const marked = events.filter((e) => { const d = new Date(e.starts_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).map((e) => new Date(e.starts_at).getDate());
  const running = missions.filter((m) => m.status === "active").length;
  const hour = now.getHours();
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-white/60">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{greeting}, {viewer.displayName.split(" ")[0]}</h1>
        </div>
        <Link href="/agents" className="btn-primary"><Bot size={16} aria-hidden="true" /> Start an agent</Link>
      </header>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_112px]">
        {/* Widgets */}
        <div className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <CalendarWidget now={now} marked={marked} />

          <Widget label="Your overview">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Your overview</p>
            <p className="mt-2 text-3xl font-bold tabular-nums">{formatCents(money.inputs.revenueCents)}</p>
            <p className="text-xs text-white/60">Verified revenue (real payments)</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["Agents", String(running)], ["Sales 24h", String(today.sales)], ["Clicks 24h", String(today.clicks)]].map(([l, v]) => (
                <div key={l} className="rounded-xl bg-white/5 py-2"><dd className="text-lg font-bold">{v}</dd><dt className="text-[10px] text-white/60">{l}</dt></div>
              ))}
            </dl>
            <Link href="/wallet" className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs hover:bg-white/10">Open wallet <ArrowRight size={13} aria-hidden="true" /></Link>
          </Widget>

          <Widget label="Sparks" className="flex items-center gap-4">
            <SparksCoin size={64} />
            <div>
              <p className="text-2xl font-bold text-mint">{sparks.balance}</p>
              <p className="text-xs text-white/60">Sparks · {sparks.tier.name}</p>
              <Link href="/rewards" className="text-xs text-[#b8b0ff] hover:underline">Rewards →</Link>
            </div>
          </Widget>

          <Widget label="Hustera right now">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">Hustera right now</p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li className="flex items-center gap-3"><Users size={16} className="text-[#9aa8ff]" aria-hidden="true" /><span className="flex-1 text-white/70">Members</span><span className="font-semibold">{compactNumber(stats.members)}</span></li>
              <li className="flex items-center gap-3"><Bot size={16} className="text-[#9aa8ff]" aria-hidden="true" /><span className="flex-1 text-white/70">Missions run</span><span className="font-semibold">{compactNumber(stats.missions)}</span></li>
              <li className="flex items-center gap-3"><CircleDollarSign size={16} className="text-mint" aria-hidden="true" /><span className="flex-1 text-white/70">Verified sales</span><span className="font-semibold">{formatCents(stats.earnings_real)}</span></li>
            </ul>
          </Widget>
        </div>

        {/* Windows */}
        <div className="min-w-0 space-y-6">
          <MacWindow title="Apps" accent="#6558f5">
            <AppLauncher apps={apps} groups={[...AGENT_CATEGORIES.filter((c) => apps.some((a) => a.group === c)), "Platform"]} />
          </MacWindow>

          {missions.length > 0 && (
            <MacWindow title="Running agents" accent="#4ef2c2">
              <ul className="divide-y divide-white/5">
                {missions.slice(0, 5).map((m) => {
                  const a = getAgent(m.agent_id);
                  const pct = m.total ? Math.round((m.done / m.total) * 100) : 0;
                  return (
                    <li key={m.id}>
                      <Link href={`/projects/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5">
                        {a && <AgentIcon icon={a.icon} accent={a.accent} size={34} />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{m.title}</p>
                          <p className="truncate text-xs text-white/60">{agentDisplayName(m.agent_id)} · {m.current ?? "all steps done"}</p>
                        </div>
                        <span className="w-24"><span className="block h-1.5 rounded-full bg-white/10"><span className="block h-1.5 rounded-full bg-gradient-to-r from-indigo to-mint" style={{ width: `${pct}%` }} /></span></span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href="/live" className="flex items-center gap-2 border-t border-white/5 px-4 py-2.5 text-xs text-mint hover:bg-white/5"><Activity size={13} aria-hidden="true" /> Open control room</Link>
            </MacWindow>
          )}

          <MacWindow title="Community" accent="#9aa8ff">
            <div id="share" className="space-y-4 p-4">
              <Composer name={viewer.displayName} handle={viewer.handle} />
              {feed.slice(0, 6).map((p) => <PostCard key={p.id} post={p} viewerId={viewer.id} />)}
              {feed.length === 0 && <p className="text-center text-sm text-white/60">Follow people or join a Space to fill your feed. <Link href="/discover" className="underline">Discover</Link></p>}
            </div>
          </MacWindow>
        </div>

        {/* Desktop files: your projects */}
        <aside aria-label="Your projects" className="hidden xl:block">
          <ul className="space-y-5">
            {missions.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link href={`/projects/${m.id}`} className="group flex flex-col items-center gap-1.5 text-center">
                  <span className="icon-tile size-14 rounded-xl text-[#9aa8ff] transition-transform group-hover:scale-110"><FileText size={26} strokeWidth={1.6} aria-hidden="true" /></span>
                  <span className="line-clamp-2 text-[11px] font-medium text-white/85 [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]">{m.title}</span>
                </Link>
              </li>
            ))}
            {events.slice(0, 2).map((e) => (
              <li key={e.id}>
                <Link href="/events" className="group flex flex-col items-center gap-1.5 text-center">
                  <span className="icon-tile size-14 flex-col rounded-xl text-[#f87171]"><span className="text-[9px] font-bold uppercase">{new Date(e.starts_at).toLocaleDateString("en-GB", { month: "short" })}</span><span className="text-lg font-bold leading-none text-white">{new Date(e.starts_at).getDate()}</span></span>
                  <span className="line-clamp-2 text-[11px] font-medium text-white/85">{e.title}</span>
                  <span className="text-[10px] text-white/50"><TimeAgo date={e.starts_at} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
