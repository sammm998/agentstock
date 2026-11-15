import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { q } from "@/server/db";
import { LogoMark } from "@/components/brand";

interface Page {
  slug: string;
  content: { headline: string; subheadline: string; benefits: string[]; faq: [string, string][]; cta: string };
  product_id: string;
  title: string;
  price_cents: number;
  currency: string;
  store_slug: string;
  pay_url: string | null;
  seller: string;
}

async function load(slug: string): Promise<Page | null> {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const [p] = await q<Page>(
    `select lp.slug, lp.content, p.id as product_id, p.title, p.price_cents, p.currency, s.slug as store_slug, p.stripe_payment_link_url as pay_url, s.name as seller
       from landing_pages lp join products p on p.id = lp.product_id join stores s on s.id = p.store_id
      where lp.slug = $1 and lp.status = 'published' and p.status = 'active'`,
    [slug],
  );
  return p ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.content.headline, description: p.content.subheadline } : { title: "Not found" };
}

export default async function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  await q(`update landing_pages set views = views + 1 where slug = $1`, [slug]);
  const buy = p.pay_url ?? `/store/${p.store_slug}/${p.product_id}`;
  return (
    <div className="desktop min-h-dvh px-4 py-10">
      <main className="mx-auto max-w-3xl space-y-6">
        <section className="card p-8 text-center sm:p-12">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{p.seller}</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{p.content.headline}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{p.content.subheadline}</p>
          <a href={buy} className="btn-primary mt-8 px-6 py-3 text-base">{p.content.cta || `Get it — ${formatCents(p.price_cents, p.currency)}`}</a>
        </section>
        <section className="card p-8">
          <h2 className="text-xl font-bold">What you get</h2>
          <ul className="mt-4 space-y-3">{p.content.benefits.map((b) => <li key={b} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{b}</li>)}</ul>
        </section>
        <section className="card p-8">
          <h2 className="text-xl font-bold">Questions</h2>
          <dl className="mt-4 space-y-4">{p.content.faq.map(([qq, a]) => <div key={qq}><dt className="font-semibold">{qq}</dt><dd className="text-muted">{a}</dd></div>)}</dl>
        </section>
        <p className="flex items-center justify-center gap-2 text-xs text-muted"><LogoMark size={14} /> Built with <Link href="/" className="underline">Hustera</Link> · payments by Stripe</p>
      </main>
    </div>
  );
}
