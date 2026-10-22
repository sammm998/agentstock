import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { isUuid } from "@/server/core";
import { getActiveProduct } from "@/server/commerce";
import { providerStatus } from "@/server/payments";
import { getViewer } from "@/server/session";
import { buyProductAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Illustrative } from "@/components/ui";

export const metadata: Metadata = { title: "Product" };

export default async function ProductPage({ params }: { params: Promise<{ slug: string; productId: string }> }) {
  const { slug, productId } = await params;
  if (!isUuid(productId)) notFound();
  const product = await getActiveProduct(productId);
  if (!product || product.store_slug !== slug) notFound();
  const viewer = await getViewer();
  const payments = providerStatus();
  const own = viewer?.id === product.owner_id;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/store/${slug}`} className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> {product.store_name}</Link>
      <article className="card p-6 sm:p-8">
        <span className="chip capitalize">{product.kind}</span>
        <h1 className="mt-3 text-3xl font-bold">{product.title}</h1>
        <p className="mt-2 text-2xl font-bold text-mint">{formatCents(product.price_cents, product.currency)} <span className="text-sm font-normal text-muted">incl. VAT</span></p>
        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{product.description}</p>
        <dl className="mt-6 grid gap-2 rounded-xl bg-midnight/50 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Seller</dt><dd>{product.seller_legal_name} ({product.seller_country})</dd></div>
          <div><dt className="text-muted">Questions & returns</dt><dd>{product.support_email}</dd></div>
          <div><dt className="text-muted">Delivery</dt><dd>{product.kind === "digital" ? "Instantly after payment" : product.kind === "physical" ? "Shipped by the seller" : "Arranged with the seller"}</dd></div>
          <div><dt className="text-muted">Right of withdrawal</dt><dd>{product.kind === "digital" ? "Ends when delivery starts, with your consent" : "14 days"}</dd></div>
        </dl>
      </article>

      <section className="card p-6" aria-labelledby="buy-h">
        <div className="flex items-center justify-between">
          <h2 id="buy-h" className="font-semibold">Buy</h2>
          {payments.provider === "test" && <Illustrative>Test checkout — no real money</Illustrative>}
        </div>
        {own ? (
          <p className="mt-2 text-sm text-muted">This is your product. <Link href="/store" className="underline">Manage it</Link>.</p>
        ) : !payments.provider ? (
          <p className="mt-2 text-sm text-muted">Checkout is currently unavailable.</p>
        ) : (
          <ActionForm action={buyProductAction} className="mt-4 space-y-4">
            <input type="hidden" name="productId" value={product.id} />
            {!viewer && (
              <div><label className="label" htmlFor="email">Email for your receipt and delivery</label><input id="email" name="email" type="email" required className="input" /></div>
            )}
            {product.kind === "digital" && (
              <label className="flex items-start gap-2.5 text-sm text-muted">
                <input type="checkbox" name="waiver" required className="mt-1 accent-indigo" />
                I want immediate access and agree that my 14-day right of withdrawal ends once delivery starts.
              </label>
            )}
            <button className="btn-primary w-full">Continue to payment · {formatCents(product.price_cents, product.currency)}</button>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
