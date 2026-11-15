import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, Check, CreditCard, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { AGENTS, STATUS_LABEL } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { agentActivity, platformStats } from "@/server/agents";
import { LogoMark } from "@/components/brand";
import { CountUp, Reveal, ScrollSteps, ScrollTilt, TiltCard } from "@/components/motion";
import { AgentIcon } from "@/components/visuals";
import { TimeAgo } from "@/components/ui";
import { WorkflowMini } from "@/components/workflow-diagram";

const NAV: [string, string][] = [
  ["Platform", "#platform"],
  ["Agents", "#agents"],
  ["How it works", "#how"],
  ["Hustera Card", "#card"],
  ["FAQ", "#faq"],
];

const TICKER = [
  "EcomPro · live",
  "Stripe payment links · live",
  "ContentFlow · live",
  "RevenueDesk · live",
  "Spaces & channels · live",
  "SPARKS rewards · live",
  "Marketplace · live",
  "DesignStudio · AI",
  "MarketWatch · info only",
  "Hustera Card · concept",
];

const STEPS = [
  { title: "Join the community", text: "Create your profile, pick your interests and meet people building the same things as you." },
  { title: "Pick your AI agent", text: "EcomPro, ContentFlow or DesignStudio handle the heavy lifting — research, listing, publishing, promotion." },
  { title: "Launch with approval", text: "Nothing goes public without your OK. Your product goes live in your store with a Stripe payment link." },
  { title: "Earn & grow", text: "Buyers pay straight into your Stripe. Every sale lands in your wallet, and contributions earn SPARKS." },
];

