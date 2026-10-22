import "server-only";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import {
  computeSettlement,
  costLines,
  isBalanced,
  isPrivateAddress,
  parseProductMeta,
  refundLines,
  saleLines,
  simulatedFee,
  type LedgerLine,
  type ProductKind,
} from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, audit, newToken } from "./core";
import { notify } from "./notifications";
import { createStripeCheckout, providerStatus, stripeRefund } from "./payments";

export interface Store {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string;
  seller_legal_name: string;
  seller_country: string;
  support_email: string;
}

export interface Product {
  id: string;
  store_id: string;
  title: string;
  description: string;
  kind: ProductKind;
  price_cents: number;
  currency: string;
  delivery_content: string;
  status: "draft" | "active" | "archived";
  ownership_confirmed: boolean;
  source: string;
  source_url: string | null;
  mission_id: string | null;
  created_at: Date;
}

export interface Order {
  id: string;
  kind: "product" | "contract";
  product_id: string | null;
  contract_id: string | null;
  seller_id: string | null;
  buyer_id: string | null;
  buyer_email: string;
  title: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "refunded" | "cancelled";
  provider: "stripe" | "test";
  provider_payment_id: string | null;
  fee_cents: number | null;
  simulated: boolean;
  access_token: string;
  withdrawal_waiver: boolean;
  created_at: Date;
  paid_at: Date | null;
  refunded_at: Date | null;
}

// ---------------------------------------------------------------- ledger

export async function postLedger(db: Queryable, ownerId: string, lines: LedgerLine[], opts: { orderId?: string | null; memo: string; simulated: boolean }) {
  if (!isBalanced(lines)) throw new Error("Unbalanced ledger entry");
  const group = randomUUID();
  for (const l of lines) {
    await db.query(
      `insert into ledger_entries (owner_id, entry_group, account, amount_cents, order_id, memo, simulated) values ($1, $2, $3, $4, $5, $6, $7)`,
      [ownerId, group, l.account, l.amountCents, opts.orderId ?? null, opts.memo, opts.simulated],
    );
  }
}

// ---------------------------------------------------------------- stores & products

export async function getMyStore(ownerId: string) {
  return one<Store>(`select * from stores where owner_id = $1`, [ownerId]);
}

export async function getStoreBySlug(slug: string) {
  return one<Store>(`select s.* from stores s join users u on u.id = s.owner_id where s.slug = $1 and u.suspended_at is null`, [slug]);
}

export async function saveStore(ownerId: string, input: { name: string; slug: string; description: string; sellerLegalName: string; sellerCountry: string; supportEmail: string }) {
  await tx(async (db) => {
    const [taken] = await db.query(`select 1 from stores where slug = $1 and owner_id <> $2`, [input.slug, ownerId]);
    if (taken) throw new UserError("That store address is taken");
    await db.query(
      `insert into stores (owner_id, slug, name, description, seller_legal_name, seller_country, support_email) values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (owner_id) do update set slug = excluded.slug, name = excluded.name, description = excluded.description,
         seller_legal_name = excluded.seller_legal_name, seller_country = excluded.seller_country, support_email = excluded.support_email`,
      [ownerId, input.slug, input.name, input.description, input.sellerLegalName, input.sellerCountry, input.supportEmail],
    );
  });
}

async function requireStore(db: Queryable, ownerId: string): Promise<Store> {
  const [s] = await db.query<Store>(`select * from stores where owner_id = $1`, [ownerId]);
  if (!s) throw new UserError("Create your store first");
  return s;
}

