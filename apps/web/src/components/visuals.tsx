import { useId } from "react";
import { Bot, ChartLine, Globe, Landmark, MessageSquare, Palette, Play, Search, ShoppingBag, TrendingUp, type LucideIcon } from "lucide-react";
import { LogoMark } from "./brand";

/** Night-sky landscape for the home hero: planet, peaks and a lone explorer. Original SVG artwork. */
export function HeroArt({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#140f3d" />
          <stop offset="0.55" stopColor="#2a1f6b" />
          <stop offset="1" stopColor="#3b2a7a" />
        </linearGradient>
        <radialGradient id={`glow-${id}`} cx="0.62" cy="0.32" r="0.45">
          <stop offset="0" stopColor="#b9a6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#b9a6ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`planet-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8ccff" />
          <stop offset="1" stopColor="#6d5bd0" />
        </linearGradient>
        <linearGradient id={`far-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b3a96" />
          <stop offset="1" stopColor="#231a55" />
        </linearGradient>
        <linearGradient id={`near-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1747" />
          <stop offset="1" stopColor="#0b0b22" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill={`url(#sky-${id})`} />
      <rect width="800" height="300" fill={`url(#glow-${id})`} />
      {Array.from({ length: 70 }, (_, i) => {
        const x = (i * 137.5) % 800;
        const y = (i * 61.8) % 170;
        return <circle key={i} cx={x} cy={y} r={i % 7 === 0 ? 1.4 : 0.8} fill="#fff" opacity={0.3 + ((i * 13) % 7) / 10} />;
      })}
      <circle cx="500" cy="95" r="58" fill={`url(#planet-${id})`} opacity="0.9" />
      <ellipse cx="500" cy="95" rx="96" ry="14" fill="none" stroke="#e6ddff" strokeOpacity="0.45" strokeWidth="3" transform="rotate(-12 500 95)" />
      <path d="M0 230 L90 160 L160 205 L250 120 L330 190 L420 140 L520 210 L610 130 L700 185 L800 150 L800 300 L0 300 Z" fill={`url(#far-${id})`} opacity="0.85" />
      <path d="M0 260 L120 210 L210 245 L300 190 L380 240 L470 200 L560 250 L640 215 L720 245 L800 225 L800 300 L0 300 Z" fill={`url(#near-${id})`} />
      <path d="M560 212 L600 185 L640 212 Z" fill="#0b0b22" />
      <g transform="translate(598 160)" fill="#0b0b22">
        <circle cx="0" cy="0" r="4" />
        <path d="M-4 5 L4 5 L6 22 L2 22 L0 13 L-2 22 L-6 22 Z" />
      </g>
    </svg>
  );
}

/** The glowing Sparks coin. */
export function SparksCoin({ size = 120 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute inset-0 rounded-full bg-mint/40 blur-2xl" />
      <div className="absolute inset-0 rounded-full p-[3px]" style={{ background: "conic-gradient(from 200deg, #4EF2C2, #6558F5, #4EF2C2, #7CF5DA, #4EF2C2)" }}>
        <div className="flex h-full w-full items-center justify-center rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #1d3550, #0b1426 70%)" }}>
          <div className="flex items-center justify-center rounded-full border border-mint/40" style={{ width: size * 0.72, height: size * 0.72, boxShadow: "inset 0 0 24px rgb(78 242 194 / 0.35)" }}>
            <svg viewBox="0 0 64 64" width={size * 0.42} height={size * 0.42}>
              <path d="M32 6c1.7 12.4 7.6 18.3 20 20-12.4 1.7-18.3 7.6-20 20-1.7-12.4-7.6-18.3-20-20 12.4-1.7 18.3-7.6 20-20Z" transform="translate(0 6)" fill="#4EF2C2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Concept artwork of the Hustera Card. Always shown with a CONCEPT label. */
export function HusteraCardVisual({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} role="img" aria-label="Concept artwork of a dark Hustera card. Not a real payment card.">
      <div className="absolute inset-4 rounded-3xl bg-mint/30 blur-2xl" aria-hidden="true" />
      <div
        className="relative aspect-[1.586] rotate-[-8deg] overflow-hidden rounded-2xl border border-mint/50 p-5 shadow-[0_0_40px_rgb(78_242_194/0.35)]"
        style={{ background: "linear-gradient(135deg, #20283a 0%, #0c1220 55%, #0f2f36 100%)" }}
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="text-lg font-extrabold italic tracking-tight text-cloud">hustera</span>
        </div>
        <div className="mt-5 h-8 w-11 rounded-md bg-gradient-to-br from-[#e3dccb] to-[#8f8a7c]" aria-hidden="true" />
        <p className="absolute bottom-4 left-5 text-[9px] font-semibold uppercase italic tracking-[0.18em] text-muted">Spend your success anywhere</p>
        <div className="absolute bottom-3 right-4 opacity-80" aria-hidden="true">
          <LogoMark size={22} mono className="text-mint" />
        </div>
      </div>
    </div>
  );
}

const AGENT_ICONS: Record<string, LucideIcon> = {
  bag: ShoppingBag,
  play: Play,
  palette: Palette,
  globe: Globe,
  bot: Bot,
  search: Search,
  trend: TrendingUp,
  chat: MessageSquare,
  ledger: Landmark,
  chart: ChartLine,
};

export function AgentIcon({ icon, accent, size = 44 }: { icon: string; accent: string; size?: number }) {
  const Icon = AGENT_ICONS[icon] ?? Bot;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, boxShadow: `0 6px 20px -6px ${accent}` }}
      aria-hidden="true"
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
