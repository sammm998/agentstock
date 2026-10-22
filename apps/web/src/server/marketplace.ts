import "server-only";
import { canOnPlatform, type PlatformRole } from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, audit } from "./core";
import { notify } from "./notifications";
import { createOrder, refundOrder } from "./commerce";

export const SERVICE_CATEGORIES = ["Development", "Web design", "Graphic design", "Copywriting", "Video", "Research", "Automation", "SEO", "Translation", "Virtual assistance", "Courses", "Downloadable products"] as const;

export type ContractStatus = "requested" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled" | "disputed";

export interface ServiceView {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  price_cents: number;
  delivery_days: number;
  revisions: number;
  ai_assisted: boolean;
  status: "active" | "paused";
  created_at: Date;
  handle: string;
  display_name: string;
  review_count: number;
  rating_avg: number | null;
  completed: number;
}

export interface ContractView {
  id: string;
  service_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  title: string;
  price_cents: number;
  delivery_days: number;
  revisions_allowed: number;
  revisions_used: number;
  requirements: string;
  status: ContractStatus;
  delivery: string | null;
  dispute_reason: string | null;
  resolution: string | null;
  due_at: Date | null;
  created_at: Date;
  updated_at: Date;
  buyer_handle: string | null;
  seller_handle: string | null;
}

const SERVICE_SELECT = `
  select s.*, p.handle, p.display_name,
    (select count(*) from reviews r where r.service_id = s.id)::int as review_count,
    (select round(avg(r.rating)::numeric, 1)::float from reviews r where r.service_id = s.id) as rating_avg,
    (select count(*) from contracts c where c.service_id = s.id and c.status = 'completed')::int as completed
  from services s join profiles p on p.user_id = s.seller_id join users u on u.id = s.seller_id`;

export async function createService(
  sellerId: string,
  input: { title: string; description: string; category: string; priceCents: number; deliveryDays: number; revisions: number; aiAssisted: boolean },
) {
  if (!(SERVICE_CATEGORIES as readonly string[]).includes(input.category)) throw new UserError("Choose a category");
  const [count] = await q<{ n: number }>(`select count(*)::int as n from services where seller_id = $1`, [sellerId]);
  if ((count?.n ?? 0) >= 20) throw new UserError("You can list up to 20 services");
  const [row] = await q<{ id: string }>(
    `insert into services (seller_id, title, description, category, price_cents, delivery_days, revisions, ai_assisted) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [sellerId, input.title, input.description, input.category, input.priceCents, input.deliveryDays, input.revisions, input.aiAssisted],
  );
  return row!.id;
}

export async function setServiceStatus(sellerId: string, serviceId: string, status: "active" | "paused") {
  const rows = await q(`update services set status = $3 where id = $1 and seller_id = $2 returning 1`, [serviceId, sellerId, status]);
  if (!rows.length) throw new UserError("Service not found");
}

export async function listServices(opts: { category?: string; query?: string; viewerId?: string | null } = {}) {
  const params: unknown[] = [opts.viewerId ?? null];
  let where = `s.status = 'active' and u.suspended_at is null
    and not exists (select 1 from blocks b where (b.blocker_id = $1 and b.blocked_id = s.seller_id) or (b.blocker_id = s.seller_id and b.blocked_id = $1))`;
  if (opts.category) {
    params.push(opts.category);
    where += ` and s.category = $${params.length}`;
  }
  if (opts.query) {
    params.push(`%${opts.query.replace(/[%_\\]/g, (c) => "\\" + c)}%`);
    where += ` and (s.title ilike $${params.length} or s.description ilike $${params.length})`;
  }
  return q<ServiceView>(`${SERVICE_SELECT} where ${where} order by s.created_at desc limit 60`, params);
}

export async function myServices(sellerId: string) {
  return q<ServiceView>(`${SERVICE_SELECT} where s.seller_id = $1 order by s.created_at desc`, [sellerId]);
}

export async function getService(serviceId: string) {
  return one<ServiceView>(`${SERVICE_SELECT} where s.id = $1 and u.suspended_at is null`, [serviceId]);
}

export async function serviceReviews(serviceId: string) {
  return q<{ id: string; rating: number; body: string; created_at: Date; handle: string; display_name: string }>(
    `select r.id, r.rating, r.body, r.created_at, p.handle, p.display_name from reviews r join profiles p on p.user_id = r.author_id
      where r.service_id = $1 order by r.created_at desc limit 50`,
    [serviceId],
  );
}

async function event(db: Queryable, contractId: string, actorId: string | null, kind: string, message: string) {
  await db.query(`insert into contract_events (contract_id, actor_id, kind, message) values ($1, $2, $3, $4)`, [contractId, actorId, kind, message]);
}

async function lockContract(db: Queryable, contractId: string, userId: string): Promise<ContractView> {
  const [c] = await db.query<ContractView>(`select * from contracts where id = $1 and (buyer_id = $2 or seller_id = $2) for update`, [contractId, userId]);
  if (!c) throw new UserError("Contract not found");
  return c;
}

function expect(c: ContractView, statuses: ContractStatus[]) {
  if (!statuses.includes(c.status)) throw new UserError(`This contract is ${c.status.replace("_", " ")}`);
}

export async function requestContract(buyerId: string, serviceId: string, requirements: string): Promise<string> {
  const service = await getService(serviceId);
  if (!service || service.status !== "active") throw new UserError("Service not available");
  if (service.seller_id === buyerId) throw new UserError("You can't hire yourself");
  const trimmed = requirements.trim();
  if (trimmed.length < 10 || trimmed.length > 3000) throw new UserError("Describe what you need in 10–3000 characters");
  return tx(async (db) => {
    const [blocked] = await db.query(`select 1 from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)`, [buyerId, service.seller_id]);
    if (blocked) throw new UserError("You can't hire this seller");
    const [c] = await db.query<{ id: string }>(
      `insert into contracts (service_id, buyer_id, seller_id, title, price_cents, delivery_days, revisions_allowed, requirements)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [serviceId, buyerId, service.seller_id, service.title, service.price_cents, service.delivery_days, service.revisions, trimmed],
    );
    await event(db, c!.id, buyerId, "requested", "Request sent to the seller.");
    await notify(db, { userId: service.seller_id, actorId: buyerId, kind: "contract", body: `requested “${service.title}”` });
    return c!.id;
  });
}

