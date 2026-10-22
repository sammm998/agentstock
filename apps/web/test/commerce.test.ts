import { afterAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/accounts";
import {
  buyProduct,
  completeTestCheckout,
  createProduct,
  financials,
  importFromUrl,
  ledgerEntries,
  markOrderPaid,
  myProducts,
  orderByToken,
  recordCost,
  recordPaymentEvent,
  refundOrder,
  saveStore,
  setProductStatus,
} from "@/server/commerce";
import { cancelContract, createService, deliver, getService, leaveReview, listServices, myContracts, openDispute, payContract, requestContract, resolveDispute, respondToRequest, reviewDelivery } from "@/server/marketplace";
import { authConfigs, confirmConnection, executeComposioTool, myConnections, startConnection } from "@/server/composio";
import { q, resetDbForTests } from "@/server/db";
import { simulatedFee } from "@hustera/domain";

let n = 0;
async function user() {
  n += 1;
  const handle = `shop_user_${n}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${handle}@example.test`;
  const id = await registerUser({ email, password: "correct horse battery", handle, displayName: `Shop User ${n}` });
  return { id, email };
}

async function seller() {
  const u = await user();
  await saveStore(u.id, { name: "Test shop", slug: `shop-${Math.random().toString(36).slice(2, 8)}`, description: "", sellerLegalName: "Test Seller AB", sellerCountry: "SE", supportEmail: "help@example.test" });
  return u;
}

async function product(ownerId: string, price = 1000) {
  const id = await createProduct(ownerId, { title: "Weekly planner", description: "A printable weekly planner PDF", kind: "digital", priceCents: price, deliveryContent: "https://files.example.test/planner.pdf", ownershipConfirmed: true });
  await setProductStatus(ownerId, id, "active");
  return id;
}

afterAll(async () => {
  await resetDbForTests();
});

describe("store and products", () => {
  it("requires a store, ownership and delivery content before publishing", async () => {
    const u = await user();
    await expect(createProduct(u.id, { title: "X product", description: "Something to sell", kind: "digital", priceCents: 500, deliveryContent: "", ownershipConfirmed: true })).rejects.toThrow(/store/);
    const s = await seller();
    const id = await createProduct(s.id, { title: "Empty digital", description: "No file yet", kind: "digital", priceCents: 500, deliveryContent: "", ownershipConfirmed: true });
    await expect(setProductStatus(s.id, id, "active")).rejects.toThrow(/delivery content/);
    await expect(setProductStatus(u.id, id, "active")).rejects.toThrow(/not found/);
  });

  it("imports product details from public https pages only", async () => {
    const html = `<html><head><meta property="og:title" content="Planner"><meta property="og:description" content="Nice planner"></head></html>`;
    const fetchOk = (async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
    expect(await importFromUrl("https://shop.example.com/p/1", fetchOk, async () => ["93.184.216.34"])).toMatchObject({ title: "Planner", description: "Nice planner" });
    await expect(importFromUrl("http://shop.example.com/p/1", fetchOk, async () => ["93.184.216.34"])).rejects.toThrow(/https/);
    await expect(importFromUrl("https://internal.example.com/", fetchOk, async () => ["10.0.0.5"])).rejects.toThrow(/can't be imported/);
    await expect(importFromUrl("https://metadata.example.com/", fetchOk, async () => ["169.254.169.254"])).rejects.toThrow(/can't be imported/);
  });
});

describe("orders, ledger and refunds", () => {
  it("runs a test checkout, delivers digitally and books a balanced sale", async () => {
    const s = await seller();
    const productId = await product(s.id, 1999);
    const buyer = await user();
    await expect(buyProduct(productId, { id: buyer.id, email: buyer.email }, false, "http://localhost")).rejects.toThrow(/withdrawal/);
    await expect(buyProduct(productId, { id: s.id, email: s.email }, true, "http://localhost")).rejects.toThrow(/yourself/);
    const { redirectUrl } = await buyProduct(productId, { id: buyer.id, email: buyer.email }, true, "http://localhost");
    const token = redirectUrl.split("/").pop()!;
    expect((await orderByToken(token))!.status).toBe("pending");

    await completeTestCheckout(token);
    const order = (await orderByToken(token))!;
    expect(order.status).toBe("paid");
    expect(order.simulated).toBe(true);
    expect(order.delivery_content).toContain("planner.pdf");

    // Idempotent: a duplicate payment confirmation does not double-book.
    expect(await markOrderPaid(order.id, { paymentId: "dup", feeCents: 0 })).toBe(false);

    const entries = await ledgerEntries(s.id);
    expect(entries.reduce((sum, e) => sum + e.amount_cents, 0)).toBe(0);
    const fin = await financials(s.id, true);
    expect(fin.inputs.revenueCents).toBe(1999);
    expect(fin.inputs.paymentFeesCents).toBe(simulatedFee(1999));
    expect((await financials(s.id, false)).hasEntries).toBe(false);

    await refundOrder(s.id, order.id);
    expect((await orderByToken(token))!.status).toBe("refunded");
    const after = await financials(s.id, true);
    expect(after.inputs.refundsCents).toBe(1999);
    expect(after.settlement.platformFeeCents).toBe(0);
    await expect(refundOrder(buyer.id, order.id)).rejects.toThrow(/not found/);
  });

  it("records costs in the real ledger and computes a settlement preview", async () => {
    const s = await seller();
    await recordCost(s.id, { category: "advertising", amountCents: 500, memo: "Test ads" });
    const fin = await financials(s.id, false);
    expect(fin.inputs.advertisingCents).toBe(500);
    expect(fin.settlement.platformFeeCents).toBe(0);
    expect(fin.settlement.lossCarryforwardCents).toBe(500);
  });

  it("deduplicates payment webhook events", async () => {
    expect(await recordPaymentEvent("stripe", "evt_1", "checkout.session.completed")).toBe(true);
    expect(await recordPaymentEvent("stripe", "evt_1", "checkout.session.completed")).toBe(false);
  });
});

describe("marketplace contracts", () => {
  async function setup(revisions = 1) {
    const s = await user();
    const b = await user();
    const serviceId = await createService(s.id, { title: "Logo design pack", description: "Three original logo concepts", category: "Graphic design", priceCents: 5000, deliveryDays: 5, revisions, aiAssisted: true });
    const contractId = await requestContract(b.id, serviceId, "A logo for my printables shop, minimal style");
    return { s, b, serviceId, contractId };
  }

  it("runs request → accept → pay → deliver → revise → complete → review", async () => {
    const { s, b, serviceId, contractId } = await setup(1);
    await expect(respondToRequest(b.id, contractId, true)).rejects.toThrow(/seller/);
    await respondToRequest(s.id, contractId, true);
    const { redirectUrl } = await payContract(b.id, contractId, b.email, "http://localhost");
    await completeTestCheckout(redirectUrl.split("/").pop()!);
    expect((await myContracts(b.id)).find((c) => c.id === contractId)!.status).toBe("in_progress");

    await expect(leaveReview(b.id, contractId, 5, "Great")).rejects.toThrow(/completed/);
    await deliver(s.id, contractId, "Concepts: https://files.example.test/logos.zip");
    await reviewDelivery(b.id, contractId, "revise", "Darker colours please");
    await deliver(s.id, contractId, "Updated: https://files.example.test/logos-v2.zip");
    await expect(reviewDelivery(b.id, contractId, "revise")).rejects.toThrow(/No revisions left/);
    await reviewDelivery(b.id, contractId, "accept");
    await leaveReview(b.id, contractId, 5, "Fast and friendly");
    await expect(leaveReview(b.id, contractId, 4, "again")).rejects.toThrow(/already/);
    await leaveReview(s.id, contractId, 5, "Clear brief");

    const service = (await getService(serviceId))!;
    expect(service.review_count).toBe(1);
    expect(service.rating_avg).toBe(5);
    expect(service.completed).toBe(1);
    expect((await listServices({ category: "Graphic design" })).some((x) => x.id === serviceId)).toBe(true);
  });

  it("lets moderators resolve disputes with a refund", async () => {
    const { s, b, contractId } = await setup(0);
    await respondToRequest(s.id, contractId, true);
    const { redirectUrl } = await payContract(b.id, contractId, b.email, "http://localhost");
    await completeTestCheckout(redirectUrl.split("/").pop()!);
    await openDispute(b.id, contractId, "Seller has not responded for two weeks");
    const admin = await user();
    await expect(resolveDispute({ id: admin.id, role: "user" }, contractId, "refund", "")).rejects.toThrow();
    await resolveDispute({ id: admin.id, role: "admin" }, contractId, "refund", "No delivery");
    const [order] = await q<{ status: string }>(`select status from orders where contract_id = $1`, [contractId]);
    expect(order!.status).toBe("refunded");
    expect((await myContracts(b.id)).find((c) => c.id === contractId)!.status).toBe("cancelled");
  });

  it("allows cancelling before payment only", async () => {
    const { s, b, contractId } = await setup();
    await cancelContract(b.id, contractId);
    await expect(respondToRequest(s.id, contractId, true)).rejects.toThrow(/cancelled/);
  });
});

describe("composio client", () => {
  it("starts, confirms and uses a per-user connection", async () => {
    const u = await user();
    process.env.COMPOSIO_API_KEY = "test";
    process.env.COMPOSIO_AUTH_CONFIGS = JSON.stringify({ shopify: "ac_123" });
    const calls: { url: string; body: unknown }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (url.endsWith("/api/v3/connected_accounts")) return new Response(JSON.stringify({ id: "ca_1", redirect_url: "https://connect.example/ca_1" }));
      if (url.includes("/api/v3/connected_accounts/ca_1")) return new Response(JSON.stringify({ status: "ACTIVE" }));
      return new Response(JSON.stringify({ successful: true, data: { id: "prod_1" }, error: null }));
    }) as unknown as typeof fetch;
    try {
      expect(authConfigs()).toEqual({ shopify: "ac_123" });
      expect(await startConnection(u.id, "shopify", "http://localhost/cb", fake)).toBe("https://connect.example/ca_1");
      expect(calls[0]!.body).toEqual({ auth_config: { id: "ac_123" }, connection: { user_id: u.id, callback_url: "http://localhost/cb" } });
      expect((await myConnections(u.id))[0]!.status).toBe("pending");
      expect(await confirmConnection(u.id, "ca_1", fake)).toBe("active");
      const r = await executeComposioTool(u.id, "SHOPIFY_CREATE_PRODUCT", { title: "x" }, fake);
      expect(r).toEqual({ successful: true, data: { id: "prod_1" }, error: null });
      expect(calls[2]!.url).toContain("/api/v3/tools/execute/SHOPIFY_CREATE_PRODUCT");
      await expect(startConnection(u.id, "etsy", "http://localhost/cb", fake)).rejects.toThrow(/auth config/);
    } finally {
      delete process.env.COMPOSIO_API_KEY;
      delete process.env.COMPOSIO_AUTH_CONFIGS;
    }
  });
});

describe("product listing", () => {
  it("lists only the owner's products", async () => {
    const s = await seller();
    await product(s.id);
    const other = await seller();
    expect((await myProducts(s.id)).length).toBe(1);
    expect((await myProducts(other.id)).length).toBe(0);
  });
});
