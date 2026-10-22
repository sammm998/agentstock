import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatCents } from "@hustera/domain";
import { orderByToken } from "@/server/commerce";
import { completeTestCheckoutAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Illustrative } from "@/components/ui";

export const metadata: Metadata = { title: "Test checkout" };

export default async function TestCheckoutPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await orderByToken(token);
  if (!order || order.provider !== "test") notFound();
  return (
    <div className="card mx-auto mt-6 max-w-md p-8">
      <Illustrative>Simulated payment</Illustrative>
      <h1 className="mt-4 text-xl font-bold">Test checkout</h1>
      <p className="mt-2 text-sm text-muted">No payment provider is connected, so this checkout simulates a successful card payment. No money moves and nothing is charged.</p>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Item</dt><dd>{order.title}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold">{formatCents(order.amount_cents, order.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Receipt to</dt><dd>{order.buyer_email}</dd></div>
      </dl>
      {order.status === "pending" ? (
        <ActionForm action={completeTestCheckoutAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button className="btn-primary w-full">Simulate successful payment</button>
        </ActionForm>
      ) : (
        <p className="mt-6 text-sm text-mint">This order is already {order.status}.</p>
      )}
    </div>
  );
}
