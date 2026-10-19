"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches server data periodically while the tab is visible. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

/** Keeps a scroll container pinned to the newest item. */
export function ScrollToEnd({ dep }: { dep: number }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dep]);
  return <li ref={ref} aria-hidden="true" />;
}
