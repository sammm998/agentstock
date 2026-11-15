import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { AGENTS, AGENT_CATEGORIES, AGENT_DETAILS, budgetBreakdown, formatCents, getAgent } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { agentActivity, platformStats } from "@/server/agents";
import { LogoMark } from "@/components/brand";
import { CountUp, Reveal } from "@/components/motion";
import { AgentIcon, HusteraCardVisual, SparksCoin } from "@/components/visuals";
import { TimeAgo } from "@/components/ui";
import { AgentPreview } from "@/components/agent-preview";
import { SpaceBackground } from "@/components/space-background";
import { PlanetCanvas, Scene, SceneRail, WarpStars } from "@/components/cinema";

const NAV: [string, string][] = [
  ["Story", "#launch"],
  ["Agents", "#agents"],
  ["Workflows", "#reel"],
  ["Card", "#card"],
  ["FAQ", "#faq"],
];

const FAQ: [string, string][] = [
  ["What is Hustera?", "An all-in-one platform that combines a community, AI agents and a store with checkout, so you can build your own income — with others, not alone."],
  ["What does an AI agent actually do?", "It runs a whole workflow for you: research, offer, listing, publishing to your store, a Stripe payment link and an announcement to your followers. Anything public waits for your approval, and every step stays within the budget you set."],
  ["How do I get paid?", "Buyers pay through Stripe Checkout or a Stripe Payment Link. The money goes to the Stripe account behind the store, and every sale, refund and fee is recorded in your wallet."],
  ["Do agents guarantee income?", "No. Agents do the work fast and honestly — results depend on your product, price and audience. We never show made-up earnings."],
  ["What are SPARKS?", "Reward points you earn for contributing to the community. They unlock badges and profile perks. They have no cash value and can't be bought or sold."],
  ["Is the Hustera Card available?", "Not yet — it's a concept. A real card needs a licensed issuing partner. Members will hear first when it's ready."],
];

/** Scroll-driven helpers: opacity/visibility from the scene progress --p. */
const fin = (a: number, b: number) => `clamp(0, calc((var(--p) - ${a}) / ${b - a}), 1)`;
const fio = (a: number, b: number, c: number, d: number) => `min(${fin(a, b)}, calc(1 - ${fin(c, d)}))`;
const rise = (a: number, b: number, c = 2, d = 2): CSSProperties => ({
  opacity: c < 1 ? fio(a, b, c, d) : fin(a, b),
  transform: `translateY(calc((1 - ${fin(a, b)}) * 60px))`,
  filter: `blur(calc((1 - ${fin(a, b)}) * 14px))`,
});