export async function respondToRequest(sellerId: string, contractId: string, accept: boolean) {
  await tx(async (db) => {
    const c = await lockContract(db, contractId, sellerId);
    if (c.seller_id !== sellerId) throw new UserError("Only the seller can respond");
    expect(c, ["requested"]);
    await db.query(`update contracts set status = $2, updated_at = now() where id = $1`, [contractId, accept ? "accepted" : "cancelled"]);
    await event(db, contractId, sellerId, accept ? "accepted" : "declined", accept ? "Seller accepted. Waiting for payment." : "Seller declined the request.");
    if (c.buyer_id) await notify(db, { userId: c.buyer_id, actorId: sellerId, kind: "contract", body: accept ? `accepted your request “${c.title}”` : `declined your request “${c.title}”` });
  });
}

export async function payContract(buyerId: string, contractId: string, buyerEmail: string, base: string) {
  const c = await one<ContractView>(`select * from contracts where id = $1 and buyer_id = $2`, [contractId, buyerId]);
  if (!c) throw new UserError("Contract not found");
  if (c.status !== "accepted") throw new UserError("This contract isn't ready for payment");
  const [pending] = await q<{ access_token: string; provider: string }>(`select access_token, provider from orders where contract_id = $1 and status = 'pending' order by created_at desc limit 1`, [contractId]);
  if (pending?.provider === "test") return { redirectUrl: `/checkout/test/${pending.access_token}` };
  return createOrder({ kind: "contract", contractId, sellerId: c.seller_id!, buyerId, buyerEmail, title: c.title, amountCents: c.price_cents, withdrawalWaiver: false }, { base });
}

export async function deliver(sellerId: string, contractId: string, delivery: string) {
  const text = delivery.trim();
  if (text.length < 5 || text.length > 5000) throw new UserError("Describe the delivery and include links to files");
  await tx(async (db) => {
    const c = await lockContract(db, contractId, sellerId);
    if (c.seller_id !== sellerId) throw new UserError("Only the seller can deliver");
    expect(c, ["in_progress"]);
    await db.query(`update contracts set status = 'delivered', delivery = $2, updated_at = now() where id = $1`, [contractId, text]);
    await event(db, contractId, sellerId, "delivered", "Seller delivered the work.");
    if (c.buyer_id) await notify(db, { userId: c.buyer_id, actorId: sellerId, kind: "contract", body: `delivered “${c.title}”` });
  });
}

export async function reviewDelivery(buyerId: string, contractId: string, decision: "accept" | "revise", note = "") {
  await tx(async (db) => {
    const c = await lockContract(db, contractId, buyerId);
    if (c.buyer_id !== buyerId) throw new UserError("Only the buyer can review the delivery");
    expect(c, ["delivered"]);
    if (decision === "accept") {
      await db.query(`update contracts set status = 'completed', updated_at = now() where id = $1`, [contractId]);
      await event(db, contractId, buyerId, "completed", "Buyer accepted the delivery. Contract completed.");
    } else {
      if (c.revisions_used >= c.revisions_allowed) throw new UserError("No revisions left. You can accept or open a dispute.");
      await db.query(`update contracts set status = 'in_progress', revisions_used = revisions_used + 1, updated_at = now() where id = $1`, [contractId]);
      await event(db, contractId, buyerId, "revision", `Revision requested${note ? `: ${note.slice(0, 500)}` : ""}.`);
    }
    if (c.seller_id) await notify(db, { userId: c.seller_id, actorId: buyerId, kind: "contract", body: decision === "accept" ? `completed “${c.title}”` : `requested a revision on “${c.title}”` });
  });
}

