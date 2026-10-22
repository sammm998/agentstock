import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock } from "lucide-react";
import { formatCents } from "@hustera/domain";
import { orderByToken } from "@/server/commerce";
import { AutoRefresh } from "@/components/live";
import { Illustrative } from "@/components/ui";
import { Markdown } from "@/components/markdown";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await orderByToken(token);
  if (!order) notFound();
  const paid = order.status === "paid";
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {order.status === "pending" && <AutoRefresh seconds={3} />}
      <section className="card p-8 text-center">
        {paid ? <CheckCircle2 className="mx-auto text-mint" size={44} aria-hidden="true" /> : <Clock className="mx-auto text-warning" size={44} aria-hidden="true" />}
        <h1 className="mt-4 text-2xl font-bold">{paid ? "Thank you for your order" : order.status === "pending" ? "Waiting for payment confirmation" : `Order ${order.status}`}</h1>
        <p className="mt-2 text-muted">{order.title} · {formatCents(order.amount_cents, order.currency)}</p>
        {order.simulated && <div className="mt-3"><Illustrative>Test order — no money moved</Illustrative></div>}
        <p className="mt-4 text-xs text-muted">Keep this page&apos;s link to access your purchase. {order.support_email && <>Questions: {order.support_email}{order.seller_legal_name ? ` (${order.seller_legal_name})` : ""}</>}</p>
      </section>
      {paid && order.product_kind === "digital" && order.delivery_content && (
        <section className="card p-6" aria-labelledby="delivery-h">
          <h2 id="delivery-h" className="font-semibold">Your delivery</h2>
          <div className="mt-3 break-words rounded-xl bg-midnight/50 p-4"><Markdown source={order.delivery_content} /></div>
        </section>
      )}
      {paid && order.kind === "contract" && <p className="card p-6 text-sm text-muted">Payment received. Your contract is now in progress — follow it under Marketplace → Contracts.</p>}
    </div>
  );
}
