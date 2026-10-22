import { z } from "zod";

/**
 * Commerce rules (Milestone C). Money is always integer minor units (cents).
 * Ledger entries are double-entry: every group of entries sums to zero.
 */

export type ProductKind = "digital" | "physical" | "service";

export const productSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(10, "Describe the product in at least 10 characters").max(5000),
  kind: z.enum(["digital", "physical", "service"]),
  priceCents: z.coerce.number().int().min(100, "Minimum price is €1.00").max(1_000_000, "Maximum price is €10,000"),
  deliveryContent: z.string().trim().max(5000),
  ownershipConfirmed: z.literal(true, { message: "Confirm that you own this product or are authorised to sell it" }),
});

export const storeSchema = z.object({
  name: z.string().trim().min(3).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
  description: z.string().trim().max(500),
  sellerLegalName: z.string().trim().min(2, "Enter the legal name of the seller (you or your company)").max(120),
  sellerCountry: z.string().trim().length(2, "Use a two-letter country code, e.g. SE").toUpperCase(),
  supportEmail: z.string().trim().email("Enter a support email buyers can contact"),
});

export const costSchema = z.object({
  category: z.enum(["cogs", "shipping", "advertising", "tools", "other"]),
  amountCents: z.coerce.number().int().min(1).max(10_000_000),
  memo: z.string().trim().min(2).max(200),
});

// ---------------------------------------------------------------- ledger

export type LedgerAccount =
  | "cash:provider"
  | "revenue:sales"
  | "expense:payment_fees"
  | "contra:refunds"
  | "expense:cogs"
  | "expense:shipping"
  | "expense:advertising"
  | "expense:tools"
  | "expense:other"
  | "equity:owner";

export interface LedgerLine {
  account: LedgerAccount;
  /** Positive = debit, negative = credit. */
  amountCents: number;
}

export function isBalanced(lines: LedgerLine[]): boolean {
  return lines.length >= 2 && lines.every((l) => Number.isInteger(l.amountCents)) && lines.reduce((s, l) => s + l.amountCents, 0) === 0;
}

/** Ledger lines for a captured sale. The provider keeps its fee; we receive the rest. */
export function saleLines(amountCents: number, feeCents: number): LedgerLine[] {
  return [
    { account: "cash:provider", amountCents: amountCents - feeCents },
    { account: "expense:payment_fees", amountCents: feeCents },
    { account: "revenue:sales", amountCents: -amountCents },
  ];
}

export function refundLines(amountCents: number): LedgerLine[] {
  return [
    { account: "contra:refunds", amountCents },
    { account: "cash:provider", amountCents: -amountCents },
  ];
}

export function costLines(category: z.infer<typeof costSchema>["category"], amountCents: number): LedgerLine[] {
  return [
    { account: `expense:${category}` as LedgerAccount, amountCents },
    { account: "equity:owner", amountCents: -amountCents },
  ];
}

/** Stripe-like fee used only by the simulated test provider (1.5% + €0.25). */
export function simulatedFee(amountCents: number): number {
  return Math.round(amountCents * 0.015) + 25;
}

// ---------------------------------------------------------------- profit & platform fee

export interface ProfitInputs {
  revenueCents: number;
  refundsCents: number;
  paymentFeesCents: number;
  cogsCents: number;
  shippingCents: number;
  advertisingCents: number;
  toolsCents: number;
  otherCents: number;
  agentCostsCents: number;
  /** Unrecovered losses from earlier periods (≥ 0). */
  lossCarryforwardCents: number;
}

export interface Settlement {
  netProfitCents: number;
  eligibleProfitCents: number;
  platformFeeCents: number;
  userShareCents: number;
  lossCarryforwardCents: number;
}

export const PLATFORM_FEE_BPS = 3000;

/**
 * The proposed 30% platform fee applies only to verified positive net profit
 * after earlier losses are recovered. Gross sales and deposits are never profit.
 * This is a preview: the contractual definition still needs legal and
 * accounting review, and nothing is collected.
 */
export function computeSettlement(p: ProfitInputs): Settlement {
  const costs = p.refundsCents + p.paymentFeesCents + p.cogsCents + p.shippingCents + p.advertisingCents + p.toolsCents + p.otherCents + p.agentCostsCents;
  const net = p.revenueCents - costs;
  const afterLosses = net - Math.max(0, p.lossCarryforwardCents);
  if (afterLosses <= 0) {
    return { netProfitCents: net, eligibleProfitCents: 0, platformFeeCents: 0, userShareCents: Math.max(0, net), lossCarryforwardCents: -afterLosses };
  }
  const fee = Math.floor((afterLosses * PLATFORM_FEE_BPS) / 10_000);
  return { netProfitCents: net, eligibleProfitCents: afterLosses, platformFeeCents: fee, userShareCents: net - fee, lossCarryforwardCents: 0 };
}

// ---------------------------------------------------------------- safe URL import

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

/** True for loopback, private, link-local and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  return PRIVATE_V4.some((r) => r.test(ip));
}

/** Extracts title/description from HTML meta tags without executing anything. */
export function parseProductMeta(html: string): { title: string | null; description: string | null } {
  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
    return html.match(re)?.[1] ?? html.match(re2)?.[1] ?? null;
  };
  const decode = (s: string | null) => (s ? s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim() : null);
  const title = meta("og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  return { title: decode(title)?.slice(0, 100) ?? null, description: decode(meta("og:description") ?? meta("description"))?.slice(0, 5000) ?? null };
}
