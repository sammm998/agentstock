import { afterAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/accounts";
import { createMission, decideApproval, getMission, runMission, setAgentsHalted, setMissionState, retryTask } from "@/server/agents";
import { getInventory } from "@/server/integrations";
import { resetDbForTests } from "@/server/db";

let n = 0;
async function user() {
  n += 1;
  const handle = `agent_user_${n}_${Math.random().toString(36).slice(2, 6)}`;
  return registerUser({ email: `${handle}@example.test`, password: "correct horse battery", handle, displayName: `Agent User ${n}` });
}

const base = { kind: "start_business" as const, title: "Printable planners", brief: "Minimalist printable weekly planners for students", region: "Sweden", ownershipConfirmed: false };

afterAll(async () => {
  await resetDbForTests();
});

describe("agent runtime", () => {
  it("runs sandbox tasks autonomously, asks approval for listings and blocks on unconnected publishing", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...base, mode: "autonomous", totalCents: 500, perDayCents: 500, perTaskCents: 100 });
    await runMission(owner, id);
    let m = (await getMission(owner, id))!;
    const status = Object.fromEntries(m.tasks.map((t) => [t.key, t.status]));
    expect(status).toMatchObject({ research: "succeeded", offer: "succeeded", checklist: "succeeded", listing: "awaiting_approval", publish: "queued" });
    expect(m.artifacts).toHaveLength(3);
    expect(m.artifacts.every((a) => a.simulated)).toBe(true);
    expect(m.spend.settledCents).toBe(12 + 15 + 5);

    await decideApproval(owner, m.tasks.find((t) => t.key === "listing")!.id, true);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.tasks.find((t) => t.key === "listing")!.status).toBe("succeeded");
    // Publishing needs approval too, then is blocked because no channel is connected.
    const publish = m.tasks.find((t) => t.key === "publish")!;
    expect(publish.status).toBe("awaiting_approval");
    await decideApproval(owner, publish.id, true);
    await runMission(owner, id);
    m = (await getMission(owner, id))!;
    expect(m.tasks.find((t) => t.key === "publish")!.status).toBe("blocked");
    expect(m.tasks.find((t) => t.key === "publish")!.status_reason).toMatch(/CONNECT_REQUIRED/);
    expect(m.mission.status).toBe("blocked");
    expect(m.events.some((e) => e.from_agent === "core" && e.to_agent === "research")).toBe(true);
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
    expect(inv.capabilities.find((c) => c.id.startsWith("channel.publish_listing"))!.status).toBe("CONNECT_REQUIRED");
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
