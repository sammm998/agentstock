"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------- noise

function makeNoise(seed: number) {
  const p = new Uint8Array(512);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
  }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255]!;
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h: number, x: number, y: number) => ((h & 1 ? -x : x) + (h & 2 ? -y : y));
  const noise = (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = p[X]! + Y, b = p[X + 1]! + Y;
    const l1 = grad(p[a]!, x, y) + u * (grad(p[b]!, x - 1, y) - grad(p[a]!, x, y));
    const l2 = grad(p[a + 1]!, x, y - 1) + u * (grad(p[b + 1]!, x - 1, y - 1) - grad(p[a + 1]!, x, y - 1));
    return l1 + v * (l2 - l1);
  };
  return (x: number, y: number, oct = 5) => {
    let f = 0, amp = 0.5, fr = 1;
    for (let o = 0; o < oct; o++) { f += amp * noise(x * fr, y * fr); fr *= 2; amp *= 0.5; }
    return f; // ≈ -0.5..0.5
  };
}

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- painters

/** Deep-space backdrop: nebulae, a Milky Way band and thousands of stars. */
function paintSky(w: number, h: number, small: boolean) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#020309";
  g.fillRect(0, 0, w, h);

  // nebula via fbm at quarter resolution
  const sc = 4;
  const nw = Math.ceil(w / sc), nh = Math.ceil(h / sc);
  const neb = document.createElement("canvas");
  neb.width = nw; neb.height = nh;
  const ng = neb.getContext("2d")!;
  const img = ng.createImageData(nw, nh);
  const fbm = makeNoise(7), fbm2 = makeNoise(42);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const u = x / nw, v = y / nh;
      // diagonal galactic band
      const band = Math.exp(-(((v - 0.25 - u * 0.55) * 3.2) ** 2));
      const n = fbm(u * 3.2, v * 3.2) + 0.5;
      const n2 = fbm2(u * 6 + 10, v * 6) + 0.5;
      const dust = clamp((fbm(u * 9 + 3, v * 9) + 0.5 - 0.45) * 3); // dark lanes
      const glow = clamp(band * (n * 1.4 - 0.25)) * (1 - dust * 0.75);
      const cloud = clamp((n2 - 0.52) * 2.6) * (0.5 + band);
      const i = (y * nw + x) * 4;
      // violet core, teal edges, warm dust
      img.data[i] = clamp(glow * 120 + cloud * 70 + glow * dust * 40, 0, 255);
      img.data[i + 1] = clamp(glow * 80 + cloud * 110, 0, 255);
      img.data[i + 2] = clamp(glow * 210 + cloud * 150, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  ng.putImageData(img, 0, 0);
  g.globalCompositeOperation = "lighter";
  g.globalAlpha = 0.55;
  g.imageSmoothingQuality = "high";
  g.filter = "blur(14px)";
  g.drawImage(neb, 0, 0, w, h);
  g.filter = "none";
  g.globalAlpha = 1;

  // stars: dense along the band, real stellar colours
  const colours = ["#9bb0ff", "#aabfff", "#cad7ff", "#f8f7ff", "#fff4ea", "#ffd2a1", "#ffcc6f"];
  const count = small ? 1400 : 3600;
  for (let k = 0; k < count; k++) {
    const u = Math.random(), inBand = Math.random() < 0.55;
    const v = inBand ? 0.25 + u * 0.55 + (Math.random() + Math.random() + Math.random() - 1.5) * 0.12 : Math.random();
    const x = u * w, y = v * h;
    const m = Math.random() ** 6;
    const r = 0.25 + m * 1.4;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    g.fillStyle = colours[Math.floor(Math.random() * colours.length)]!;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  // vignette
  const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.6)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  return c;
}

