import "server-only";
import Stripe from "stripe";

export type PaymentProvider = "stripe" | "test";

export interface ProviderStatus {
  provider: PaymentProvider | null;
  reason: string;
}

/**
 * Chooses the payment provider. Stripe is used when a key is configured, but
 * only test-mode keys are accepted unless live payments are explicitly
 * enabled. Without Stripe, a clearly labelled simulated provider is available
 * outside production so the full flow can be exercised.
 */
export function providerStatus(): ProviderStatus {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key) {
    if (!key.startsWith("sk_test_") && process.env.HUSTERA_ALLOW_LIVE_PAYMENTS !== "true") {
      return { provider: null, reason: "A live Stripe key is configured but live payments are not enabled (HUSTERA_ALLOW_LIVE_PAYMENTS)." };
    }
    return { provider: "stripe", reason: key.startsWith("sk_test_") ? "Stripe test mode" : "Stripe live mode" };
  }
  if (process.env.NODE_ENV !== "production" || process.env.HUSTERA_TEST_PAYMENTS === "true") {
    return { provider: "test", reason: "Simulated test payments — no money moves" };
  }
  return { provider: null, reason: "No payment provider is configured." };
}

let stripeClient: Stripe | null = null;
function stripe(): Stripe {
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return stripeClient;
}

export async function createStripeCheckout(o: { orderId: string; title: string; amountCents: number; currency: string; email: string; successUrl: string; cancelUrl: string }) {
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: o.email,
    line_items: [{ quantity: 1, price_data: { currency: o.currency.toLowerCase(), unit_amount: o.amountCents, product_data: { name: o.title } } }],
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    metadata: { order_id: o.orderId },
    payment_intent_data: { metadata: { order_id: o.orderId } },
  });
  return { sessionId: session.id, url: session.url! };
}

/** Verifies a webhook signature. Throws if the payload was not sent by Stripe. */
export function verifyStripeEvent(rawBody: string, signature: string): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  return stripe().webhooks.constructEvent(rawBody, signature, secret);
}

/** The fee Stripe actually charged, from the balance transaction. */
export async function stripeFeeFor(paymentIntentId: string): Promise<number | null> {
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    return bt?.fee ?? null;
  } catch {
    return null;
  }
}

export async function stripeRefund(paymentIntentId: string) {
  await stripe().refunds.create({ payment_intent: paymentIntentId });
}
