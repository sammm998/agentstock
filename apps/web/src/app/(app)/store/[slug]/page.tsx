import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatCents } from "@hustera/domain";
import { getStoreBySlug, storeProducts } from "@/server/commerce";
import { EmptyState } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const store = await getStoreBySlug((await params).slug);
  return { title: store?.name ?? "Store" };
}

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const store = await getStoreBySlug((await params).slug);
  if (!store) notFound();
  const products = await storeProducts(store.id);
  return (
    <div className="space-y-6">
      <header className="card overflow-hidden">
        <div className="h-24" style={{ background: "linear-gradient(120deg, #2a2178, #111c31 55%, #0f3a3a)" }} aria-hidden="true" />
        <div className="p-6">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          {store.description && <p className="mt-2 text-muted">{store.description}</p>}
          <p className="mt-3 text-xs text-muted">Sold by {store.seller_legal_name} ({store.seller_country}) · Contact: {store.support_email}</p>
        </div>
      </header>
      {products.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/store/${store.slug}/${p.id}`} className="card flex h-full flex-col p-5 hover:border-indigo/50">
                <span className="chip w-fit capitalize">{p.kind}</span>
                <h2 className="mt-3 font-semibold">{p.title}</h2>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted">{p.description}</p>
                <p className="mt-4 text-lg font-bold">{formatCents(p.price_cents, p.currency)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No products yet">This store hasn&apos;t published anything yet.</EmptyState>
      )}
    </div>
  );
}
