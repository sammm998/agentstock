import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Sparkles, Star } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { SERVICE_CATEGORIES, listServices } from "@/server/marketplace";
import { Avatar, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Marketplace" };

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const viewer = await getViewer();
  const sp = await searchParams;
  const category = SERVICE_CATEGORIES.find((c) => c === sp.category);
  const query = (sp.q ?? "").trim().slice(0, 80);
  const services = await listServices({ category, query: query || undefined, viewerId: viewer?.id });
  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Hire creators and freelancers, or offer your own services. Ratings come only from completed contracts."
        actions={viewer ? <><Link href="/contracts" className="btn-secondary">Contracts</Link><Link href="/marketplace/new" className="btn-primary"><Plus size={16} aria-hidden="true" /> Offer a service</Link></> : undefined}
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={query} placeholder="Search services…" aria-label="Search services" className="input max-w-sm" />
        {category && <input type="hidden" name="category" value={category} />}
        <button className="btn-secondary">Search</button>
      </form>
      <nav aria-label="Categories" className="mb-6 flex flex-wrap gap-2">
        <Link href="/marketplace" className={`chip px-3 py-1 text-sm ${!category ? "border-indigo/50 text-cloud" : ""}`}>All</Link>
        {SERVICE_CATEGORIES.map((c) => (
          <Link key={c} href={`/marketplace?category=${encodeURIComponent(c)}`} aria-current={category === c ? "true" : undefined} className={`chip px-3 py-1 text-sm hover:text-cloud ${category === c ? "border-indigo/50 text-cloud" : ""}`}>{c}</Link>
        ))}
      </nav>
      {services.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <li key={s.id}>
              <Link href={`/marketplace/${s.id}`} className="card flex h-full flex-col p-5 hover:border-indigo/50">
                <div className="flex items-center gap-2 text-sm">
                  <Avatar name={s.display_name} seed={s.handle} size={28} />
                  <span className="font-medium">{s.display_name}</span>
                  {s.ai_assisted && <span className="chip ml-auto"><Sparkles size={11} aria-hidden="true" /> AI-assisted</span>}
                </div>
                <h2 className="mt-3 font-semibold">{s.title}</h2>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted">{s.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {s.review_count ? <><Star size={13} className="inline text-warning" aria-hidden="true" /> {s.rating_avg} ({s.review_count})</> : "No reviews yet"} · {s.delivery_days}d
                  </span>
                  <span className="font-bold">{formatCents(s.price_cents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No services found" action={viewer ? <Link href="/marketplace/new" className="btn-primary">Offer the first one</Link> : undefined}>Be the first to list a service in this category.</EmptyState>
      )}
    </>
  );
}
