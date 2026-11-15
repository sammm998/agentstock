import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Bot, Check, CircleDollarSign, Users } from "lucide-react";
import { AGENTS, agentDisplayName, OPPORTUNITY_TEMPLATES, STATUS_LABEL, formatCents } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { homeFeed } from "@/server/social";
import { q } from "@/server/db";
import { agentUsage, platformStats, templateUsage } from "@/server/agents";
import { sparksSummary } from "@/server/sparks";
import { Composer, PostCard } from "@/components/post";
import { Avatar, EmptyState } from "@/components/ui";
import { AgentIcon, HeroArt, HusteraCardVisual, SparksCoin, compactNumber } from "@/components/visuals";
import { OpportunityIcon } from "@/components/opportunity";
import { WorkflowMini } from "@/components/workflow-diagram";

export const metadata: Metadata = { title: "Home" };

const COMMUNITY_CHIPS: [string, string][] = [
  ["Share ideas", "#share"],
  ["Get help", "/communities"],
  ["Join projects", "/marketplace"],
  ["Learn", "/learn"],
  ["Collaborate", "/communities"],
  ["Earn together", "/opportunities"],
];

const BADGE_STYLE: Record<string, string> = {
  VERIFIED: "bg-mint/15 text-mint",
  NEEDS_CONNECTION: "bg-warning/15 text-warning",
  TESTED_SIMULATION: "bg-indigo/20 text-[#c9c4ff]",
  NOT_BUILT: "bg-slate-3 text-muted",
  NEEDS_APPROVAL: "bg-warning/15 text-warning",
  BLOCKED: "bg-danger/15 text-danger",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await requireViewer();
  const { welcome } = await searchParams;
  const [feed, stats, usage, joined, sparks, members] = await Promise.all([
    homeFeed(viewer.id),
    platformStats(),
    agentUsage(),
    templateUsage(),
    sparksSummary(viewer.id),
    q<{ handle: string; display_name: string }>(
      `select p.handle, p.display_name from profiles p join users u on u.id = p.user_id where u.suspended_at is null and p.user_id <> $1 order by p.created_at desc limit 4`,
      [viewer.id],
    ),
  ]);
  const featuredAgents = AGENTS.filter((a) => a.featured).slice(0, 8);
  const featuredOps = OPPORTUNITY_TEMPLATES.filter((o) => o.featured);
  const usageOf = (id: string) => usage.find((u) => u.agent_id === id);
  const joinedOf = (id: string) => joined.find((j) => j.template_id === id)?.missions ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[20px] border border-line" aria-labelledby="hero-h">
          <HeroArt className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-midnight/80 via-midnight/30 to-transparent" aria-hidden="true" />
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_220px]">
            <div className="flex flex-col justify-center">
              {welcome && <p className="eyebrow text-mint">Welcome to Hustera</p>}
              <h1 id="hero-h" className="mt-1 max-w-md text-3xl font-bold leading-tight sm:text-4xl">Turn ideas into income with AI — together.</h1>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/opportunities" className="btn-primary px-5">Explore Opportunities</Link>
                <Link href="/communities" className="btn border border-white/25 bg-midnight/40 text-cloud backdrop-blur hover:bg-midnight/60">Join Community</Link>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-midnight/60 p-4 backdrop-blur lg:grid-cols-1" aria-label="Hustera right now">
              <div className="flex items-center gap-3">
                <Users className="text-[#9aa8ff]" size={22} aria-hidden="true" />
                <div><dd className="text-xl font-bold">{compactNumber(stats.members)}</dd><dt className="text-xs text-muted">Members</dt></div>
              </div>
              <div className="flex items-center gap-3">
                <Bot className="text-[#9aa8ff]" size={22} aria-hidden="true" />
                <div><dd className="text-xl font-bold">{compactNumber(stats.missions)}</dd><dt className="text-xs text-muted">Agent missions run</dt></div>
              </div>
              <div className="flex items-center gap-3">
                <CircleDollarSign className="text-mint" size={22} aria-hidden="true" />
                <div><dd className="text-xl font-bold">{formatCents(stats.earnings_real)}</dd><dt className="text-xs text-muted">Verified community sales</dt></div>
              </div>
            </dl>
          </div>
        </section>

        {/* Popular AI agents */}
        <section aria-labelledby="agents-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="agents-h" className="text-lg font-bold">Popular AI Agents</h2>
            <Link href="/agents" className="flex items-center gap-1 text-sm text-[#b8b0ff] hover:underline">View all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {featuredAgents.map((a) => {
              const u = usageOf(a.id);
              return (
                <li key={a.id} className="card glow-border lift relative flex flex-col p-4">
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${BADGE_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                  <div className="flex items-center gap-3 pr-2">
                    <AgentIcon icon={a.icon} accent={a.accent} size={38} />
                    <div className="min-w-0 flex-1 pt-4">
                      <h3 className="break-words font-semibold leading-tight">{a.name}</h3>
                      <p className="text-xs leading-tight text-muted">{a.role}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted">{a.tagline}</p>
                  <div className="mt-3"><WorkflowMini steps={a.steps} accent={a.accent} max={6} /></div>
                  <p className="mt-3 text-xs text-muted">{u ? `${u.missions} ${u.missions === 1 ? "mission" : "missions"} · ${u.live_products} live` : "No missions yet"}</p>
                  <Link href={`/agents/${a.id}`} className="btn-primary btn-sm mt-3 w-full">Use Agent</Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Featured opportunities */}
        <section aria-labelledby="ops-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="ops-h" className="text-lg font-bold">Featured Opportunities</h2>
            <Link href="/opportunities" className="flex items-center gap-1 text-sm text-[#b8b0ff] hover:underline">View all <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {featuredOps.map((o) => {
              const count = joinedOf(o.id);
              return (
                <li key={o.id} className="card glow-border lift flex flex-col p-4">
                  <div className="flex items-start gap-3">
                    <OpportunityIcon icon={o.icon} accent={o.accent} />
                    <div>
                      <h3 className="font-semibold">{o.name}</h3>
                      <p className="text-xs text-muted">{o.subtitle}</p>
                    </div>
                  </div>
                  <span className="mt-3 w-fit rounded-md bg-mint/10 px-2 py-0.5 text-xs font-medium text-mint">{o.badge}</span>
                  <p className="mt-3 text-xs text-muted">Agents</p>
                  <p className="text-sm font-medium">{o.agents.map((id) => agentDisplayName(id)).filter(Boolean).join(" + ") || "You + the community"}</p>
                  <div className="mt-4 flex flex-1 items-end justify-between gap-2">
                    <span className="text-xs text-muted">{count ? `${compactNumber(count)} joined` : "Be the first"}</span>
                    {o.launch ? (
                      <Link href={`/agents/${o.launch.agentId}?template=${o.id}`} className="btn-primary btn-sm">Join</Link>
                    ) : (
                      <Link href="/opportunities" className="btn-secondary btn-sm">Details</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Results depend on your work, market and costs — we don&apos;t show earnings promises.</p>
        </section>

        {/* Feed */}
        <section aria-labelledby="feed-h" className="space-y-4">
          <h2 id="feed-h" className="text-lg font-bold">Your feed</h2>
          <div id="share" className="scroll-mt-24"><Composer name={viewer.displayName} handle={viewer.handle} /></div>
          {feed.length ? (
            feed.map((p) => <PostCard key={p.id} post={p} viewerId={viewer.id} />)
          ) : (
            <EmptyState title="Your feed is quiet" action={<Link href="/discover" className="btn-primary">Find people to follow</Link>}>
              Follow creators and freelancers to see their posts here, or write your first post above.
            </EmptyState>
          )}
        </section>
      </div>

      <aside className="space-y-5" aria-label="Community, Sparks and Hustera Card">
        <section className="card p-5" aria-labelledby="community-h">
          <h2 id="community-h" className="eyebrow">Vibrant community</h2>
          <div className="mt-4 flex items-center">
            {members.map((m, i) => (
              <Link key={m.handle} href={`/u/${m.handle}`} className={i ? "-ml-3" : ""} title={m.display_name}>
                <Avatar name={m.display_name} seed={m.handle} size={48} />
              </Link>
            ))}
            {stats.members - members.length - 1 > 0 && (
              <Link href="/discover?tab=people" className="-ml-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-3 text-sm font-semibold ring-2 ring-midnight">
                +{compactNumber(stats.members - members.length - 1)}
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm">Connect with creators, freelancers and AI enthusiasts from around the world.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMMUNITY_CHIPS.map(([label, href]) => (
              <Link key={label} href={href} className="rounded-full border border-line bg-slate-2 px-3 py-1.5 text-sm hover:border-indigo/50">{label}</Link>
            ))}
          </div>
        </section>

        <section className="card relative overflow-hidden p-5" aria-labelledby="sparks-h">
          <div className="absolute -left-10 top-6 h-40 w-40 rounded-full bg-mint/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <SparksCoin size={104} />
            <div>
              <h2 id="sparks-h" className="text-xl font-extrabold tracking-wide text-mint">SPARKS</h2>
              <p className="mt-1 text-sm text-muted">Our native reward points for contributions and community recognition.</p>
            </div>
          </div>
          <ul className="relative mt-4 space-y-1.5 text-sm">
            {["Earn from contributions", "Unlock profile perks and badges", "Community recognition", "No cash value — never bought or sold"].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check size={15} className="text-mint" aria-hidden="true" />{t}</li>
            ))}
          </ul>
          <Link href="/rewards" className="relative mt-4 flex items-center justify-between rounded-xl bg-midnight/50 px-4 py-3 text-sm hover:bg-midnight/70">
            <span>Your Sparks: <strong className="text-mint">{sparks.balance}</strong> · {sparks.tier.name}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <section className="card overflow-hidden p-5" aria-labelledby="card-h">
          <h2 id="card-h" className="eyebrow">Hustera Card <span className="normal-case tracking-normal">(concept)</span></h2>
          <HusteraCardVisual className="mx-auto mt-6 max-w-[280px]" />
          <div className="mt-6 flex items-center justify-between text-xs text-muted">
            <span>Not a payment card yet</span>
            <Link href="/card" className="font-semibold uppercase tracking-wider text-cloud hover:underline">Concept</Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
