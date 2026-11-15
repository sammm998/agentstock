import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { orderBySession } from "@/server/commerce";
import { AutoRefresh } from "@/components/live";

export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };

/** Stripe Payment Links redirect here; the order appears once the verified webhook arrives. */
export default async function StripeReturnPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) redirect("/");
  const order = await orderBySession(sessionId);
  if (order) redirect(`/orders/${order.access_token}?paid=1`);
  return (
    <section className="card mx-auto mt-10 max-w-md p-8 text-center">
      <AutoRefresh seconds={3} />
      <Clock className="mx-auto text-warning" size={40} aria-hidden="true" />
      <h1 className="mt-4 text-xl font-bold">Confirming your payment…</h1>
      <p className="mt-2 text-sm text-muted">This usually takes a few seconds. You&apos;ll also get an email with a link to your order.</p>
    </section>
  );
}
