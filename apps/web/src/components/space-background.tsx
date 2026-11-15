"use client";

import { useEffect, useRef } from "react";

/**
 * Animated deep-space backdrop: parallax stars, drifting nebulae, a ringed
 * planet with a moon, orbit lines carrying LED pulses, a crypto-style node
 * network, and the Hustera mark floating as a hologram. Original artwork.
 */
export function SpaceBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const logo = new Image();
    logo.src = "/brand/hustera-mark-clear.svg";
    let w = 0, h = 0, small = false;

    type Star = { x: number; y: number; r: number; tw: number; layer: number };
    type Node = { x: number; y: number; vx: number; vy: number };
    let stars: Star[] = [];
    let nodes: Node[] = [];
    const packets: { a: number; b: number; t: number; speed: number }[] = [];
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    const backdrop = document.createElement("canvas");

    const paintBackdrop = () => {
      backdrop.width = canvas.width;
      backdrop.height = canvas.height;
      const b = backdrop.getContext("2d")!;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = b.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#05061a");
      g.addColorStop(0.55, "#070a1e");
      g.addColorStop(1, "#03040c");
      b.fillStyle = g;
      b.fillRect(0, 0, w, h);
      const neb = (x: number, y: number, r: number, c: string) => {
        const rg = b.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, c);
        rg.addColorStop(1, "transparent");
        b.fillStyle = rg;
        b.fillRect(0, 0, w, h);
      };
      neb(w * 0.12, h * 0.08, Math.max(w, h) * 0.55, "rgba(101,88,245,0.22)");
      neb(w * 0.95, h * 0.95, Math.max(w, h) * 0.5, "rgba(34,211,166,0.12)");
      neb(w * 0.55, h * 0.45, Math.max(w, h) * 0.35, "rgba(143,124,255,0.08)");
      // far stars, static
      for (let i = 0; i < (small ? 120 : 260); i++) {
        b.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.35})`;
        b.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      small = w < 768;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: small ? 70 : 150 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2, layer: 1 + Math.floor(Math.random() * 3) }));
      nodes = Array.from({ length: small ? 14 : 26 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6 }));
      paintBackdrop();
    };

    const planet = (cx: number, cy: number, r: number, t: number) => {
      // back half of the ring
      const ring = (front: boolean) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.38);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.05, r * 0.5, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        const rg = ctx.createLinearGradient(-r * 2, 0, r * 2, 0);
        rg.addColorStop(0, "rgba(124,245,218,0.0)");
        rg.addColorStop(0.3, "rgba(124,245,218,0.55)");
        rg.addColorStop(0.7, "rgba(143,124,255,0.6)");
        rg.addColorStop(1, "rgba(143,124,255,0.0)");
        ctx.strokeStyle = rg;
        ctx.lineWidth = r * 0.09;
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.3, r * 0.58, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      };
      ring(false);
      // atmosphere glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.45);
      glow.addColorStop(0, "rgba(101,88,245,0.35)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const body = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.1, cx, cy, r * 1.05);
      body.addColorStop(0, "#9a8cff");
      body.addColorStop(0.45, "#4b37c9");
      body.addColorStop(1, "#120a3a");
      ctx.fillStyle = body;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      // drifting cloud bands
      for (let i = 0; i < 7; i++) {
        const y = cy - r + ((i + 0.5) / 7) * r * 2;
        const off = ((t * (6 + i * 1.5)) % (r * 4)) - r * 2;
        ctx.fillStyle = i % 2 ? "rgba(124,245,218,0.07)" : "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.ellipse(cx + off, y, r * 1.4, r * 0.06 + (i % 3) * 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // terminator shadow
      const sh = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      sh.addColorStop(0.45, "rgba(0,0,0,0)");
      sh.addColorStop(1, "rgba(2,2,12,0.75)");
      ctx.fillStyle = sh;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      // rim light
      ctx.strokeStyle = "rgba(124,245,218,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI * 0.95, Math.PI * 1.6);
      ctx.stroke();
      ring(true);
      // moon
      const a = t * 0.12;
      const mx = cx + Math.cos(a) * r * 2.6;
      const my = cy + Math.sin(a) * r * 0.75 - r * 0.2;
      const behind = Math.sin(a) < 0;
      if (!behind || true) {
        const mg = ctx.createRadialGradient(mx - 4, my - 4, 1, mx, my, r * 0.14);
        mg.addColorStop(0, "#e9fffa");
        mg.addColorStop(1, "#1d6f62");
        ctx.globalAlpha = behind ? 0.5 : 1;
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(mx, my, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const smallPlanet = (cx: number, cy: number, r: number) => {
      const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
      g.addColorStop(0, "#b6fff0");
      g.addColorStop(0.5, "#22d3a6");
      g.addColorStop(1, "#063a32");
      const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 2.2);
      glow.addColorStop(0, "rgba(34,211,166,0.25)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const orbit = (cx: number, cy: number, rx: number, ry: number, rot: number, t: number, speed: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      // LED pulse along the orbit
      const head = t * speed;
      for (let s = 0; s < 22; s++) {
        const a1 = head - s * 0.018;
        const a2 = a1 - 0.018;
        const alpha = (1 - s / 22) ** 2;
        ctx.strokeStyle = `rgba(255,255,255,${(0.9 * alpha).toFixed(3)})`;
        ctx.shadowColor = "rgba(180,200,255,0.9)";
        ctx.shadowBlur = 10 * alpha;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a1) * rx, Math.sin(a1) * ry);
        ctx.lineTo(Math.cos(a2) * rx, Math.sin(a2) * ry);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    let last = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.drawImage(backdrop, 0, 0, w, h);

      // twinkling parallax stars
      for (const s of stars) {
        if (!reduce) s.x -= s.layer * 2.2 * dt;
        if (s.x < -2) s.x = w + 2;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + s.layer * 0.3) + s.tw));
        ctx.fillStyle = `rgba(255,255,255,${(a * (0.4 + s.layer * 0.2)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // crypto network
      for (const n of nodes) {
        if (!reduce) { n.x += n.vx * dt; n.y += n.vy * dt; }
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      const maxD = small ? 150 : 210;
      const edges: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = Math.hypot(nodes[i]!.x - nodes[j]!.x, nodes[i]!.y - nodes[j]!.y);
          if (d < maxD) {
            edges.push([i, j]);
            ctx.strokeStyle = `rgba(143,124,255,${(0.16 * (1 - d / maxD)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i]!.x, nodes[i]!.y);
            ctx.lineTo(nodes[j]!.x, nodes[j]!.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = "rgba(124,245,218,0.55)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce && edges.length && packets.length < 6 && Math.random() < 0.05) {
        const [a, b] = edges[Math.floor(Math.random() * edges.length)]!;
        packets.push({ a, b, t: 0, speed: 0.5 + Math.random() * 0.6 });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]!;
        p.t += p.speed * dt;
        const A = nodes[p.a]!, B = nodes[p.b]!;
        if (p.t >= 1 || Math.hypot(A.x - B.x, A.y - B.y) > maxD) { packets.splice(i, 1); continue; }
        const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#7cf5da";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // orbits around the hologram
      const lx = small ? w * 0.5 : w * 0.6;
      const ly = small ? h * 0.38 : h * 0.42;
      const R = Math.min(w, h) * (small ? 0.42 : 0.36);
      orbit(lx, ly, R, R * 0.32, -0.25, t, 0.35);
      orbit(lx, ly, R * 1.35, R * 0.45, -0.25, t + 3, -0.22);
      orbit(lx, ly, R * 0.7, R * 0.22, -0.25, t + 7, 0.5);

      // Hustera hologram
      if (logo.complete && logo.naturalWidth) {
        const size = Math.min(w, h) * (small ? 0.3 : 0.24);
        const float = Math.sin(t * 0.6) * 8;
        const spin = Math.cos(t * 0.35);
        ctx.save();
        ctx.translate(lx, ly + float);
        ctx.scale(0.35 + 0.65 * Math.abs(spin), 1);
        ctx.globalAlpha = 0.16;
        ctx.shadowColor = "#8f7cff";
        ctx.shadowBlur = 40;
        ctx.drawImage(logo, -size / 2, -size / 2, size, size);
        ctx.restore();
        // scan lines over the hologram
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = "#7cf5da";
        for (let y = -size / 2; y < size / 2; y += 6) ctx.fillRect(lx - size / 2, ly + float + y + ((t * 12) % 6), size, 1);
        ctx.restore();
      }

      // planets
      const pr = Math.min(w, h) * (small ? 0.2 : 0.17);
      planet(small ? w * 0.85 : w * 0.88, small ? h * 0.86 : h * 0.82, pr, t);
      smallPlanet(small ? w * 0.12 : w * 0.22, small ? h * 0.14 : h * 0.18, pr * 0.22);

      // shooting star
      if (!reduce && !shooting && Math.random() < 0.004) shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.3, vx: 520, vy: 220, life: 1 };
      if (shooting) {
        const s = shooting;
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.3;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
        g.addColorStop(0, `rgba(255,255,255,${Math.max(0, s.life)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18);
        ctx.stroke();
        if (s.life <= 0) shooting = null;
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    logo.onload = () => { if (reduce) draw(performance.now()); };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible" && !reduce) { last = performance.now(); raf = requestAnimationFrame(draw); }
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