/** Gas giant rendered per pixel: turbulent bands, limb darkening and a lit crescent. */
function paintGiant(r: number, rot: number) {
  const size = Math.ceil(r * 2);
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const fbm = makeNoise(99);
  const L = [-0.62, -0.5, 0.6]; // light from upper left, slightly in front
  const ll = Math.hypot(L[0]!, L[1]!, L[2]!);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px - r) / r, y = (py - r) / r;
      const d = x * x + y * y;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d);
      const lat = Math.asin(y);
      const lon = Math.atan2(x, z) + rot;
      const turb = fbm(lon * 1.6, lat * 7, 5);
      const b = Math.sin(lat * 11 + turb * 5);
      const b2 = Math.sin(lat * 27 + turb * 9);
      const t = 0.5 + 0.5 * b;
      // palette: deep indigo → violet → pale lavender, with teal storms
      let R = 70 + t * 80 + b2 * 8, G = 55 + t * 60 + b2 * 7, B = 140 + t * 85 + b2 * 7;
      const storm = clamp((fbm(lon * 3 + 5, lat * 6) - 0.3) * 3) * 0.35;
      R = R * (1 - storm) + 110 * storm; G = G * (1 - storm) + 190 * storm; B = B * (1 - storm) + 200 * storm;
      const lambert = clamp((x * L[0]! + y * L[1]! + z * L[2]!) / ll);
      const light = 0.015 + lambert ** 1.5 * 1.15;
      const limb = 0.55 + 0.45 * z;
      const i = (py * size + px) * 4;
      img.data[i] = clamp(R * light * limb, 0, 255);
      img.data[i + 1] = clamp(G * light * limb, 0, 255);
      img.data[i + 2] = clamp(B * light * limb, 0, 255);
      img.data[i + 3] = clamp((1 - d) * 40, 0, 1) * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function paintMoon(r: number) {
  const size = Math.ceil(r * 2);
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const fbm = makeNoise(5);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px - r) / r, y = (py - r) / r;
      const d = x * x + y * y;
      if (d > 1) continue;
      const z = Math.sqrt(1 - d);
      const n = fbm(x * 3 + 2, y * 3, 6);
      const crater = clamp(1 - Math.abs(fbm(x * 6, y * 6, 3)) * 9) * 0.25;
      const base = 120 + n * 160 - crater * 120;
      const lambert = clamp(-0.6 * x - 0.45 * y + 0.65 * z);
      const v = base * (0.05 + lambert);
      const i = (py * size + px) * 4;
      img.data[i] = clamp(v * 0.95, 0, 255);
      img.data[i + 1] = clamp(v * 0.97, 0, 255);
      img.data[i + 2] = clamp(v, 0, 255);
      img.data[i + 3] = clamp((1 - d) * 40, 0, 1) * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ---------------------------------------------------------------- component