const FAQ: [string, string][] = [
  ["What is Hustera?", "An all-in-one platform that combines a community, AI agents and a store with checkout, so you can build your own income — with others, not alone."],
  ["What does an AI agent actually do?", "It runs a whole workflow for you: research, offer, listing, publishing to your store, a Stripe payment link and an announcement to your followers. Anything public waits for your approval, and every step stays within the budget you set."],
  ["How do I get paid?", "Buyers pay through Stripe Checkout or a Stripe Payment Link. The money goes to the Stripe account behind the store, and every sale, refund and fee is recorded in your wallet."],
  ["Do agents guarantee income?", "No. Agents do the work fast and honestly — results depend on your product, price and audience. We never show made-up earnings."],
  ["What are SPARKS?", "Reward points you earn for contributing to the community. They unlock badges and profile perks. They have no cash value and can't be bought or sold."],
  ["Is the Hustera Card available?", "Not yet — it's a concept. A real card needs a licensed issuing partner. Members will hear first when it's ready."],
];

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

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getViewer()) redirect("/home");
  const { deleted } = await searchParams;
  const [stats, activity] = await Promise.all([platformStats(), agentActivity(10)]);
  const featured = AGENTS.filter((a) => a.featured).slice(0, 6);

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-midnight">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] bg-[radial-gradient(900px_600px_at_70%_10%,rgb(101_88_245/0.22),transparent_60%),radial-gradient(700px_500px_at_20%_30%,rgb(78_242_194/0.10),transparent_60%)]" aria-hidden="true" />
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden="true" />

      {/* Floating pill navigation */}
      <header className="fixed inset-x-0 top-4 z-50 px-4">
        <nav aria-label="Main" className="glass mx-auto flex max-w-6xl items-center gap-6 rounded-full px-4 py-2.5 sm:px-5">
          <Link href="/" className="flex items-center gap-2" aria-label="Hustera home">
            <LogoMark size={26} />
            <span className="text-lg font-extrabold tracking-tight">hustera</span>
          </Link>
          <ul className="hidden items-center gap-6 text-sm text-muted md:flex">
            {NAV.map(([label, href]) => (
              <li key={href}><a href={href} className="transition-colors hover:text-cloud">{label}</a></li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/signin" className="hidden rounded-full px-4 py-2 text-sm text-muted hover:text-cloud sm:block">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-gradient-to-r from-indigo to-mint px-4 py-2 text-sm font-semibold text-white shadow-[0_0_30px_-6px_rgb(78_242_194/0.6)] transition hover:brightness-110">Join Hustera</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {deleted && <p role="status" className="mx-auto max-w-6xl px-6 pt-28 text-sm text-mint">Your account and personal data have been deleted.</p>}

        {/* Hero */}
        <section className="relative mx-auto grid min-h-[92dvh] max-w-6xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/spark-star.jpg" alt="" aria-hidden="true" className="animate-float-slow pointer-events-none absolute left-[38%] top-10 w-[560px] max-w-none opacity-80 mix-blend-screen [mask-image:radial-gradient(circle,#000_35%,transparent_68%)]" />
          <div className="relative">
            <p className="animate-hero-in inline-flex items-center gap-2 rounded-full border border-line bg-slate/60 px-3 py-1 text-xs text-muted">
              <span className="animate-pulse-ring h-2 w-2 rounded-full bg-mint" /> Live now · agents running on real workflows
            </p>
            <h1 className="animate-hero-in mt-6 flex items-center gap-4 [animation-delay:120ms]">
              <LogoMark size={96} className="shrink-0 drop-shadow-[0_0_40px_rgb(101_88_245/0.5)] sm:h-[120px] sm:w-[120px]" />
              <span className="text-7xl font-extrabold tracking-[-0.05em] sm:text-[8.5rem] sm:leading-none">hustera</span>
            </h1>
            <p className="animate-hero-in mt-4 text-2xl font-medium sm:text-4xl [animation-delay:240ms]">
              Build together. <span className="text-shimmer">Earn independently.</span>
            </p>
            <p className="animate-hero-in mt-5 max-w-xl text-lg text-muted [animation-delay:320ms]">The all-in-one community platform where people, AI agents and opportunities come together to create real income.</p>
            <div className="animate-hero-in mt-8 flex flex-wrap gap-3 [animation-delay:420ms]">
              <Link href="/signup" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo to-[#7a6ff7] px-6 py-3 font-semibold text-white shadow-[0_10px_40px_-10px_rgb(101_88_245/0.9)] transition hover:brightness-110">
                Join Hustera <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a href="#platform" className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold backdrop-blur transition hover:bg-white/10">See the platform</a>
            </div>
            <ul className="animate-hero-in mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted [animation-delay:520ms]">
              {["Built for creators, freelancers & AI builders", "Free to join", "Payments via Stripe"].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check size={15} className="text-mint" aria-hidden="true" />{t}</li>
              ))}
            </ul>
          </div>

          {/* Floating wallet card (example) */}
          <div className="relative hidden lg:block">
            <TiltCard className="animate-float">
              <div className="glass glow-border p-6">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Your Hustera wallet</p>
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-xs font-semibold text-mint">Example</span>
                </div>
                <p className="mt-3 text-5xl font-extrabold tracking-tight">€2,480<span className="text-muted">.50</span></p>
                <p className="text-xs text-muted">Example month — your wallet shows only verified sales</p>
                <svg viewBox="0 0 300 80" className="mt-4 h-20 w-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="wl" x1="0" x2="1"><stop stopColor="#6558F5" /><stop offset="1" stopColor="#4EF2C2" /></linearGradient>
                    <linearGradient id="wf" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#4EF2C2" stopOpacity="0.35" /><stop offset="1" stopColor="#4EF2C2" stopOpacity="0" /></linearGradient>
                  </defs>
                  <path d="M0 64 C30 60 40 50 70 54 S120 40 150 44 S200 24 230 28 S270 12 300 8 L300 80 L0 80 Z" fill="url(#wf)" />
                  <path className="draw-line" d="M0 64 C30 60 40 50 70 54 S120 40 150 44 S200 24 230 28 S270 12 300 8" fill="none" stroke="url(#wl)" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  {[["Store sales", "€1,320"], ["Payment links", "€940"], ["SPARKS", "1,250 ✦"]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/5 px-2 py-2.5"><p className="font-bold text-cloud">{v}</p><p className="text-muted">{k}</p></div>
                  ))}
                </div>
              </div>
            </TiltCard>
            <div className="animate-toast glass absolute -bottom-10 -left-10 flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo/30 text-[#c9c4ff]"><Bot size={18} aria-hidden="true" /></span>
              <span className="text-sm"><span className="block font-semibold">EcomPro finished a task</span><span className="text-mint">Payment link ready to share</span></span>
            </div>
            <div className="animate-float-slow glass absolute -right-4 -top-10 rounded-full px-4 py-2 text-sm"><span className="text-mint">✦</span> SPARKS for contributions</div>
          </div>
        </section>

        {/* Ticker */}
        <div className="relative border-y border-line bg-slate/40 py-4" aria-label="What's live">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-mono text-sm uppercase tracking-widest text-muted">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex items-center gap-3"><span className={t.includes("live") ? "text-mint" : "text-warning"}>●</span>{t}</span>
            ))}
          </div>
        </div>

        {/* Live numbers */}
        <Section eyebrow="Hustera right now" title={<>Real numbers. <span className="text-shimmer">No made-up stats.</span></>}>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: "Members", node: <CountUp value={stats.members} /> },
              { icon: Bot, label: "Agent missions run", node: <CountUp value={stats.missions} /> },
              { icon: TrendingUp, label: "Verified sales via Stripe", node: <CountUp value={stats.earnings_real} format="euro" /> },
            ].map(({ icon: Icon, label, node }, i) => (
              <Reveal key={label} delay={i * 120}>
                <div className="glass glow-border lift p-7">
                  <Icon className="text-mint" size={24} aria-hidden="true" />
                  <p className="mt-4 text-5xl font-extrabold tracking-tight">{node}</p>
                  <p className="mt-1 text-sm text-muted">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* Platform 3D */}
        <section id="platform" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-10 sm:px-6">
          <Reveal className="text-center">
            <p className="eyebrow text-mint">The platform</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">One platform. Endless ways to earn.</h2>
          </Reveal>
          <ScrollTilt className="mt-14">
            <div className="glass glow-border overflow-hidden p-2 shadow-[0_60px_120px_-40px_rgb(101_88_245/0.6)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/platform.png" alt="The Hustera home screen with agents, opportunities, community and SPARKS" className="w-full rounded-[18px]" />
            </div>
          </ScrollTilt>
        </section>

        {/* Agents at work */}
        <Section id="agents" eyebrow="Agents at work" title={<>Agents running <span className="text-shimmer">real workflows</span></>}>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <ul className="grid gap-4 sm:grid-cols-2">
              {featured.map((a, i) => (
                <Reveal as="li" key={a.id} delay={i * 80}>
                  <div className="glass glow-border lift flex h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      <AgentIcon icon={a.icon} accent={a.accent} size={46} />
                      <div className="min-w-0">
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-muted">{a.role}</p>
                      </div>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.status === "VERIFIED" ? "bg-mint/15 text-mint" : "bg-warning/15 text-warning"}`}>{STATUS_LABEL[a.status]}</span>
                    </div>
                    <p className="mt-4 flex-1 text-sm text-muted">{a.tagline}</p>
                    <div className="mt-4"><WorkflowMini steps={a.steps} accent={a.accent} max={6} /></div>
                  </div>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={150}>
              <div className="glass glow-border h-full p-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Live activity</p>
                  <span className="flex items-center gap-2 text-xs text-mint"><span className="animate-pulse-ring h-2 w-2 rounded-full bg-mint" />live</span>
                </div>
                {activity.length ? (
                  <ol className="mt-4 space-y-3">
                    {activity.map((e) => (
                      <li key={e.id} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm">
                        <Zap size={15} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
                        <span className="flex-1"><strong>{e.agent}</strong> {e.action}</span>
                        <span className="shrink-0 text-xs text-muted"><TimeAgo date={e.at} /></span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm text-muted">Agent activity from real missions appears here as members start them.</p>
                )}
                <p className="mt-4 text-xs text-muted">Anonymised: no names, products or amounts.</p>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* Bento */}
        <Section eyebrow="The ecosystem" title="Everything connects">
          <p className="mt-4 max-w-xl text-muted">Community, agents, income and rewards — designed to work as one.</p>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              { img: "/brand/card-community.jpg", icon: Users, title: "Vibrant community", text: "Spaces with channels, events and learning. Share ideas, get help, join projects." },
              { img: "/brand/card-agents.jpg", icon: Bot, title: "AI agents", text: "From research to a live product with a Stripe payment link — with your approval at every public step." },
              { img: "/brand/card-hustera.jpg", icon: CreditCard, title: "Hustera Card (concept)", text: "Spend your success anywhere — once a licensed partner is in place." },
            ].map(({ img, icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 120}>
                <article className="glass glow-border lift group h-full overflow-hidden">
                  <div className="overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <Icon className="text-mint" size={22} aria-hidden="true" />
                    <h3 className="mt-3 text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-sm text-muted">{text}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200} className="mt-5">
            <div className="glass glow-border lift flex flex-col items-start gap-6 overflow-hidden p-8 sm:flex-row sm:items-center">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-mint/30 blur-2xl" aria-hidden="true" />
                <div className="animate-spin-slow absolute inset-0 rounded-full border border-dashed border-mint/40" aria-hidden="true" />
                <Sparkles className="relative text-mint" size={44} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-2xl font-extrabold tracking-wide text-mint">SPARKS</h3>
                <p className="mt-2 max-w-2xl text-muted">Reward points for contributions — posts, help, launches and community. Unlock badges and profile perks. No cash value, never bought or sold.</p>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* Steps */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-4 sm:px-6">
          <ScrollSteps steps={STEPS} />
        </section>

        {/* Card */}
        <section id="card" className="mx-auto grid max-w-6xl scroll-mt-28 items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow text-mint">Hustera Card · concept</p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Spend your success <span className="text-shimmer">anywhere</span></h2>
            <p className="mt-5 text-muted">A future card that connects your Hustera earnings to everyday life. It needs a licensed issuing partner before it can exist — members hear first.</p>
            <ul className="mt-6 space-y-2.5">
              {["Spend verified earnings directly", "Hard limits for agent budgets", "Freeze, receipts and controls in your wallet", "Concept — not available yet"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-mint/15"><Check size={12} className="text-mint" aria-hidden="true" /></span>{t}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={150}>
            <TiltCard max={16}>
              <div role="img" aria-label="Concept artwork of the Hustera Card" className="relative mx-auto aspect-[1.586] max-w-md overflow-hidden rounded-[28px] border border-mint/40 p-7 shadow-[0_0_80px_-10px_rgb(78_242_194/0.45)]" style={{ background: "linear-gradient(135deg,#1e2638 0%,#0b1120 55%,#0f3036 100%)" }}>
                <div className="absolute -right-16 -top-16 h-56 w-56 rotate-12 bg-gradient-to-br from-white/10 to-transparent" aria-hidden="true" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><LogoMark size={30} /><span className="text-2xl font-extrabold italic">hustera</span></span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">Member</span>
                </div>
                <div className="mt-8 h-10 w-14 rounded-lg bg-gradient-to-br from-[#e3dccb] to-[#8f8a7c]" aria-hidden="true" />
                <p className="mt-6 font-mono text-lg tracking-[0.2em] text-cloud/80">•••• •••• •••• ••••</p>
                <p className="absolute bottom-6 left-7 text-[10px] font-semibold uppercase italic tracking-[0.2em] text-muted">Spend your success anywhere</p>
                <span className="absolute bottom-6 right-7 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">CONCEPT</span>
              </div>
            </TiltCard>
          </Reveal>
        </section>

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

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="glass glow-border relative overflow-hidden px-6 py-20 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/hero-banner.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/60 to-transparent" aria-hidden="true" />
              <div className="relative">
                <h2 className="text-5xl font-extrabold tracking-tight sm:text-7xl">Be first into <span className="text-shimmer">Hustera</span></h2>
                <p className="mx-auto mt-4 max-w-lg text-muted">Free to join. Bring an idea or a product — the agents handle the rest, with you in control.</p>
                <Link href="/signup" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo to-mint px-7 py-3.5 font-semibold text-white shadow-[0_10px_50px_-10px_rgb(78_242_194/0.8)] transition hover:brightness-110">
                  Join Hustera <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
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
