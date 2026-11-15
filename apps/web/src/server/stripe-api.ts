import "server-only";
import { providerStatus } from "./payments";

/**
 * Minimal Stripe REST client for agent actions (payment links, balance,
 * charges). Checkout and webhooks use the official SDK in payments.ts.
 */
const STRIPE = "https://api.stripe.com/v1";

/** True when Stripe is usable: a key is set and live keys are explicitly allowed. */
export function stripeConfigured() {
  return providerStatus().provider === "stripe";
}

function form(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  return body.toString();
}

async function call<T>(method: "GET" | "POST", path: string, params: Record<string, string | number | undefined> = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  if (!stripeConfigured()) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY)");
  const query = method === "GET" && Object.keys(params).length ? `?${form(params)}` : "";
  const res = await fetchImpl(`${STRIPE}${path}${query}`, {
    method,
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: method === "POST" ? form(params) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${body.error?.message ?? "request failed"}`);
  return body;
}

export interface PaymentLinkResult {
  productId: string;
  priceId: string;
  linkId: string;
  url: string;
  livemode: boolean;
}

/** Creates a Stripe product, price and shareable payment link for a Hustera product. */
export async function createPaymentLink(
  p: { id: string; title: string; description: string; priceCents: number; currency: string; imageUrl?: string | null },
  urls: { base: string },
  fetchImpl?: typeof fetch,
): Promise<PaymentLinkResult> {
  const product = await call<{ id: string; livemode: boolean }>(
    "POST",
    "/products",
    { name: p.title.slice(0, 250), description: p.description.slice(0, 500), "metadata[hustera_product_id]": p.id, "images[0]": p.imageUrl ?? undefined },
    fetchImpl,
  );
  const price = await call<{ id: string }>("POST", "/prices", { product: product.id, unit_amount: p.priceCents, currency: p.currency.toLowerCase() }, fetchImpl);
  const link = await call<{ id: string; url: string }>(
    "POST",
    "/payment_links",
    {
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": 1,
      "metadata[hustera_product_id]": p.id,
      "after_completion[type]": "redirect",
      "after_completion[redirect][url]": `${urls.base}/orders/stripe/{CHECKOUT_SESSION_ID}`,
    },
    fetchImpl,
  );
  return { productId: product.id, priceId: price.id, linkId: link.id, url: link.url, livemode: product.livemode };
}

export interface StripeOverview {
  livemode: boolean;
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
  charges: { id: string; amount: number; currency: string; status: string; paid: boolean; refunded: boolean; description: string | null; created: number }[];
}

/** Read-only view of the connected Stripe account: balance and latest charges. */
export async function stripeOverview(fetchImpl?: typeof fetch): Promise<StripeOverview> {
  const balance = await call<{ livemode: boolean; available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>("GET", "/balance", {}, fetchImpl);
  const charges = await call<{ data: StripeOverview["charges"] }>("GET", "/charges", { limit: 20 }, fetchImpl);
  return { livemode: balance.livemode, available: balance.available, pending: balance.pending, charges: charges.data };
}
