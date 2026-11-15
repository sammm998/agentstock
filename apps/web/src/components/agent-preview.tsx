import type { ReactNode } from "react";
import { Check, Heart, MessageCircle, Play, Repeat2, Send, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
import type { PreviewKind } from "@hustera/domain";

/** A macOS-style window. */
export function MacWindow({ title, children, className = "", accent = "#6558f5" }: { title: string; children: ReactNode; className?: string; accent?: string }) {
  return (
    <div className={`mac-window ${className}`} style={{ ["--accent" as string]: accent }}>
      <div className="mac-titlebar">
        <span className="flex gap-1.5" aria-hidden="true"><i className="bg-[#ff5f57]" /><i className="bg-[#febc2e]" /><i className="bg-[#28c840]" /></span>
        <span className="truncate text-[11px] font-medium text-white/60">{title}</span>
        <span className="w-10" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

const Bar = ({ w, c = "bg-white/15" }: { w: string; c?: string }) => <span className={`block h-2 rounded-full ${c}`} style={{ width: w }} />;

function Store({ a }: { a: string }) {
  return (
    <div className="grid grid-cols-[1.1fr_1fr] gap-3 p-4">
      <div className="aspect-square rounded-xl" style={{ background: `radial-gradient(circle at 30% 25%, ${a}aa, transparent 60%), linear-gradient(135deg, #1b1f3a, #0b0f1f)` }}>
        <div className="flex h-full items-end p-3"><span className="rounded-md bg-black/40 px-2 py-1 text-[10px] text-white/80 backdrop-blur">Digital · instant delivery</span></div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Budget meal planner</p>
        <Bar w="90%" /><Bar w="70%" /><Bar w="80%" />
        <p className="mt-1 text-lg font-bold">€7.90</p>
        <span className="rounded-lg py-1.5 text-center text-xs font-semibold text-white" style={{ background: a }}>Buy now</span>
        <span className="flex items-center gap-1 text-[10px] text-white/60"><ShieldCheck size={11} /> Secure Stripe checkout</span>
      </div>
    </div>
  );
}

function Scout({ a }: { a: string }) {
  const rows = [["Resistance bands set", 82, "€11.29"], ["Posture corrector", 71, "€9.40"], ["LED desk lamp", 58, "€14.10"], ["Yoga mat", 21, "−€0.30"]] as const;
  return (
    <div className="p-4">
      <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] uppercase tracking-wider text-white/50"><span>Product</span><span>Margin</span><span>Score</span></div>
      {rows.map(([n, s, m], i) => (
        <div key={n} className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-xs ${i === 0 ? "bg-white/10" : ""}`}>
          <span className="truncate">{i === 0 ? "🏆 " : ""}{n}</span>
          <span className={m.startsWith("−") ? "text-danger" : "text-mint"}>{m}</span>
          <span className="flex w-20 items-center gap-1.5"><span className="h-1.5 flex-1 rounded-full bg-white/10"><span className="block h-1.5 rounded-full" style={{ width: `${s}%`, background: a }} /></span>{s}</span>
        </div>
      ))}
    </div>
  );
}

function Campaign({ a }: { a: string }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={d} className={`rounded-lg border p-1.5 text-center text-[10px] ${i === 0 ? "border-transparent text-white" : "border-white/10 text-white/60"}`} style={i === 0 ? { background: a } : undefined}>
            <p className="font-semibold">{d}</p>
            <p className="mt-1">{i === 0 ? "Posted" : "09:00"}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2"><span className="size-6 rounded-full" style={{ background: a }} /><span className="text-xs font-semibold">your_store</span><span className="text-[10px] text-white/50">now</span></div>
        <p className="mt-2 text-xs text-white/85">Meet the bands that fit in a drawer. 15-minute home workouts… #homefitness</p>
        <div className="mt-2 flex gap-4 text-white/50"><Heart size={12} /><MessageCircle size={12} /><Repeat2 size={12} /></div>
      </div>
    </div>
  );
}

function Video({ a }: { a: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {["Beginner guide", "7 mistakes", "30-day test"].map((t, i) => (
        <div key={t}>
          <div className="relative aspect-video rounded-lg" style={{ background: `linear-gradient(${120 + i * 40}deg, ${a}, #1a1033)` }}>
            <span className="absolute left-1.5 top-1.5 text-[9px] font-extrabold uppercase leading-tight text-white drop-shadow">{t}</span>
            <Play size={14} className="absolute bottom-1.5 right-1.5 text-white" fill="white" />
          </div>
          <Bar w="85%" c="mt-1.5 bg-white/20" /><Bar w="55%" c="mt-1 bg-white/10" />
        </div>
      ))}
      <div className="col-span-3 mt-1 rounded-lg border border-white/10 bg-white/5 p-2 font-mono text-[10px] leading-relaxed text-white/70">HOOK 0:00 — Show the result first…<br />SECTION 1 — The basics in plain words…</div>
    </div>
  );
}

function Affiliate({ a }: { a: string }) {
  const bars = [3, 5, 4, 8, 6, 9, 12];
  return (
    <div className="p-4">
      <div className="space-y-1.5 text-xs">
        {["Standing desk", "Ergonomic chair", "Budget webcam"].map((n, i) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5"><span>{n}</span><span className="font-mono text-[10px] text-white/50">/go/{n.split(" ")[0]!.toLowerCase()}-{["k2x", "p9q", "t4m"][i]}</span></div>
        ))}
      </div>
      <div className="mt-3 flex h-16 items-end gap-1.5">{bars.map((b, i) => <span key={i} className="flex-1 rounded-t" style={{ height: `${b * 8}%`, background: `linear-gradient(to top, ${a}55, ${a})` }} />)}</div>
      <p className="mt-1 text-[10px] text-white/50">Clicks per day · disclosure shown on every link</p>
    </div>
  );
}

function Trading({ a, fund = false }: { a: string; fund?: boolean }) {
  const pts = [40, 44, 42, 48, 46, 52, 50, 57, 55, 61, 58, 64, 69, 66, 72];
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 300},${100 - y}`).join(" ");
  return (
    <div className="p-4">
      <div className="flex items-center justify-between text-xs"><span className="font-semibold">{fund ? "Hustera Fund · public" : "BTC · paper portfolio"}</span><span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">Simulated</span></div>
      <svg viewBox="0 0 300 80" className="mt-2 h-24 w-full" aria-hidden="true">
        <defs><linearGradient id={`g-${fund}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} stopOpacity="0.45" /><stop offset="1" stopColor={a} stopOpacity="0" /></linearGradient></defs>
        <path d={`${d} L300,80 L0,80Z`} fill={`url(#g-${fund})`} />
        <path d={d} fill="none" stroke={a} strokeWidth="2" />
        <circle cx={(5 / 14) * 300} cy={100 - 52} r="4" fill="#4ef2c2" /><circle cx={(11 / 14) * 300} cy={100 - 64} r="4" fill="#4ef2c2" />
      </svg>
      <div className="mt-1 grid grid-cols-3 gap-2 text-[10px]">
        <span className="rounded-md bg-white/5 px-2 py-1">SMA 7 › 21</span><span className="rounded-md bg-white/5 px-2 py-1">RSI 62</span><span className="rounded-md bg-mint/15 px-2 py-1 text-mint">Signal: BUY</span>
      </div>
    </div>
  );
}

