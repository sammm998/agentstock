import { afterAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/accounts";
import { createMission, decideApproval, getMission, runMission } from "@/server/agents";
import { buyProduct, createProduct, financials, myProducts, orderByToken, recordPaymentLinkSale, saveStore, setProductStatus } from "@/server/commerce";
import { devOutbox } from "@/server/email";
import { q, resetDbForTests } from "@/server/db";

let n = 0;
async function user(admin = false) {
  n += 1;
  const handle = `stripe_${n}_${Math.random().toString(36).slice(2, 6)}`;
  const email = `${handle}@example.test`;
  if (admin) process.env.HUSTERA_ADMIN_EMAILS = email;
  const id = await registerUser({ email, password: "correct horse battery", handle, displayName: `Stripe ${n}` });
  process.env.HUSTERA_ADMIN_EMAILS = "";
  await saveStore(id, { name: "Shop", slug: `st-${Math.random().toString(36).slice(2, 8)}`, description: "", sellerLegalName: "Seller", sellerCountry: "SE", supportEmail: "help@example.test" });
  return id;
}

const base = { kind: "sell_existing" as const, title: "Budget meal planner", brief: "A printable 4-week budget meal planner.", region: "Sweden", ownershipConfirmed: true, mode: "autonomous" as const, totalCents: 500, perDayCents: 500, perTaskCents: 100, priceCents: 790, productKind: "digital" as const, deliveryContent: "https://files.example.test/plan.pdf" };

function stripeMock(calls: { path: string; body: string }[]) {
  return (async (url: string | URL, init?: RequestInit) => {
    const u = new URL(String(url));
    if (u.hostname !== "api.stripe.com") return new Response("unexpected", { status: 500 });
    const path = u.pathname.replace("/v1", "");
    calls.push({ path, body: String(init?.body ?? u.search) });
    const json = (d: unknown) => new Response(JSON.stringify(d), { status: 200 });
    if (path === "/products") return json({ id: "prod_123", livemode: false });
    if (path === "/prices") return json({ id: "price_123" });
    if (path === "/payment_links") return json({ id: "plink_123", url: "https://buy.stripe.com/test_abc" });
    if (path === "/balance") return json({ livemode: false, available: [{ amount: 1550, currency: "eur" }], pending: [{ amount: 790, currency: "eur" }] });
    if (path === "/charges") return json({ data: [{ id: "ch_1", amount: 790, currency: "eur", status: "succeeded", paid: true, refunded: false, description: "Budget meal planner", created: 1 }] });
    return new Response(JSON.stringify({ error: { message: "nope" } }), { status: 404 });
  }) as typeof fetch;
}

async function approveAll(owner: string, id: string) {
  for (let i = 0; i < 6; i++) {
    await runMission(owner, id);
    const m = (await getMission(owner, id))!;
    const waiting = m.tasks.filter((t) => t.status === "awaiting_approval");
    if (!waiting.length) return m;
    for (const t of waiting) await decideApproval(owner, t.id, true);
  }
  return (await getMission(owner, id))!;
}

afterAll(async () => {
  await resetDbForTests();
});

describe("Stripe agents", () => {
  it("EcomPro creates a Stripe payment link for the owner's product and records link sales", async () => {
    const owner = await user(true);
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    process.env.HUSTERA_BASE_URL = "https://hustera.example";
    const calls: { path: string; body: string }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = stripeMock(calls);
    try {
      const id = await createMission(owner, { ...base, agentId: "ecompro" });
      const m = await approveAll(owner, id);
      expect(m.mission.status).toBe("completed");
      expect(m.artifacts.find((a) => a.kind === "payment_link")!.content).toContain("https://buy.stripe.com/test_abc");
      const [product] = await myProducts(owner);
      expect(product).toMatchObject({ stripe_payment_link_url: "https://buy.stripe.com/test_abc" });
      const link = calls.find((c) => c.path === "/payment_links")!;
      expect(decodeURIComponent(link.body)).toContain("https://hustera.example/orders/stripe/{CHECKOUT_SESSION_ID}");
      expect(decodeURIComponent(calls.find((c) => c.path === "/prices")!.body)).toContain("unit_amount=790");

      // What the verified webhook does when someone pays through the link.
      const orderId = await recordPaymentLinkSale({ sessionId: "cs_test_1", paymentIntentId: "pi_1", amountCents: 790, currency: "eur", email: "buyer@example.test", livemode: false, paymentLinkId: "plink_123", feeCents: 37 }, "https://hustera.example");
      expect(orderId).toBeTruthy();
      expect(await recordPaymentLinkSale({ sessionId: "cs_test_1", paymentIntentId: "pi_1", amountCents: 790, currency: "eur", email: "buyer@example.test", livemode: false, paymentLinkId: "plink_123", feeCents: 37 }, "https://hustera.example")).toBe(orderId);
      const mail = (await devOutbox()).find((x) => x.to_email === "buyer@example.test")!;
      const token = mail.body.match(/\/orders\/([\w-]+)/)![1]!;
      const order = (await orderByToken(token))!;
      expect(order).toMatchObject({ status: "paid", provider: "stripe", simulated: true, amount_cents: 790 });
      expect(order.delivery_content).toContain("plan.pdf");
      expect((await financials(owner, true)).inputs).toMatchObject({ revenueCents: 790, paymentFeesCents: 37 });
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.HUSTERA_BASE_URL;
    }
  });

  it("keeps other sellers off the operator's Stripe account", async () => {
    const seller = await user(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    process.env.HUSTERA_BASE_URL = "https://hustera.example";
    const calls: { path: string; body: string }[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = stripeMock(calls);
    try {
      const id = await createMission(seller, { ...base, agentId: "ecompro" });
      const m = await approveAll(seller, id);
      expect(m.artifacts.find((a) => a.title === "Stripe payment link")!.kind).toBe("skipped");
      expect(calls).toHaveLength(0);
      // Checkout falls back to the labelled test provider instead of routing money to the operator.
      const productId = await createProduct(seller, { title: "Other planner", description: "Another printable planner", kind: "digital", priceCents: 500, deliveryContent: "https://x.example/p.pdf", ownershipConfirmed: true });
      await setProductStatus(seller, productId, "active");
      const buyer = await user(false);
      const { redirectUrl } = await buyProduct(productId, { id: buyer, email: "b@example.test" }, true, "https://hustera.example");
      expect(redirectUrl).toMatch(/^\/checkout\/test\//);
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.HUSTERA_BASE_URL;
    }
  });

  it("RevenueDesk reports ledger results, with Stripe balance when connected", async () => {
    const owner = await user(true);
    await q(`select 1`);
    const id1 = await createMission(owner, { ...base, kind: "revenue_report", title: "Revenue report", brief: "Report my verified revenue.", agentId: "finance" });
    await runMission(owner, id1);
    let m = (await getMission(owner, id1))!;
    expect(m.mission.status).toBe("completed");
    expect(m.artifacts[0]!.content).toContain("Not connected");

    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    const realFetch = globalThis.fetch;
    globalThis.fetch = stripeMock([]);
    try {
      const id2 = await createMission(owner, { ...base, kind: "revenue_report", title: "Revenue report", brief: "Report my verified revenue.", agentId: "finance" });
      await runMission(owner, id2);
      m = (await getMission(owner, id2))!;
      expect(m.artifacts[0]!.content).toContain("Available: €15.50");
      expect(m.artifacts[0]!.content).toContain("Budget meal planner");
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it("runs recurring report missions on schedule", async () => {
    const { startDueRecurringMissions } = await import("@/server/agents");
    const owner = await user(true);
    const id = await createMission(owner, { ...base, kind: "revenue_report", title: "Revenue report", brief: "Report my verified revenue.", agentId: "finance", repeatHours: 24 });
    await runMission(owner, id);
    let m = (await getMission(owner, id))!;
    expect(m.mission.status).toBe("completed");
    expect(m.mission.next_run_at).not.toBeNull();
    expect((await startDueRecurringMissions()).some((x) => x.id === id)).toBe(false);
    await q(`update missions set next_run_at = now() - interval '1 minute' where id = $1`, [id]);
    expect((await startDueRecurringMissions()).some((x) => x.id === id)).toBe(true);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.mission.status).toBe("completed");
    expect(m.artifacts.filter((a) => a.kind === "revenue_report")).toHaveLength(2);
  });
});