function Section({ id, eyebrow, title, children, className = "" }: { id?: string; eyebrow: string; title: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl scroll-mt-28 px-4 py-24 sm:px-6 ${className}`}>
      <Reveal>
        <p className="eyebrow text-mint">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{title}</h2>
      </Reveal>
      {children}
    </section>
  );
}

const REEL = ["dropforge", "contentflow", "linkloom", "cryptopulse", "tubeengine", "replyr"];

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getViewer()) redirect("/home");
  const { deleted } = await searchParams;
  const [stats, activity] = await Promise.all([platformStats(), agentActivity(6)]);
  const ring = AGENTS.filter((a) => !a.adminOnly);
  const word = "hustera".split("");

  return (
    <div className="desktop relative min-h-dvh overflow-x-clip">
      <SpaceBackground />
      <div className="film-grain" aria-hidden="true" />
      <SceneRail />

      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav aria-label="Main" className="glass-panel mx-auto flex max-w-6xl items-center gap-6 rounded-full px-4 py-2.5 sm:px-5">
          <Link href="/" className="flex items-center gap-2" aria-label="Hustera home">
            <LogoMark size={26} />
            <span className="text-lg font-extrabold tracking-tight">hustera</span>
          </Link>
          <ul className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            {NAV.map(([label, href]) => <li key={href}><a href={href} className="transition-colors hover:text-white">{label}</a></li>)}
          </ul>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/signin" className="hidden rounded-full px-4 py-2 text-sm text-white/70 hover:text-white sm:block">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-indigo to-mint px-4 py-2 text-sm font-semibold text-white shadow-[0_0_30px_-6px_rgb(78_242_194/0.6)] transition hover:brightness-110">Join Hustera</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {deleted && <p role="status" className="fixed inset-x-0 top-24 z-40 text-center text-sm text-mint">Your account and personal data have been deleted.</p>}

        {/* SCENE 1 — Launch: hyperspace, then fly through the logo */}
        <Scene id="launch" label="Launch" height={260} iris={false}>
          <WarpStars />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgb(2_3_9/0.85))]" aria-hidden="true" />
          <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
            <div style={{ transform: `scale(calc(1 + var(--p) * var(--p) * 16))`, opacity: `calc(1 - ${fin(0.55, 0.8)})` }}>
              <LogoMark size={150} className="drop-shadow-[0_0_60px_rgb(101_88_245/0.8)]" />
            </div>
            <h1 className="mt-6 flex text-[19vw] font-extrabold leading-none tracking-[-0.06em] text-glow sm:text-[9rem]" aria-label="hustera">
              {word.map((ch, i) => (
                <span key={i} aria-hidden="true" className="animate-hero-in inline-block" style={{ animationDelay: `${150 + i * 70}ms`, transform: `translateX(calc(var(--p) * ${(i - 3) * 90}px)) translateZ(0)`, opacity: `calc(1 - ${fin(0.2, 0.55)})` }}>{ch}</span>
              ))}
            </h1>
            <p className="animate-hero-in mt-4 text-2xl font-medium sm:text-4xl [animation-delay:700ms]" style={{ opacity: `calc(1 - ${fin(0.1, 0.4)})` }}>
              Build together. <span className="text-shimmer">Earn independently.</span>
            </p>
            <div className="animate-hero-in mt-10 flex flex-wrap justify-center gap-3 [animation-delay:900ms]" style={{ opacity: `calc(1 - ${fin(0.05, 0.25)})` }}>
              <Link href="/signup" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo to-[#7a6ff7] px-6 py-3 font-semibold text-white shadow-[0_10px_40px_-10px_rgb(101_88_245/0.9)] transition hover:brightness-110">
                Join Hustera <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a href="#world" className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/10">Watch the story</a>
            </div>
            <p className="absolute bottom-10 flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-white/50" style={{ opacity: `calc(1 - ${fin(0, 0.08)})` }}>
              Scroll to launch <ChevronDown size={16} className="animate-bounce" aria-hidden="true" />
            </p>
          </div>
        </Scene>

        {/* SCENE 2 — A new world */}
        <Scene id="world" label="World" height={280}>
          <div className="absolute inset-0 flex items-center justify-end" aria-hidden="true" style={{ transform: `translateX(calc((1 - var(--p)) * 25%)) scale(calc(0.7 + var(--p) * 0.7))` }}>
            <div className="mr-[-10%] sm:mr-[-4%]"><PlanetCanvas size={620} className="opacity-90 drop-shadow-[0_0_80px_rgb(101_88_245/0.45)]" /></div>
          </div>
          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center gap-6 px-6 sm:gap-10">
            {[
              ["People who build.", "A community of creators, freelancers and AI builders — Spaces, chat, events and help when you need it.", 0.08, 0.2],
              ["Agents that work.", "Twenty-plus AI agents run real workflows: research, products, campaigns, trading simulations — with your approval.", 0.3, 0.42],
              ["Money you can see.", "Sales land in your Stripe. Every sale, fee and refund shows in your wallet. No invented numbers. Ever.", 0.52, 0.64],
            ].map(([t, sub, a, b]) => (
              <div key={t as string} className="max-w-xl" style={rise(a as number, b as number)}>
                <h2 className="text-4xl font-extrabold tracking-tight text-glow sm:text-7xl">{t}</h2>
                <p className="mt-2 text-sm text-white/70 sm:mt-3 sm:text-lg">{sub}</p>
              </div>
            ))}
          </div>
        </Scene>

        {/* SCENE 3 — Agents in orbit */}
        <Scene id="agents" label="Agents" height={320}>
          <div className="orbit-stage absolute inset-0 flex items-center justify-center">
            <div className="orbit-ring relative size-0">
              {ring.map((a, i) => (
                <div key={a.id} className="absolute -left-12 -top-12 flex w-24 flex-col items-center gap-2" style={{ transform: `rotateY(${(360 / ring.length) * i}deg) translateZ(min(42vw, 520px))` }}>
                  <AgentIcon icon={a.icon} accent={a.accent} size={64} />
                  <span className="whitespace-nowrap text-xs font-semibold text-white/85">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none relative flex h-full flex-col items-center justify-center px-6 text-center">
            <div style={rise(0.02, 0.15)}>
              <LogoMark size={88} className="mx-auto drop-shadow-[0_0_40px_rgb(78_242_194/0.6)]" />
              <h2 className="mt-5 text-5xl font-extrabold tracking-tight text-glow sm:text-7xl"><CountUp value={ring.length} /> agents.</h2>
              <p className="mt-2 text-2xl text-white/75">One mission control.</p>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-2" style={rise(0.25, 0.4)}>
              {AGENT_CATEGORIES.map((c) => <li key={c} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm backdrop-blur">{c} · {ring.filter((a) => a.category === c).length}</li>)}
            </ul>
          </div>
        </Scene>

        {/* SCENE 4 — The workflow reel (horizontal film strip) */}
        <Scene id="reel" label="Workflows" height={500}>
          <div className="relative flex h-full flex-col justify-center">
            <div className="mx-auto mb-8 w-full max-w-6xl px-6" style={rise(0, 0.06)}>
              <p className="eyebrow text-mint">The reel</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl">Watch the agents work.</h2>
            </div>
            <div className="flex gap-8 pl-[6vw]" style={{ transform: `translateX(calc(var(--p) * -${(REEL.length - 1) * 82}vw))`, width: "max-content" }}>
              {REEL.map((id, i) => {
                const a = getAgent(id)!;
                const d = AGENT_DETAILS[id]!;
                const b = budgetBreakdown(a);
                return (
                  <article key={id} className="grid w-[82vw] max-w-[1000px] items-center gap-6 md:grid-cols-[1.1fr_0.9fr]" style={{ transform: `perspective(1400px) rotateY(calc((var(--p) * ${REEL.length - 1} - ${i}) * -18deg))` }}>
                    <AgentPreview kind={d.preview} accent={a.accent} />
                    <div>
                      <div className="flex items-center gap-3"><AgentIcon icon={a.icon} accent={a.accent} size={48} /><div><h3 className="text-2xl font-bold">{a.name}</h3><p className="text-sm text-white/60">{a.role}</p></div></div>
                      <p className="mt-4 text-lg">{a.tagline}</p>
                      <ol className="mt-4 space-y-1.5 text-sm text-white/75">{a.steps.slice(0, 5).map((s, k) => <li key={s.key} className="flex gap-2"><span className="tabular-nums text-mint">{String(k + 1).padStart(2, "0")}</span>{s.title}</li>)}</ol>
                      <p className="mt-4 flex items-center gap-2 text-xs text-white/60"><ShieldCheck size={14} className="text-mint" aria-hidden="true" /> Max {formatCents(b.totalMaxCents)} per run · you set the limits</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </Scene>

        {/* SCENE 5 — Real numbers */}
        <Scene id="numbers" label="Live" height={220}>
          <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-center px-6">
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-6xl" style={rise(0.05, 0.2)}>Every number is real.</h2>
            <p className="mt-3 max-w-xl text-lg text-white/70" style={rise(0.1, 0.25)}>Counted from the platform right now — no mock-ups, no made-up earnings.</p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[["Members", stats.members, "number"], ["Agent missions run", stats.missions, "number"], ["Verified sales via Stripe", stats.earnings_real, "euro"]].map(([l, v, f], i) => (
                <div key={l as string} className="card p-7" style={rise(0.2 + i * 0.08, 0.35 + i * 0.08)}>
                  <p className="text-5xl font-extrabold tracking-tight"><CountUp value={v as number} format={f as "number" | "euro"} /></p>
                  <p className="mt-1 text-sm text-white/60">{l}</p>
                </div>
              ))}
            </div>
            {activity.length > 0 && (
              <ul className="mt-8 grid gap-2 sm:grid-cols-2" style={rise(0.5, 0.65)}>
                {activity.map((e) => <li key={e.id} className="flex items-center gap-2 text-sm text-white/70"><span className="size-1.5 rounded-full bg-mint" /> <span className="font-semibold text-white">{e.agent}</span> {e.action} · <TimeAgo date={e.at} /></li>)}
              </ul>
            )}
          </div>
        </Scene>

        {/* SCENE 6 — Card & Sparks */}
        <Scene id="card" label="Card" height={260}>
          <div className="relative mx-auto grid h-full max-w-6xl items-center gap-10 px-6 md:grid-cols-2">
            <div className="flex justify-center [perspective:1400px]">
              <div style={{ transform: `rotateY(calc(var(--p) * 360deg - 30deg)) rotateX(12deg) scale(calc(0.8 + ${fin(0, 0.3)} * 0.25))`, transformStyle: "preserve-3d" }}>
                <HusteraCardVisual className="w-[min(420px,80vw)]" />
              </div>
            </div>
            <div>
              <div style={rise(0.1, 0.25)}>
                <p className="eyebrow text-mint">Hustera Card · concept</p>
                <h2 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-6xl">Spend your success anywhere.</h2>
                <p className="mt-3 text-white/70">A card for your Hustera earnings is on the roadmap. It needs a licensed issuing partner first — members hear first.</p>
              </div>
              <div className="mt-8 flex items-center gap-5" style={rise(0.4, 0.55)}>
                <SparksCoin size={84} />
                <div><p className="text-xl font-bold text-mint">SPARKS</p><p className="text-sm text-white/70">Reward points for contributing. No cash value — never bought or sold.</p></div>
              </div>
            </div>
          </div>
        </Scene>

        {/* SCENE 7 — Liftoff */}
        <Scene id="liftoff" label="Liftoff" height={240}>
          <WarpStars />
          <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
            {["3", "2", "1"].map((n, i) => (
              <span key={n} aria-hidden="true" className="absolute text-[30vw] font-extrabold leading-none text-white/90 text-glow sm:text-[16rem]" style={{ opacity: fio(0.05 + i * 0.13, 0.1 + i * 0.13, 0.14 + i * 0.13, 0.18 + i * 0.13), transform: `scale(calc(0.6 + ${fin(0.05 + i * 0.13, 0.18 + i * 0.13)} * 1.4))` }}>{n}</span>
            ))}
            <div style={rise(0.48, 0.6)}>
              <h2 className="text-5xl font-extrabold tracking-tight text-glow sm:text-8xl">Liftoff.</h2>
              <p className="mx-auto mt-4 max-w-lg text-lg text-white/75">Free to join. Bring an idea or a product — the agents handle the rest, with you in control.</p>
              <Link href="/signup" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo to-mint px-8 py-4 text-lg font-semibold text-white shadow-[0_10px_60px_-10px_rgb(78_242_194/0.9)] transition hover:brightness-110">
                Join Hustera <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Scene>

        {/* FAQ */}
        <Section id="faq" eyebrow="FAQ" title="Questions, answered">
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 60}>
                <details className="glass group p-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                    {q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </Section>

      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <span className="flex items-center gap-2"><LogoMark size={22} /> <span className="font-bold text-cloud">hustera</span> · Build together. Earn independently.</span>
          <nav className="flex flex-wrap gap-4" aria-label="Footer">
            <Link href="/discover" className="hover:text-cloud">Explore</Link>
            <Link href="/learn" className="hover:text-cloud">Learn</Link>
            <Link href="/legal/guidelines" className="hover:text-cloud">Guidelines</Link>
            <Link href="/legal/sparks" className="hover:text-cloud">SPARKS terms</Link>
          </nav>
          <p className="w-full text-xs">© {new Date().getFullYear()} Hustera. The Hustera Card is a concept and not yet available.</p>
        </div>
      </footer>
    </div>
  );
}