function Chat({ a }: { a: string }) {
  return (
    <div className="space-y-2 p-4 text-xs">
      <p className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 text-white" style={{ background: a }}>Do you ship to Norway?</p>
      <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2">Yes! Delivery to Norway takes 3–5 days. Want me to check stock?</p>
      <p className="ml-auto w-fit max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 text-white" style={{ background: a }}>Hablas español?</p>
      <p className="w-fit max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2">¡Claro! ¿En qué puedo ayudarte?</p>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-white/40">Type a message… <Send size={12} className="ml-auto" /></div>
    </div>
  );
}

function Generic({ a, kind }: { a: string; kind: PreviewKind }) {
  const map: Partial<Record<PreviewKind, ReactNode>> = {
    pod: (
      <div className="grid grid-cols-3 gap-2 p-4">
        {["MADE FOR LIFTING", "JUST ONE MORE", "CERTIFIED"].map((t, i) => (
          <div key={t} className="flex aspect-[3/4] flex-col items-center justify-center rounded-xl bg-white/5 p-2 text-center">
            <span className="mb-2 size-10 rounded-full" style={{ background: `conic-gradient(from ${i * 60}deg, ${a}, #4ef2c2, ${a})` }} />
            <span className="text-[9px] font-extrabold tracking-wider">{t}</span>
          </div>
        ))}
        <p className="col-span-3 flex items-center gap-1 text-[10px] text-white/50"><ShieldCheck size={11} /> Rights review required before listing</p>
      </div>
    ),
    product: (
      <div className="grid grid-cols-[100px_1fr] gap-3 p-4">
        <div className="aspect-[3/4] rounded-lg p-2 text-[9px] font-bold leading-tight text-white" style={{ background: `linear-gradient(160deg, ${a}, #120b2e)` }}>STUDY<br />PLANNER<br />GUIDE</div>
        <div className="space-y-1.5"><p className="text-xs font-semibold"># Study planner guide</p><Bar w="95%" /><Bar w="88%" /><Bar w="92%" /><Bar w="60%" /><p className="pt-1 text-xs font-semibold">## Week 1</p><Bar w="85%" /><Bar w="70%" /></div>
      </div>
    ),
    prices: (
      <div className="space-y-2 p-4 text-xs">
        {[["Habit tracker", "€5.00", "€6.20", "in line"], ["Meal planner", "€7.90", "€4.10", "above"], ["Notion CRM", "€12.00", "€19.00", "below"]].map(([n, y, m, p]) => (
          <div key={n} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg bg-white/5 px-2.5 py-1.5"><span>{n}</span><span>{y}</span><span className="text-white/50">{m}</span><span className={p === "in line" ? "text-mint" : "text-warning"}>{p}</span></div>
        ))}
      </div>
    ),
    page: (
      <div className="p-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-white/50">your store</p>
        <p className="mt-1 text-base font-bold">Track ten habits a day</p>
        <div className="mx-auto mt-2 w-3/4 space-y-1"><Bar w="100%" /><Bar w="80%" c="mx-auto bg-white/10" /></div>
        <span className="mt-3 inline-block rounded-lg px-4 py-1.5 text-xs font-semibold text-white" style={{ background: a }}>Get it — €5.00</span>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">{["Instant access", "Undated pages", "Print at home"].map((x) => <span key={x} className="flex items-center justify-center gap-1 rounded-md bg-white/5 py-1"><Check size={10} className="text-mint" />{x}</span>)}</div>
      </div>
    ),
    seo: (
      <div className="space-y-1.5 p-4 text-xs">
        {[["best standing desk", 90, "Buy"], ["standing desk review", 70, "Compare"], ["how to choose a desk", 55, "Learn"], ["desk height guide", 35, "Learn"]].map(([k, v, i]) => (
          <div key={k as string} className="grid grid-cols-[1fr_80px_52px] items-center gap-2"><span className="truncate">{k}</span><span className="h-1.5 rounded-full bg-white/10"><span className="block h-1.5 rounded-full" style={{ width: `${v}%`, background: a }} /></span><span className="text-[10px] text-white/60">{i}</span></div>
        ))}
      </div>
    ),
    mail: (
      <div className="space-y-2 p-4 text-xs">
        {[["Day 0", "Welcome — here's what to expect"], ["Day 2", "The problem it solves"], ["Day 4", "What's inside"], ["Day 6", "Questions people ask"], ["Day 8", "Ready when you are"]].map(([d, s], i) => (
          <div key={d} className="flex items-center gap-3"><span className="w-10 text-[10px] text-white/50">{d}</span><span className="size-2 rounded-full" style={{ background: i === 0 ? a : "rgb(255 255 255 / .25)" }} /><span className="flex-1 truncate rounded-lg bg-white/5 px-2.5 py-1.5">{s}</span></div>
        ))}
      </div>
    ),
    ads: (
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2"><div className="aspect-square rounded-lg" style={{ background: `radial-gradient(circle at 40% 30%, ${a}, #0d0f22 70%)` }} /><p className="mt-1.5 text-[10px] font-semibold">Stop wasting time on…</p><p className="text-[9px] text-white/50">Sponsored · Meta</p></div>
        <div className="space-y-1.5 text-[10px]"><p className="font-semibold text-white/60">Angles</p>{["Pain", "Desire", "Proof", "Offer", "Objection"].map((x) => <span key={x} className="block rounded-md bg-white/5 px-2 py-1">{x}</span>)}</div>
      </div>
    ),
    ledger: (
      <div className="p-4">
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">{[["Sales", "–"], ["Refunds", "–"], ["Profit", "–"]].map(([l]) => <div key={l} className="rounded-lg bg-white/5 py-2"><p className="text-white/50">{l}</p><Bar w="60%" c="mx-auto mt-1.5 bg-white/20" /></div>)}</div>
        <div className="mt-3 flex h-14 items-end gap-1">{[4, 6, 5, 7, 9, 8, 11, 10, 12].map((b, i) => <span key={i} className="flex-1 rounded-t" style={{ height: `${b * 8}%`, background: `${a}${i === 8 ? "" : "88"}` }} />)}</div>
        <p className="mt-1 text-[10px] text-white/50">Your verified ledger · Stripe balance when connected</p>
      </div>
    ),
    gigs: (
      <div className="p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-semibold">I will design a logo and brand kit for your shop</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">{["5 days", "1 revision", "Source files"].map((x) => <span key={x} className="rounded-md bg-white/10 px-1.5 py-0.5">{x}</span>)}</div>
          <div className="mt-3 flex items-center justify-between"><span className="text-sm font-bold">€49</span><span className="rounded-lg px-3 py-1 text-[10px] font-semibold text-white" style={{ background: a }}>Request</span></div>
        </div>
        <p className="mt-2 text-[10px] text-white/50">Demand scan → offer → published after your OK</p>
      </div>
    ),
    data: (
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-white/10 text-[9px]">{Array.from({ length: 15 }, (_, i) => <span key={i} className="bg-[#0b0f1f] px-1 py-1 text-white/60">{i < 3 ? ["Month", "Sales", "Cost"][i] : (i * 37) % 90}</span>)}</div>
        <div><p className="text-[10px] text-white/60">“Which month was best?”</p><div className="mt-2 flex h-14 items-end gap-1">{[5, 8, 6, 11].map((b, i) => <span key={i} className="flex-1 rounded-t" style={{ height: `${b * 8}%`, background: a }} />)}</div></div>
      </div>
    ),
    inbox: (
      <div className="grid grid-cols-2 gap-3 p-4 text-[10px]">
        <div className="space-y-1.5">{["Lead from website", "Invoice question", "Partnership idea"].map((s, i) => <div key={s} className="rounded-lg bg-white/5 px-2 py-1.5"><p className="font-semibold">{s}</p><p className="text-white/50">{i === 0 ? "Draft reply ready ✓" : "Summarised"}</p></div>)}</div>
        <div className="space-y-1">{["09:00 Deep work", "11:00 Client call", "14:00 Ship update", "16:00 Inbox zero"].map((s, i) => <div key={s} className="rounded-md px-2 py-1" style={{ background: i % 2 ? "rgb(255 255 255 / .06)" : `${a}33` }}>{s}</div>)}</div>
      </div>
    ),
    lingo: (
      <div className="grid grid-cols-[1fr_110px] gap-3 p-4 text-xs">
        <div className="space-y-2"><p className="w-fit rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2">¿Qué vas a hacer este fin de semana?</p><p className="ml-auto w-fit rounded-2xl rounded-br-sm px-3 py-2 text-white" style={{ background: a, color: "#06231b" }}>Voy a la playa 🌊</p><p className="text-[10px] text-mint">Pronunciation 92% · great!</p></div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-center"><p className="text-base font-bold">la playa</p><p className="text-[10px] text-white/50">la · pla · ya</p><p className="mt-1 text-[10px]">the beach</p></div>
      </div>
    ),
    studio: (
      <div className="grid grid-cols-3 gap-2 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative aspect-[4/5] overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 50% ${40 + i * 5}%, #ffffff22, transparent 50%), linear-gradient(${180 + i * 30}deg, ${a}66, #0a0b18)` }}>
            <span className="absolute inset-x-4 bottom-5 top-1/3 rounded-lg bg-white/80 shadow-2xl" style={{ transform: `rotate(${(i - 1) * 6}deg)` }} />
            {i === 1 && <Play size={14} className="absolute right-1.5 top-1.5 text-white" fill="white" />}
          </div>
        ))}
      </div>
    ),
    brief: (
      <div className="p-4 text-xs">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest" style={{ color: a }}><Sparkles size={11} /> Your weekly brief</p>
        {["New EU rules for online sellers", "Three AI tools your competitors adopted", "Hiring trends in your role"].map((t, i) => (
          <div key={t} className="mt-2 flex gap-2 rounded-lg bg-white/5 p-2"><span className="font-bold text-white/40">0{i + 1}</span><div className="flex-1"><p className="font-semibold">{t}</p><Bar w="80%" c="mt-1 bg-white/10" /></div></div>
        ))}
      </div>
    ),
  };
  return <>{map[kind] ?? null}</>;
}

