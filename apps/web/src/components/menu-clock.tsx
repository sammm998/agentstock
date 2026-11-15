"use client";

import { useEffect, useState } from "react";

/** Menu-bar clock, like the one on a Mac. Renders nothing until mounted to avoid hydration drift. */
export function MenuClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="w-28" />;
  return (
    <time dateTime={now.toISOString()} className="whitespace-nowrap tabular-nums">
      {now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}&nbsp;&nbsp;{now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    </time>
  );
}
