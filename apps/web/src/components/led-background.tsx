"use client";

import { useEffect, useRef } from "react";

/**
 * Dark animated backdrop: thin white lines drifting like slow waves, with
 * LED-like light pulses travelling along them. Static when reduced motion is on.
 */
export function LedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const N = 16;
    const lines = Array.from({ length: N }, (_, i) => ({
      base: 0.08 + (0.84 * i) / (N - 1),
      amp: 18 + Math.random() * 46,
      freq: 0.0012 + Math.random() * 0.0016,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.25,
      tilt: (Math.random() - 0.5) * 0.18,
      pulses: Array.from({ length: 1 + (i % 2) }, () => ({ p: Math.random() * 1.4, speed: 0.04 + Math.random() * 0.07, len: 0.08 + Math.random() * 0.12 })),
    }));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const yAt = (l: (typeof lines)[number], x: number, t: number) =>
      h * l.base + Math.sin(x * l.freq + l.phase + t * l.drift) * l.amp + (x - w / 2) * l.tilt;

    let last = 0;
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const step = 14;
      for (const l of lines) {
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const y = yAt(l, x, t);
          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();

        for (const pulse of l.pulses) {
          if (!reduce) pulse.p += pulse.speed * dt;
          if (pulse.p > 1 + pulse.len) pulse.p = -Math.random() * 0.6;
          const head = pulse.p * w;
          const tail = (pulse.p - pulse.len) * w;
          const segs = 18;
          for (let s = 0; s < segs; s++) {
            const x1 = tail + ((head - tail) * s) / segs;
            const x2 = tail + ((head - tail) * (s + 1)) / segs;
            if (x2 < 0 || x1 > w) continue;
            const a = (s + 1) / segs;
            ctx.beginPath();
            ctx.moveTo(x1, yAt(l, x1, t));
            ctx.lineTo(x2, yAt(l, x2, t));
            ctx.strokeStyle = `rgba(255,255,255,${(0.85 * a * a).toFixed(3)})`;
            ctx.lineWidth = 1.4;
            ctx.shadowColor = "rgba(190,210,255,0.9)";
            ctx.shadowBlur = 10 * a;
            ctx.stroke();
          }
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible" && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-2]" />;
}