const TITLES: Record<PreviewKind, string> = {
  store: "Store · product page", scout: "DropForge · product scorecard", pod: "PrintPilot · design concepts", product: "DigiCraft · generated product", prices: "PriceScout · price report",
  page: "PageSmith · landing page", campaign: "ContentFlow · 7-day campaign", video: "TubeEngine · video pipeline", affiliate: "LinkLoom · tracked links", seo: "RankRiver · keyword map",
  mail: "MailMint · email sequence", ads: "AdCraft · ad variants", trading: "Markets · paper portfolio", fund: "Hustera Fund", ledger: "RevenueDesk · report", gigs: "GigMatch · service offer",
  chat: "Replyr · customer chat", data: "InsightLens · data answers", inbox: "Daybreak · inbox & calendar", lingo: "LingoCoach · practice", studio: "StudioShot · product visuals", brief: "ScoutBrief · weekly brief",
};

/** Illustrated example of what an agent produces (sample content, not real results). */
export function AgentPreview({ kind, accent, className = "", compact = false }: { kind: PreviewKind; accent: string; className?: string; compact?: boolean }) {
  const body =
    kind === "store" ? <Store a={accent} /> : kind === "scout" ? <Scout a={accent} /> : kind === "campaign" ? <Campaign a={accent} /> : kind === "video" ? <Video a={accent} /> :
    kind === "affiliate" ? <Affiliate a={accent} /> : kind === "trading" || kind === "fund" ? <Trading a={accent} fund={kind === "fund"} /> : kind === "chat" ? <Chat a={accent} /> : <Generic a={accent} kind={kind} />;
  return (
    <MacWindow title={compact ? TITLES[kind].split(" · ")[1] ?? TITLES[kind] : `${TITLES[kind]} — example`} accent={accent} className={className}>
      {body}
      {!compact && <p className="flex items-center gap-1 border-t border-white/5 px-4 py-2 text-[10px] text-white/40"><Star size={10} /> Example output with sample content — your results depend on your inputs. <TrendingUp size={10} className="ml-auto" /></p>}
    </MacWindow>
  );
}
