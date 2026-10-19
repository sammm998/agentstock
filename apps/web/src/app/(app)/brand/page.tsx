import type { Metadata } from "next";
import { LogoMark, Wordmark } from "@/components/brand";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Brand" };

const PALETTE = [
  { name: "Midnight", hex: "#081020", role: "Background" },
  { name: "Slate", hex: "#111C31", role: "Elevated surfaces" },
  { name: "Indigo", hex: "#6558F5", role: "Primary actions" },
  { name: "Mint", hex: "#4EF2C2", role: "Highlights & success" },
  { name: "Cloud", hex: "#F7F9FF", role: "Text" },
  { name: "Muted", hex: "#8893AD", role: "Secondary text" },
];

export default function BrandPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Hustera brand" description="Working name — trademark, company-name and domain clearance are not yet complete." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="logo">
          <h2 id="logo" className="eyebrow">Brand logo</h2>
          <div className="mt-5"><Wordmark size={56} tagline /></div>
          <p className="mt-5 text-sm text-muted">Two pathways — a person and an AI agent — joined by a rising bridge, with a four-point creative spark.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-midnight"><LogoMark size={56} /></div>
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-cloud"><LogoMark size={56} onLight /></div>
            <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate text-cloud"><LogoMark size={56} mono /></div>
          </div>
          <p className="mt-3 text-xs text-muted">Dark · Light · Monochrome. Keep clear space equal to the spark&apos;s width on every side.</p>
        </section>
        <section className="card p-6" aria-labelledby="light">
          <h2 id="light" className="eyebrow">Light mode</h2>
          <div className="mt-5 rounded-2xl bg-cloud p-6 text-midnight">
            <span className="inline-flex items-center gap-3">
              <LogoMark size={52} onLight />
              <span>
                <span className="block text-4xl font-extrabold tracking-[-0.04em]">hustera</span>
                <span className="block text-xs font-medium text-[#4a5470]">Build together. Earn independently.</span>
              </span>
            </span>
          </div>
          <h2 className="eyebrow mt-8">Typography</h2>
          <p className="mt-3 text-sm text-muted">Plus Jakarta Sans (SIL Open Font License), self-hosted, with system fallbacks.</p>
          <p className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">Build together.<br />Earn independently.</p>
          <p className="mt-2 text-muted">Modern. Friendly. Ambitious. Global.</p>
          <p className="mt-3 break-words text-sm text-muted">Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz Åå Ää Öö 0123456789</p>
        </section>
      </div>
      <section className="card p-6" aria-labelledby="palette">
        <h2 id="palette" className="eyebrow">Color palette</h2>
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PALETTE.map((c) => (
            <li key={c.hex}>
              <div className="h-16 rounded-xl border border-line" style={{ background: c.hex }} />
              <p className="mt-2 text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-muted">{c.hex} · {c.role}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
