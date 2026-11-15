"use client";

import { useRef, type ReactNode } from "react";

/**
 * A <details> dropdown that flips upward when opening downward would put it
 * under the dock (or off-screen), and scrolls it fully into view.
 */
export function Popover({ summary, children, className = "" }: { summary: ReactNode; children: ReactNode; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  return (
    <details
      className={`group relative ${className}`}
      onToggle={(e) => {
        const el = panel.current;
        if (!el || !(e.currentTarget as HTMLDetailsElement).open) return;
        el.classList.remove("bottom-full", "mb-2");
        el.classList.add("top-full", "mt-2");
        const r = el.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 110 && r.top - r.height - 60 > 0) {
          el.classList.remove("top-full", "mt-2");
          el.classList.add("bottom-full", "mb-2");
        }
      }}
    >
      {summary}
      <div ref={panel} className="card absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] p-4">
        {children}
      </div>
    </details>
  );
}