export async function createProduct(
  ownerId: string,
  input: { title: string; description: string; kind: ProductKind; priceCents: number; deliveryContent: string; ownershipConfirmed: boolean; source?: "manual" | "url_import" | "agent"; sourceUrl?: string | null; missionId?: string | null },
  db?: Queryable,
): Promise<string> {
  const run = async (d: Queryable) => {
    const store = await requireStore(d, ownerId);
    const [p] = await d.query<{ id: string }>(
      `insert into products (store_id, title, description, kind, price_cents, delivery_content, ownership_confirmed, source, source_url, mission_id)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
      [store.id, input.title, input.description, input.kind, input.priceCents, input.deliveryContent, input.ownershipConfirmed, input.source ?? "manual", input.sourceUrl ?? null, input.missionId ?? null],
    );
    return p!.id;
  };
  return db ? run(db) : tx(run);
}

export async function myProducts(ownerId: string) {
  return q<Product & { sales: number }>(
    `select p.*, (select count(*) from orders o where o.product_id = p.id and o.status = 'paid')::int as sales
       from products p join stores s on s.id = p.store_id where s.owner_id = $1 order by p.created_at desc`,
    [ownerId],
  );
}

export async function setProductStatus(ownerId: string, productId: string, status: "draft" | "active" | "archived", db?: Queryable) {
  const run = async (d: Queryable) => {
    const [p] = await d.query<Product>(`select p.* from products p join stores s on s.id = p.store_id where p.id = $1 and s.owner_id = $2`, [productId, ownerId]);
    if (!p) throw new UserError("Product not found");
    if (status === "active" && !p.ownership_confirmed) throw new UserError("Confirm ownership before publishing");
    if (status === "active" && p.kind === "digital" && !p.delivery_content.trim()) throw new UserError("Add the delivery content (download link or text) before publishing a digital product");
    await d.query(`update products set status = $2, updated_at = now() where id = $1`, [productId, status]);
  };
  return db ? run(db) : tx(run);
}

export async function storeProducts(storeId: string) {
  return q<Product>(`select * from products where store_id = $1 and status = 'active' order by created_at desc`, [storeId]);
}

export async function getActiveProduct(productId: string) {
  return one<Product & { store_slug: string; store_name: string; seller_legal_name: string; seller_country: string; support_email: string; owner_id: string }>(
    `select p.*, s.slug as store_slug, s.name as store_name, s.seller_legal_name, s.seller_country, s.support_email, s.owner_id
       from products p join stores s on s.id = p.store_id join users u on u.id = s.owner_id
      where p.id = $1 and p.status = 'active' and u.suspended_at is null`,
    [productId],
  );
}

/**
 * Reads a product page's title and description. Guards against SSRF: https
 * only, public addresses only, no redirects, small responses, short timeout.
 */
export async function importFromUrl(rawUrl: string, fetchImpl: typeof fetch = fetch, resolve: (host: string) => Promise<string[]> = async (h) => (await lookup(h, { all: true })).map((a) => a.address)) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UserError("Enter a valid URL");
  }
  if (url.protocol !== "https:") throw new UserError("Only https:// links can be imported");
  if (url.username || url.password || (url.port && url.port !== "443")) throw new UserError("That URL can't be imported");
  const addresses = await resolve(url.hostname).catch(() => [] as string[]);
  if (!addresses.length || addresses.some(isPrivateAddress)) throw new UserError("That address can't be imported");
  const res = await fetchImpl(url, { redirect: "manual", signal: AbortSignal.timeout(6000), headers: { accept: "text/html" } }).catch(() => null);
  if (!res || !res.ok) throw new UserError("Couldn't read that page. Enter the details manually instead.");
  const reader = res.body?.getReader();
  let html = "";
  if (reader) {
    const decoder = new TextDecoder();
    while (html.length < 512_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => {});
  }
  const meta = parseProductMeta(html);
  if (!meta.title) throw new UserError("No product title found on that page");
  return { title: meta.title, description: meta.description ?? "", sourceUrl: url.toString() };
}

// ---------------------------------------------------------------- orders

export async function createOrder(
  input: { kind: "product" | "contract"; productId?: string; contractId?: string; sellerId: string; buyerId: string | null; buyerEmail: string; title: string; amountCents: number; withdrawalWaiver: boolean },
  urls: { base: string },
): Promise<{ orderId: string; redirectUrl: string }> {
  const status = providerStatus();
  if (!status.provider) throw new UserError(`Checkout is unavailable: ${status.reason}`);
  if (input.buyerId && input.buyerId === input.sellerId) throw new UserError("You can't buy from yourself");
  const token = newToken(24);
  const [order] = await q<{ id: string }>(
    `insert into orders (kind, product_id, contract_id, seller_id, buyer_id, buyer_email, title, amount_cents, provider, simulated, access_token, withdrawal_waiver)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
    [input.kind, input.productId ?? null, input.contractId ?? null, input.sellerId, input.buyerId, input.buyerEmail, input.title, input.amountCents, status.provider, status.provider === "test", token, input.withdrawalWaiver],
  );
  const orderId = order!.id;
  if (status.provider === "test") return { orderId, redirectUrl: `/checkout/test/${token}` };
  const session = await createStripeCheckout({
    orderId,
    title: input.title,
    amountCents: input.amountCents,
    currency: "EUR",
    email: input.buyerEmail,
    successUrl: `${urls.base}/orders/${token}?paid=1`,
    cancelUrl: `${urls.base}/orders/${token}`,
  });
  await q(`update orders set provider_session_id = $2 where id = $1`, [orderId, session.sessionId]);
  return { orderId, redirectUrl: session.url };
}

export async function buyProduct(productId: string, buyer: { id: string | null; email: string }, withdrawalWaiver: boolean, base: string) {
  const product = await getActiveProduct(productId);
  if (!product) throw new UserError("This product is not available");
  if (product.kind === "digital" && !withdrawalWaiver) {
    throw new UserError("For immediate digital delivery you must agree that your 14-day right of withdrawal ends once delivery starts");
  }
  return createOrder({ kind: "product", productId, sellerId: product.owner_id, buyerId: buyer.id, buyerEmail: buyer.email, title: product.title, amountCents: product.price_cents, withdrawalWaiver }, { base });
}

/**
 * Marks an order paid exactly once and books the sale. Called only from the
 * verified Stripe webhook or the simulated test checkout — never from an agent.
 */
export async function markOrderPaid(orderId: string, opts: { paymentId: string; feeCents: number | null }) {
  return tx(async (db) => {
    const [order] = await db.query<Order>(`update orders set status = 'paid', paid_at = now(), provider_payment_id = $2, fee_cents = $3 where id = $1 and status = 'pending' returning *`, [orderId, opts.paymentId, opts.feeCents]);
    if (!order) return false;
    if (order.seller_id) {
      const fee = opts.feeCents ?? 0;
      await postLedger(db, order.seller_id, saleLines(order.amount_cents, fee), { orderId, memo: `Sale: ${order.title}${opts.feeCents === null ? " (fee pending)" : ""}`, simulated: order.simulated });
      await notify(db, { userId: order.seller_id, kind: "order", body: `New ${order.simulated ? "test " : ""}order: ${order.title}` });
    }
    if (order.kind === "contract" && order.contract_id) {
      await db.query(`update contracts set status = 'in_progress', due_at = now() + make_interval(days => delivery_days), updated_at = now() where id = $1 and status = 'accepted'`, [order.contract_id]);
      await db.query(`insert into contract_events (contract_id, kind, message) values ($1, 'paid', 'Payment received. Work can start.')`, [order.contract_id]);
    }
    await audit(db, null, "order.paid", orderId, { simulated: order.simulated });
    return true;
  });
}

export async function completeTestCheckout(token: string) {
  const order = await one<Order>(`select * from orders where access_token = $1`, [token]);
  if (!order || order.provider !== "test") throw new UserError("Order not found");
  if (order.status !== "pending") return order;
  await markOrderPaid(order.id, { paymentId: `test_${order.id.slice(0, 8)}`, feeCents: simulatedFee(order.amount_cents) });
  return order;
}

export async function recordPaymentEvent(provider: string, eventId: string, type: string): Promise<boolean> {
  const rows = await q(`insert into payment_events (provider, event_id, type) values ($1, $2, $3) on conflict do nothing returning 1`, [provider, eventId, type]);
  return rows.length > 0;
}

export async function orderByToken(token: string) {
  return one<Order & { delivery_content: string | null; product_kind: string | null; store_slug: string | null; support_email: string | null; seller_legal_name: string | null }>(
    `select o.*, p.delivery_content, p.kind as product_kind, s.slug as store_slug, s.support_email, s.seller_legal_name
       from orders o left join products p on p.id = o.product_id left join stores s on s.id = p.store_id
      where o.access_token = $1`,
    [token],
  );
}

export async function sellerOrders(sellerId: string) {
  return q<Order>(`select * from orders where seller_id = $1 and status <> 'cancelled' order by created_at desc limit 200`, [sellerId]);
}

export async function buyerOrders(buyerId: string) {
  return q<Order>(`select * from orders where buyer_id = $1 order by created_at desc limit 100`, [buyerId]);
}

export async function refundOrder(sellerId: string, orderId: string, opts: { bySystem?: boolean } = {}) {
  const order = await one<Order>(`select * from orders where id = $1 and (seller_id = $2 or $3)`, [orderId, sellerId, !!opts.bySystem]);
  if (!order) throw new UserError("Order not found");
  if (order.status !== "paid") throw new UserError("Only paid orders can be refunded");
  if (order.provider === "stripe" && order.provider_payment_id) await stripeRefund(order.provider_payment_id);
  await tx(async (db) => {
    const [updated] = await db.query(`update orders set status = 'refunded', refunded_at = now() where id = $1 and status = 'paid' returning 1`, [orderId]);
    if (!updated) return;
    if (order.seller_id) await postLedger(db, order.seller_id, refundLines(order.amount_cents), { orderId, memo: `Refund: ${order.title}`, simulated: order.simulated });
    await audit(db, sellerId, "order.refunded", orderId);
  });
}

export async function recordCost(ownerId: string, input: { category: "cogs" | "shipping" | "advertising" | "tools" | "other"; amountCents: number; memo: string }) {
  await tx((db) => postLedger(db, ownerId, costLines(input.category, input.amountCents), { memo: input.memo, simulated: false }));
}

// ---------------------------------------------------------------- financials

export async function financials(ownerId: string, simulated: boolean) {
  const rows = await q<{ account: string; total: number }>(
    `select account, coalesce(sum(amount_cents), 0)::int as total from ledger_entries where owner_id = $1 and simulated = $2 group by account`,
    [ownerId, simulated],
  );
  const by = (a: string) => rows.find((r) => r.account === a)?.total ?? 0;
  const inputs = {
    revenueCents: -by("revenue:sales"),
    refundsCents: by("contra:refunds"),
    paymentFeesCents: by("expense:payment_fees"),
    cogsCents: by("expense:cogs"),
    shippingCents: by("expense:shipping"),
    advertisingCents: by("expense:advertising"),
    toolsCents: by("expense:tools"),
    otherCents: by("expense:other"),
    agentCostsCents: 0,
    lossCarryforwardCents: 0,
  };
  return { inputs, settlement: computeSettlement(inputs), cashAtProviderCents: by("cash:provider"), hasEntries: rows.length > 0 };
}

export async function ledgerEntries(ownerId: string, limit = 100) {
  return q<{ id: number; entry_group: string; account: string; amount_cents: number; memo: string; simulated: boolean; created_at: Date }>(
    `select id, entry_group, account, amount_cents, memo, simulated, created_at from ledger_entries where owner_id = $1 order by id desc limit $2`,
    [ownerId, limit],
  );
}
