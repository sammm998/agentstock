import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { getMyStore, myProducts, sellerOrders } from "@/server/commerce";
import { providerStatus } from "@/server/payments";
import { createProductAction, productStatusAction, refundOrderAction, saveStoreAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ImportProduct } from "@/components/import-product";
import { Illustrative, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Store" };

export default async function StorePage() {
  const viewer = await requireViewer();
  const [store, products, orders] = await Promise.all([getMyStore(viewer.id), myProducts(viewer.id), sellerOrders(viewer.id)]);
  const payments = providerStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your store"
        description="Sell digital products, physical goods or services you own. You are the seller of record; Hustera never holds your funds."
        actions={store ? <Link href={`/store/${store.slug}`} className="btn-secondary"><ExternalLink size={16} aria-hidden="true" /> View storefront</Link> : undefined}
      />
      <div className={`card p-4 text-sm ${payments.provider === "stripe" ? "border-mint/30" : "border-warning/30"}`}>
        <strong>Payments:</strong> <span className="text-muted">{payments.reason}.</span>
        {payments.provider === "test" && <span className="text-muted"> Buyers see a clearly labelled simulated checkout. Set <code>STRIPE_SECRET_KEY</code> (test mode) to use Stripe Checkout.</span>}
      </div>

      <section className="card p-6" aria-labelledby="store-h">
        <h2 id="store-h" className="font-semibold">{store ? "Store details" : "Create your store"}</h2>
        <p className="mt-1 text-sm text-muted">Seller identity is shown to buyers as required by EU consumer law.</p>
        <ActionForm action={saveStoreAction} showOk className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="name">Store name</label><input id="name" name="name" required minLength={3} maxLength={60} defaultValue={store?.name} className="input" /></div>
          <div><label className="label" htmlFor="slug">Address (/store/…)</label><input id="slug" name="slug" required pattern="[a-z0-9-]+" minLength={3} maxLength={32} defaultValue={store?.slug ?? viewer.handle.replace(/_/g, "-")} className="input" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" maxLength={500} rows={2} defaultValue={store?.description} className="input" /></div>
          <div><label className="label" htmlFor="sellerLegalName">Seller legal name</label><input id="sellerLegalName" name="sellerLegalName" required defaultValue={store?.seller_legal_name ?? viewer.displayName} className="input" /></div>
          <div className="grid grid-cols-[90px_1fr] gap-3">
            <div><label className="label" htmlFor="sellerCountry">Country</label><input id="sellerCountry" name="sellerCountry" required maxLength={2} defaultValue={store?.seller_country ?? "SE"} className="input uppercase" /></div>
            <div><label className="label" htmlFor="supportEmail">Support email</label><input id="supportEmail" name="supportEmail" type="email" required defaultValue={store?.support_email ?? viewer.email} className="input" /></div>
          </div>
          <div className="sm:col-span-2"><button className="btn-primary">{store ? "Save store" : "Create store"}</button></div>
        </ActionForm>
      </section>

      {store && (
        <>
          <section className="card p-6" aria-labelledby="new-h">
            <h2 id="new-h" className="font-semibold">Add a product</h2>
            <ImportProduct />
            <ActionForm action={createProductAction} reset showOk className="mt-4 grid gap-4 sm:grid-cols-2" aria-label="New product">
              <input type="hidden" name="sourceUrl" id="sourceUrl" />
              <div className="sm:col-span-2"><label className="label" htmlFor="ptitle">Product title</label><input id="ptitle" name="title" required minLength={3} maxLength={100} className="input" /></div>
              <div className="sm:col-span-2"><label className="label" htmlFor="pdesc">Product description</label><textarea id="pdesc" name="description" required minLength={10} maxLength={5000} rows={3} className="input" /></div>
              <div>
                <label className="label" htmlFor="kind">Type</label>
                <select id="kind" name="kind" className="input"><option value="digital">Digital (instant delivery)</option><option value="physical">Physical (you ship it)</option><option value="service">Service</option></select>
              </div>
              <div><label className="label" htmlFor="price">Price incl. VAT (€)</label><input id="price" name="price" type="number" min={1} max={10000} step="0.01" required className="input" /></div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="deliveryContent">Delivery content</label>
                <textarea id="deliveryContent" name="deliveryContent" maxLength={5000} rows={2} placeholder="For digital products: the download link or content buyers receive after payment" className="input" />
              </div>
              <label className="flex items-start gap-2.5 text-sm text-muted sm:col-span-2">
                <input type="checkbox" name="ownershipConfirmed" required className="mt-1 accent-indigo" />
                I own this product or am authorised to sell it, and I am responsible for it as the seller.
              </label>
              <div className="sm:col-span-2"><button className="btn-primary">Save as draft</button></div>
            </ActionForm>
          </section>

          <section className="card p-6" aria-labelledby="products-h">
            <h2 id="products-h" className="font-semibold">Products ({products.length})</h2>
            {products.length ? (
              <ul className="mt-3 divide-y divide-line">
                {products.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.title} <span className="chip ml-1 capitalize">{p.status}</span>{p.source === "agent" && <span className="chip ml-1">by agent</span>}</p>
                      <p className="text-xs text-muted">{p.kind} · {formatCents(p.price_cents)} · {p.sales} paid orders</p>
                    </div>
                    <ActionForm action={productStatusAction} className="flex gap-2">
                      <input type="hidden" name="productId" value={p.id} />
                      {p.status !== "active" && <button name="status" value="active" className="btn-primary btn-sm">Publish</button>}
                      {p.status === "active" && <Link href={`/store/${store.slug}/${p.id}`} className="btn-ghost btn-sm">View</Link>}
                      {p.status === "active" && <button name="status" value="draft" className="btn-secondary btn-sm">Unpublish</button>}
                      {p.status !== "archived" && <button name="status" value="archived" className="btn-ghost btn-sm">Archive</button>}
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No products yet. Add one above, or let a <Link href="/projects/new" className="underline">mission</Link> prepare one for you.</p>
            )}
          </section>

          <section className="card p-6" aria-labelledby="orders-h">
            <h2 id="orders-h" className="font-semibold">Orders</h2>
            {orders.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Item</th><th className="py-2 font-medium">Buyer</th><th className="py-2 font-medium">Amount</th><th className="py-2 font-medium">Status</th><th className="py-2"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2.5">{o.title} <span className="text-xs text-muted">· <TimeAgo date={o.created_at} /></span></td>
                        <td className="py-2.5 text-muted">{o.buyer_email}</td>
                        <td className="py-2.5">{formatCents(o.amount_cents)} {o.simulated && <Illustrative>Test</Illustrative>}</td>
                        <td className="py-2.5 capitalize">{o.status}</td>
                        <td className="py-2.5 text-right">
                          {o.status === "paid" && o.kind === "product" && (
                            <ActionForm action={refundOrderAction} confirm={`Refund ${formatCents(o.amount_cents)} to ${o.buyer_email}?`}>
                              <input type="hidden" name="orderId" value={o.id} />
                              <button className="btn-ghost btn-sm">Refund</button>
                            </ActionForm>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">No orders yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
