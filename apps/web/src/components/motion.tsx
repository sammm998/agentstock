"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
  }, []);
  return reduced;
}

/** Fades and lifts children in when they scroll into view. Visible without JS. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setArmed(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const cls = armed ? `reveal ${visible ? "is-visible" : ""}` : "";
  const style: CSSProperties = { transitionDelay: `${delay}ms` };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp = Tag as any;
  return (
    <Comp ref={ref} className={`${cls} ${className}`} style={style}>
      {children}
    </Comp>
  );
}

/** Counts up to a value once visible. */
export function CountUp({ value, format = "number", duration = 1400 }: { value: number; format?: "number" | "euro"; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    setN(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration, reduced]);
  const text = format === "euro" ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n / 100) : new Intl.NumberFormat("en").format(n);
  return <span ref={ref}>{text}</span>;
}

/** Tilts toward the pointer. */
export function TiltCard({ children, className = "", max = 10 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out [transform-style:preserve-3d] ${className}`}
      onPointerMove={(e) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "";
      }}
    >
      {children}
    </div>
  );
}

/** A 3D-tilted panel that flattens as it scrolls into the middle of the screen. */
export function ScrollTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, 1 - (r.top - vh * 0.15) / (vh * 0.75)));
      el.style.transform = `perspective(1400px) rotateX(${(1 - p) * 28}deg) scale(${0.88 + p * 0.12})`;
      el.style.opacity = String(0.45 + p * 0.55);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);
  return (
    <div ref={ref} className={`origin-top will-change-transform ${className}`}>
      {children}
    </div>
  );
}

/** Sticky steps that light up one by one as the section scrolls past. */
export function ScrollSteps({ steps }: { steps: { title: string; text: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
      setProgress(p);
      setActive(Math.min(steps.length - 1, Math.floor(p * steps.length)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [steps.length]);
  return (
    <div ref={ref} className="relative lg:[height:var(--steps-h)]" style={{ "--steps-h": `${steps.length * 70 + 40}vh` } as CSSProperties}>
      <div className="grid items-center gap-10 py-10 lg:sticky lg:top-24 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-mint">How it works</p>
          <h2 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">From idea to income in four steps</h2>
          <p className="mt-4 text-muted">Keep scrolling — each step lights up in turn.</p>
          <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo to-mint transition-[width] duration-150" style={{ width: `${Math.max(8, progress * 100)}%` }} />
          </div>
        </div>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className={`glass flex gap-5 p-6 transition-all duration-500 ${i === active ? "glow-border scale-[1.02] opacity-100 shadow-[0_0_60px_-15px_rgb(78_242_194/0.45)]" : i < active ? "opacity-70" : "opacity-35"}`}
            >
              <span className={`text-3xl font-extrabold ${i <= active ? "text-shimmer" : "text-muted"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block text-lg font-semibold">{s.title}</span>
                <span className="mt-1 block text-sm text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
