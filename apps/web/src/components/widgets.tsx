import type { ReactNode } from "react";

/** A macOS-style desktop widget. */
export function Widget({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={`card overflow-hidden rounded-[26px] p-5 ${className}`}>
      {children}
    </section>
  );
}

export function CalendarWidget({ now, marked }: { now: Date; marked: number[] }) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <Widget label="Calendar">
      <p className="text-xs font-bold uppercase tracking-wider text-mint">{now.toLocaleDateString("en-GB", { month: "long" })}</p>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="font-semibold text-white/50">{d}</span>)}
        {cells.map((d, i) => (
          <span key={i} className={`relative mx-auto flex size-6 items-center justify-center rounded-full ${d === now.getDate() ? "bg-mint font-bold text-midnight" : i % 7 >= 5 ? "text-white/45" : "text-white/85"}`}>
            {d}
            {d && marked.includes(d) && d !== now.getDate() && <span className="absolute -bottom-0.5 size-1 rounded-full bg-indigo-2" />}
          </span>
        ))}
      </div>
    </Widget>
  );
}
