import { afterAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/accounts";
import { createMission, decideApproval, getMission, runMission, setAgentsHalted, setMissionState, retryTask } from "@/server/agents";
import { getInventory } from "@/server/integrations";
import { myProducts, saveStore } from "@/server/commerce";
import { resetDbForTests } from "@/server/db";

let n = 0;
async function user() {
  n += 1;
  const handle = `agent_user_${n}_${Math.random().toString(36).slice(2, 6)}`;
  return registerUser({ email: `${handle}@example.test`, password: "correct horse battery", handle, displayName: `Agent User ${n}` });
}

const base = { kind: "start_business" as "start_business" | "sell_existing", title: "Printable planners", brief: "Minimalist printable weekly planners for students", region: "Sweden", ownershipConfirmed: false };

afterAll(async () => {
  await resetDbForTests();
});

describe("agent runtime", () => {
  it("runs sell-existing missions end to end into the user's Hustera store", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, kind: "sell_existing", ownershipConfirmed: true, mode: "autonomous", totalCents: 500, perDayCents: 500, perTaskCents: 100 });
    await runMission(owner, id);
    let m = (await getMission(owner, id))!;
    const status = Object.fromEntries(m.tasks.map((t) => [t.key, t.status]));
    expect(status).toMatchObject({ research: "succeeded", offer: "succeeded", checklist: "succeeded", listing: "awaiting_approval", publish: "queued" });
    expect(m.artifacts).toHaveLength(3);
    expect(m.spend.settledCents).toBe(12 + 15 + 5);

    await decideApproval(owner, m.tasks.find((t) => t.key === "listing")!.id, true);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    const publish = m.tasks.find((t) => t.key === "publish")!;
    expect(publish.status).toBe("awaiting_approval");
    await decideApproval(owner, publish.id, true);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.tasks.find((t) => t.key === "publish")!.status).toBe("blocked");
    expect(m.tasks.find((t) => t.key === "publish")!.status_reason).toMatch(/Hustera store/);
    expect(m.mission.status).toBe("blocked");
    expect(m.events.some((e) => e.from_agent === "core" && e.to_agent === "research")).toBe(true);

    await saveStore(owner, { name: "Owner shop", slug: `shop-${Math.random().toString(36).slice(2, 8)}`, description: "", sellerLegalName: "Owner AB", sellerCountry: "SE", supportEmail: "help@example.test" });
    await retryTask(owner, publish.id);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.mission.status).toBe("completed");
    const products = await myProducts(owner);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({ status: "draft", source: "agent", mission_id: id });
  });

  it("generates an AI product, requires rights review and publishes it live", async () => {
    const owner = await user();
    await saveStore(owner, { name: "AI shop", slug: `ai-${Math.random().toString(36).slice(2, 8)}`, description: "", sellerLegalName: "AI Owner", sellerCountry: "SE", supportEmail: "help@example.test" });
    process.env.ANTHROPIC_API_KEY = "test-key";
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: "# Study planner guide\n\n" + "Plan your week in focused blocks. ".repeat(20) }], usage: { input_tokens: 800, output_tokens: 600 } }), { status: 200 })) as typeof fetch;
    try {
      const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 500, perDayCents: 500, perTaskCents: 100, priceCents: 1200 });
      await runMission(owner, id);
      let m = (await getMission(owner, id))!;
      expect(m.tasks.find((t) => t.key === "generate")!.status).toBe("succeeded");
      expect(m.artifacts.find((a) => a.kind === "product_content")!.simulated).toBe(false);
      const rights = m.tasks.find((t) => t.key === "rights")!;
      expect(rights.status).toBe("awaiting_approval");
      await decideApproval(owner, rights.id, true);
      await decideApproval(owner, m.tasks.find((t) => t.key === "listing")!.id, true);
      await runMission(owner, id);
      m = (await getMission(owner, id))!;
      await decideApproval(owner, m.tasks.find((t) => t.key === "publish")!.id, true);
      await runMission(owner, id);
      m = (await getMission(owner, id))!;
      expect(m.mission.status).toBe("completed");
      const [product] = await myProducts(owner);
      expect(product).toMatchObject({ status: "active", price_cents: 1200, kind: "digital" });
      expect(product!.delivery_content).toContain("Study planner guide");
    } finally {
      globalThis.fetch = realFetch;
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("blocks AI generation honestly when no model is configured", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 500, perDayCents: 500, perTaskCents: 100 });
    await runMission(owner, id);
    const m = (await getMission(owner, id))!;
    expect(m.tasks.find((t) => t.key === "generate")!.status).toBe("blocked");
    expect(m.tasks.find((t) => t.key === "generate")!.status_reason).toMatch(/CONNECT_REQUIRED/);
  });

  it("enforces budgets atomically and pauses the mission", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 30, perDayCents: 30, perTaskCents: 30 });
    await runMission(owner, id);
    const m = (await getMission(owner, id))!;
    // research reserves 20, settles 12; offer needs 20 → 12 + 20 > 30 is denied.
    expect(m.tasks.find((t) => t.key === "research")!.status).toBe("succeeded");
    expect(m.tasks.find((t) => t.key === "offer")!.status).toBe("blocked");
    expect(m.mission.status).toBe("paused");
    expect(m.spend.committedCents).toBeLessThanOrEqual(30);
    expect(m.events.some((e) => e.kind === "budget_denied")).toBe(true);
  });

  it("requires approval for every task in approve_each mode and supports stop", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, mode: "approve_each", totalCents: 500, perDayCents: 500, perTaskCents: 100 });
    await runMission(owner, id);
    let m = (await getMission(owner, id))!;
    expect(m.tasks[0]!.status).toBe("awaiting_approval");
    expect(m.artifacts).toHaveLength(0);
    await decideApproval(owner, m.tasks[0]!.id, false);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.mission.status).toBe("blocked");
    await setMissionState(owner, id, "stop");
    m = (await getMission(owner, id))!;
    expect(m.mission.status).toBe("stopped");
    expect(m.tasks.every((t) => t.status === "cancelled")).toBe(true);
  });

  it("isolates missions between users and honours the global kill switch", async () => {
    const owner = await user();
    const other = await user();
    const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 500, perDayCents: 500, perTaskCents: 100 });
    expect(await getMission(other, id)).toBeNull();
    await expect(runMission(other, id)).rejects.toThrow(/not found/);
    await expect(setAgentsHalted({ id: other, role: "user" }, true)).rejects.toThrow();
    await setAgentsHalted({ id: other, role: "admin" }, true);
    await expect(runMission(owner, id)).rejects.toThrow(/paused by Hustera administrators/);
    await setAgentsHalted({ id: other, role: "admin" }, false);
    await runMission(owner, id);
    expect((await getMission(owner, id))!.artifacts.length).toBeGreaterThan(0);
  });

  it("lets the owner retry a blocked task after a resume", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 30, perDayCents: 30, perTaskCents: 30 });
    await runMission(owner, id);
    const offer = (await getMission(owner, id))!.tasks.find((t) => t.key === "offer")!;
    await retryTask(owner, offer.id);
    await runMission(owner, id);
    expect((await getMission(owner, id))!.tasks.find((t) => t.key === "offer")!.status).toBe("blocked");
  });
});

describe("integration inventory", () => {
  it("reports Composio as not configured without a key", async () => {
    const inv = await getInventory({ apiKey: "" });
    expect(inv.composio.configured).toBe(false);
    expect(inv.capabilities.find((c) => c.id.startsWith("composio.publish_listing"))!.status).toBe("CONNECT_REQUIRED");
  });

  it("lists Composio toolkits as CONNECT_REQUIRED and reports errors", async () => {
    const ok = (async () => new Response(JSON.stringify({ items: [{ slug: "shopify", name: "Shopify" }] }), { status: 200 })) as unknown as typeof fetch;
    const inv = await getInventory({ apiKey: "test", fetchImpl: ok });
    expect(inv.composio.reachable).toBe(true);
    expect(inv.capabilities.find((c) => c.id === "composio:shopify")!.status).toBe("CONNECT_REQUIRED");
    const bad = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
    const inv2 = await getInventory({ apiKey: "test", fetchImpl: bad });
    expect(inv2.composio.reachable).toBe(false);
    expect(inv2.composio.error).toMatch(/401/);
  });
});
