"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { paintGiant } from "./space-background";

/**
 * A pinned film scene. While the section scrolls past, its inner frame stays
 * on screen and the scroll progress (0 → 1) is exposed as the CSS variable
 * `--p`, which children use for every transform, fade and transition.
 */
export function Scene({ id, label, height = 300, children, iris = true }: { id?: string; label: string; height?: number; children: ReactNode; iris?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      el.style.setProperty("--p", p.toFixed(4));
      el.dataset.active = r.top <= 1 && r.bottom >= window.innerHeight - 1 ? "true" : "false";
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <section id={id} ref={ref} data-scene={label} aria-label={label} className="relative scroll-mt-0" style={{ height: `${height}vh`, ["--p" as string]: 0 }}>
      <div className={`scene-frame sticky top-0 h-[100dvh] overflow-hidden ${iris ? "scene-iris" : ""}`}>
        {children}
        {/* cinematic letterbox bars that open at the start and close at the end of every scene */}
        <span aria-hidden="true" className="letterbox top-0" />
        <span aria-hidden="true" className="letterbox bottom-0" />
      </div>
    </section>
  );
}

/** Hyperspace stars: speed and streak length follow the scene's scroll progress. */
export function WarpStars() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const section = canvas?.closest("section");
    if (!canvas || !ctx || !section) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0;
    const N = 700;
    const stars = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() }));
    const resize = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = Number(section.style.getPropertyValue("--p") || 0);
      const speed = reduce ? 0 : 0.05 + p * p * 2.6;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, f = Math.max(w, h) * 0.5;
      for (const s of stars) {
        const z0 = s.z;
        s.z -= speed * dt;
        if (s.z <= 0.02) { s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; s.z = 1; continue; }
        const x1 = cx + (s.x / s.z) * f * 0.5, y1 = cy + (s.y / s.z) * f * 0.5;
        const x0 = cx + (s.x / z0) * f * 0.5, y0 = cy + (s.y / z0) * f * 0.5;
        const b = Math.min(1, (1 - s.z) * 1.3);
        ctx.strokeStyle = `rgba(${200 + Math.round(55 * b)},${215 + Math.round(40 * b)},255,${b.toFixed(3)})`;
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.2);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 + (x1 - x0) * p * 6, y1 + (y1 - y0) * p * 6);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

/** A slowly rotating, lit gas giant. */
export function PlanetCanvas({ size = 520, className = "" }: { size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = size / 2;
    canvas.width = size; canvas.height = size;
    let rot = 0;
    const paint = () => { ctx.clearRect(0, 0, size, size); ctx.drawImage(paintGiant(r, rot), 0, 0); };
    paint();
    if (reduce) return;
    const t = setInterval(() => { rot += 0.02; paint(); }, 160);
    return () => clearInterval(t);
  }, [size]);
  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: size, height: size }} />;
}

/** Film-reel progress rail: which scene you're watching. */
export function SceneRail() {
  const [scenes, setScenes] = useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    setScenes(els.map((e, i) => ({ id: e.id || `scene-${i}`, label: e.dataset.scene ?? "" })));
    const onScroll = () => {
      const mid = window.innerHeight / 2;
      const i = els.findIndex((e) => { const r = e.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
      if (i >= 0) setActive(i);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!scenes.length) return null;
  return (
    <nav aria-label="Scenes" className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <ol className="space-y-3">
        {scenes.map((s, i) => (
          <li key={s.id} className="flex items-center justify-end gap-3">
            <span className={`text-[11px] uppercase tracking-[0.2em] transition-all duration-500 ${i === active ? "text-white opacity-100" : "translate-x-2 text-white/40 opacity-0"}`}>{s.label}</span>
            <a href={`#${s.id}`} aria-label={s.label} className={`block rounded-full transition-all duration-500 ${i === active ? "h-8 w-1.5 bg-gradient-to-b from-indigo to-mint" : "h-1.5 w-1.5 bg-white/40 hover:bg-white"}`} />
          </li>
        ))}
      </ol>
    </nav>
  );
}