/**
 * Photo-real deep-space backdrop: nebulae, Milky Way, twinkling coloured stars,
 * a lit gas giant with rings and a cratered moon, drifting slowly. The Hustera
 * mark floats faintly like a distant station beacon. Original artwork.
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
    let sky: HTMLCanvasElement | null = null;
    let giant: HTMLCanvasElement | null = null;
    let moon: HTMLCanvasElement | null = null;
    let pr = 0, rot = 0, lastPaint = 0;
    type Star = { x: number; y: number; r: number; tw: number; c: string };
    let bright: Star[] = [];
    let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight; small = w < 768;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky = paintSky(w, h, small);
      pr = Math.min(w, h) * (small ? 0.26 : 0.22);
      giant = paintGiant(pr, rot);
      moon = paintMoon(pr * 0.12);
      const cols = ["#cad7ff", "#ffffff", "#fff4ea", "#ffd2a1", "#9bb0ff"];
      bright = Array.from({ length: small ? 14 : 30 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 1.4, tw: Math.random() * 6.28, c: cols[Math.floor(Math.random() * cols.length)]! }));
    };

    const drawRing = (cx: number, cy: number, front: boolean) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.42);
      ctx.scale(1, 0.24);
      const bands: [number, number, string][] = [
        [1.32, 1.5, "rgba(190,175,255,0.30)"], [1.52, 1.78, "rgba(214,204,255,0.45)"],
        [1.84, 1.96, "rgba(160,150,230,0.25)"], [1.99, 2.25, "rgba(200,190,250,0.38)"], [2.3, 2.36, "rgba(170,240,225,0.25)"],
      ];
      for (const [a, b, col] of bands) {
        ctx.beginPath();
        ctx.arc(0, 0, pr * b, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2, false);
        ctx.arc(0, 0, pr * a, front ? Math.PI : Math.PI * 2, front ? 0 : Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
      }
      ctx.restore();
    };

    let last = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (sky) ctx.drawImage(sky, 0, 0, w, h);

      // slow camera drift for depth
      const driftX = Math.sin(t * 0.03) * 12, driftY = Math.cos(t * 0.025) * 8;

      // bright twinkling stars with diffraction spikes
      for (const s of bright) {
        const a = 0.55 + 0.45 * Math.sin(t * 1.3 + s.tw);
        const x = s.x + driftX * 0.3, y = s.y + driftY * 0.3;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, s.r * 6);
        glow.addColorStop(0, s.c);
        glow.addColorStop(0.15, `${s.c}aa`);
        glow.addColorStop(1, "transparent");
        ctx.globalAlpha = a;
        ctx.fillStyle = glow;
        ctx.fillRect(x - s.r * 6, y - s.r * 6, s.r * 12, s.r * 12);
        if (s.r > 1.6) {
          ctx.strokeStyle = s.c;
          ctx.globalAlpha = a * 0.35;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x - s.r * 9, y); ctx.lineTo(x + s.r * 9, y);
          ctx.moveTo(x, y - s.r * 9); ctx.lineTo(x, y + s.r * 9);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Hustera beacon, far away
      if (logo.complete && logo.naturalWidth) {
        const lx = (small ? w * 0.5 : w * 0.56) + driftX * 0.5, ly = (small ? h * 0.3 : h * 0.36) + driftY * 0.5;
        const size = Math.min(w, h) * (small ? 0.2 : 0.15);
        const halo = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 1.4);
        halo.addColorStop(0, "rgba(143,124,255,0.14)");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.fillRect(lx - size * 1.4, ly - size * 1.4, size * 2.8, size * 2.8);
        ctx.save();
        ctx.translate(lx, ly + Math.sin(t * 0.5) * 6);
        ctx.scale(0.4 + 0.6 * Math.abs(Math.cos(t * 0.25)), 1);
        ctx.globalAlpha = 0.13;
        ctx.drawImage(logo, -size / 2, -size / 2, size, size);
        ctx.restore();
      }

      // gas giant: re-shade slowly as it rotates
      if (!reduce && now - lastPaint > 1500) { rot += 0.012; giant = paintGiant(pr, rot); lastPaint = now; }
      const gx = (small ? w * 0.9 : w * 0.86) + driftX, gy = (small ? h * 0.9 : h * 0.8) + driftY;
      if (giant) {
        drawRing(gx, gy, false);
        const atmo = ctx.createRadialGradient(gx, gy, pr * 0.96, gx, gy, pr * 1.18);
        atmo.addColorStop(0, "rgba(150,140,255,0.35)");
        atmo.addColorStop(1, "transparent");
        ctx.fillStyle = atmo;
        ctx.beginPath(); ctx.arc(gx, gy, pr * 1.18, 0, Math.PI * 2); ctx.fill();
        ctx.drawImage(giant, gx - pr, gy - pr);
        // ring shadow on the planet
        ctx.save();
        ctx.beginPath(); ctx.arc(gx, gy, pr, 0, Math.PI * 2); ctx.clip();
        ctx.translate(gx, gy + pr * 0.18); ctx.rotate(-0.42); ctx.scale(1, 0.12);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(-pr * 2, -pr * 0.6, pr * 4, pr * 0.5);
        ctx.restore();
        drawRing(gx, gy, true);
      }

      // moon on a slow orbit, passing behind the planet
      if (moon) {
        const a = t * 0.05;
        const mx = gx + Math.cos(a) * pr * 2.9, my = gy + Math.sin(a) * pr * 0.7 - pr * 0.3;
        const behind = Math.sin(a) < 0 && Math.hypot(mx - gx, my - gy) < pr * 1.1;
        if (!behind) ctx.drawImage(moon, mx - pr * 0.12, my - pr * 0.12);
      }

      // occasional meteor
      if (!reduce && !shooting && Math.random() < 0.003) shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.35, vx: 640, vy: 260, life: 1 };
      if (shooting) {
        const s = shooting;
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.4;
        const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
        tail.addColorStop(0, `rgba(255,255,255,${clamp(s.life)})`);
        tail.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = tail; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15); ctx.stroke();
        if (s.life <= 0) shooting = null;
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(resize, 200); };
    window.addEventListener("resize", onResize);
    logo.onload = () => { if (reduce) draw(performance.now()); };
    raf = requestAnimationFrame(draw);
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible" && !reduce) { last = performance.now(); raf = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[-2]" />;
}
