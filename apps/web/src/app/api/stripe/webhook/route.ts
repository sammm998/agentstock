import { markOrderPaid, recordPaymentEvent, recordPaymentLinkSale } from "@/server/commerce";
import { stripeFeeFor, verifyStripeEvent } from "@/server/payments";

/**
 * Stripe webhook. The only path (besides the simulated test checkout) that can
 * mark an order paid. The signature is verified before anything is trusted.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = verifyStripeEvent(raw, signature);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (!(await recordPaymentEvent("stripe", event.id, event.type))) return Response.json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (orderId && paymentIntent && session.payment_status === "paid") {
      await markOrderPaid(orderId, { paymentId: paymentIntent, feeCents: await stripeFeeFor(paymentIntent) });
    } else if (!orderId && paymentIntent && session.payment_status === "paid" && session.payment_link) {
      // A sale through an agent-created Payment Link: there is no Hustera order yet.
      await recordPaymentLinkSale(
        {
          sessionId: session.id,
          paymentIntentId: paymentIntent,
          amountCents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          email: session.customer_details?.email ?? "unknown@stripe.invalid",
          livemode: session.livemode,
          productId: session.metadata?.hustera_product_id ?? null,
          paymentLinkId: typeof session.payment_link === "string" ? session.payment_link : session.payment_link.id,
          feeCents: await stripeFeeFor(paymentIntent),
        },
        (process.env.HUSTERA_BASE_URL ?? new URL(req.url).origin).replace(/\/$/, ""),
      );
    }
  }
  return Response.json({ received: true });
}
