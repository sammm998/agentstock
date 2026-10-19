import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABEL, type FeatureStatus } from "@hustera/domain";

const RING: Record<string, string> = {
  spark: "ring-line",
  ember: "ring-indigo",
  flare: "ring-mint",
  nova: "ring-[#b8a9ff]",
};

function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

/** Initials avatar. Hustera never shows stock photos as if they were members. */
export function Avatar({ name, seed, size = 40, tier }: { name: string; seed: string; size?: number; tier?: string }) {
  const hue = hueFor(seed);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ring-2 ring-offset-2 ring-offset-midnight ${RING[tier ?? "spark"] ?? RING.spark}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 50) % 360} 70% 42%))`,
      }}
    >
      {initials || "?"}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 text-indigo">{icon}</div>}
      <h2 className="font-semibold">{title}</h2>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const STATUS_STYLE: Record<FeatureStatus, string> = {
  VERIFIED: "border-mint/30 bg-mint/10 text-mint",
  TESTED_SIMULATION: "border-warning/30 bg-warning/10 text-warning",
  NEEDS_CONNECTION: "border-indigo/40 bg-indigo/10 text-[#b8b0ff]",
  NEEDS_APPROVAL: "border-indigo/40 bg-indigo/10 text-[#b8b0ff]",
  BLOCKED: "border-danger/30 bg-danger/10 text-danger",
  NOT_BUILT: "border-line bg-slate-2 text-muted",
};

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function Illustrative({ children = "Illustrative" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">{children}</span>;
}

export function TimeAgo({ date }: { date: Date | string }) {
  const d = new Date(date);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  const label =
    s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : s < 604800 ? `${Math.floor(s / 86400)}d` : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return (
    <time dateTime={d.toISOString()} title={d.toUTCString()}>
      {label}
    </time>
  );
}

const KIND_LABEL: Record<string, string> = { personal: "Member", creator: "Creator", freelancer: "Freelancer", business: "Business" };
export function KindChip({ kind }: { kind: string }) {
  if (kind === "personal") return null;
  return <span className="chip">{KIND_LABEL[kind] ?? kind}</span>;
}

/** Renders text with #tags and @mentions linked. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/((?:^|(?<=[^\p{L}\p{N}_@]))[#@][\p{L}\p{N}_]{2,32})/u);
  return (
    <>
      {parts.map((part, i) => {
        if (/^#[\p{L}\p{N}_]{2,32}$/u.test(part))
          return (
            <Link key={i} href={`/discover?tag=${encodeURIComponent(part.slice(1).toLowerCase())}`} className="font-medium text-mint hover:underline">
              {part}
            </Link>
          );
        if (/^@[a-z0-9_]{3,24}$/i.test(part))
          return (
            <Link key={i} href={`/u/${part.slice(1).toLowerCase()}`} className="font-medium text-[#b8b0ff] hover:underline">
              {part}
            </Link>
          );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