export async function cancelContract(userId: string, contractId: string) {
  await tx(async (db) => {
    const c = await lockContract(db, contractId, userId);
    expect(c, ["requested", "accepted"]);
    await db.query(`update contracts set status = 'cancelled', updated_at = now() where id = $1`, [contractId]);
    await db.query(`update orders set status = 'cancelled' where contract_id = $1 and status = 'pending'`, [contractId]);
    await event(db, contractId, userId, "cancelled", "Contract cancelled before payment.");
  });
}

export async function openDispute(userId: string, contractId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 10) throw new UserError("Explain the problem in at least 10 characters");
  await tx(async (db) => {
    const c = await lockContract(db, contractId, userId);
    expect(c, ["in_progress", "delivered"]);
    await db.query(`update contracts set status = 'disputed', dispute_reason = $2, updated_at = now() where id = $1`, [contractId, text.slice(0, 2000)]);
    await event(db, contractId, userId, "disputed", "A dispute was opened. A Hustera moderator will review it.");
    const other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
    if (other) await notify(db, { userId: other, actorId: userId, kind: "contract", body: `opened a dispute on “${c.title}”` });
  });
}

/** A moderator either refunds the buyer or marks the work completed. */
export async function resolveDispute(actor: { id: string; role: PlatformRole }, contractId: string, outcome: "refund" | "complete", note: string) {
  if (!canOnPlatform(actor.role, "resolve_reports")) throw new UserError("Not allowed");
  const c = await one<ContractView>(`select * from contracts where id = $1`, [contractId]);
  if (!c || c.status !== "disputed") throw new UserError("Dispute not found");
  if (outcome === "refund") {
    const [order] = await q<{ id: string }>(`select id from orders where contract_id = $1 and status = 'paid' limit 1`, [contractId]);
    if (order) await refundOrder(actor.id, order.id, { bySystem: true });
  }
  await tx(async (db) => {
    await db.query(`update contracts set status = $2, resolution = $3, updated_at = now() where id = $1`, [contractId, outcome === "refund" ? "cancelled" : "completed", note.slice(0, 1000)]);
    await event(db, contractId, actor.id, "resolved", outcome === "refund" ? `Dispute resolved: buyer refunded. ${note}` : `Dispute resolved: work accepted. ${note}`);
    for (const u of [c.buyer_id, c.seller_id]) if (u) await notify(db, { userId: u, kind: "contract", body: `Dispute on “${c.title}” was resolved.` });
    await audit(db, actor.id, `dispute.${outcome}`, contractId);
  });
}

export async function openDisputes(role: PlatformRole) {
  if (!canOnPlatform(role, "resolve_reports")) return [];
  return q<ContractView>(
    `select c.*, bp.handle as buyer_handle, sp.handle as seller_handle from contracts c
       left join profiles bp on bp.user_id = c.buyer_id left join profiles sp on sp.user_id = c.seller_id
      where c.status = 'disputed' order by c.updated_at asc`,
  );
}

export async function myContracts(userId: string) {
  return q<ContractView>(
    `select c.*, bp.handle as buyer_handle, sp.handle as seller_handle from contracts c
       left join profiles bp on bp.user_id = c.buyer_id left join profiles sp on sp.user_id = c.seller_id
      where c.buyer_id = $1 or c.seller_id = $1 order by c.updated_at desc`,
    [userId],
  );
}

export async function getContract(userId: string, contractId: string) {
  const contract = await one<ContractView>(
    `select c.*, bp.handle as buyer_handle, sp.handle as seller_handle from contracts c
       left join profiles bp on bp.user_id = c.buyer_id left join profiles sp on sp.user_id = c.seller_id
      where c.id = $1 and (c.buyer_id = $2 or c.seller_id = $2)`,
    [contractId, userId],
  );
  if (!contract) return null;
  const [events, myReview] = await Promise.all([
    q<{ id: number; kind: string; message: string; created_at: Date; handle: string | null }>(
      `select e.id, e.kind, e.message, e.created_at, p.handle from contract_events e left join profiles p on p.user_id = e.actor_id where e.contract_id = $1 order by e.id`,
      [contractId],
    ),
    one<{ rating: number }>(`select rating from reviews where contract_id = $1 and author_id = $2`, [contractId, userId]),
  ]);
  return { contract, events, reviewed: !!myReview };
}

/** Reviews are only accepted for completed contracts, once per party. */
export async function leaveReview(authorId: string, contractId: string, rating: number, body: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new UserError("Choose a rating from 1 to 5");
  await tx(async (db) => {
    const c = await lockContract(db, contractId, authorId);
    if (c.status !== "completed") throw new UserError("You can review once the contract is completed");
    const subject = c.buyer_id === authorId ? c.seller_id : c.buyer_id;
    if (!subject) throw new UserError("The other party no longer exists");
    const rows = await db.query(
      `insert into reviews (contract_id, author_id, subject_id, service_id, rating, body) values ($1, $2, $3, $4, $5, $6) on conflict do nothing returning 1`,
      // Only the buyer's review counts toward the service's rating.
      [contractId, authorId, subject, c.buyer_id === authorId ? c.service_id : null, rating, body.trim().slice(0, 1000)],
    );
    if (!rows.length) throw new UserError("You've already reviewed this contract");
  });
}
