import { afterAll, describe, expect, it } from "vitest";
import { registerUser } from "@/server/accounts";
import { createMission, decideApproval, getMission, runMission } from "@/server/agents";
import { createProduct, myProducts, saveStore } from "@/server/commerce";
import { profilePosts } from "@/server/social";
import { q, resetDbForTests } from "@/server/db";
import { setPriceFetcher } from "@/server/tools/markets";
import { GET as go } from "@/app/go/[slug]/route";

let n = 0;
async function user(admin = false) {
  n += 1;
  const handle = `net_${n}_${Math.random().toString(36).slice(2, 6)}`;
  const id = await registerUser({ email: `${handle}@example.test`, password: "correct horse battery", handle, displayName: `Net ${n}` });
  if (admin) await q(`update users set platform_role = 'admin' where id = $1`, [id]);
  return id;
}
const budget = { region: "Sweden", mode: "autonomous" as const, totalCents: 500, perDayCents: 500, perTaskCents: 100, ownershipConfirmed: true };
const store = (owner: string) => saveStore(owner, { name: "Net shop", slug: `net-${Math.random().toString(36).slice(2, 8)}`, description: "", sellerLegalName: "Net Owner", sellerCountry: "SE", supportEmail: "help@example.test" });

async function approveAll(owner: string, id: string) {
  for (let i = 0; i < 12; i++) {
    await runMission(owner, id);
    const m = (await getMission(owner, id))!;
    const waiting = m.tasks.filter((t) => t.status === "awaiting_approval");
    if (!waiting.length) return m;
    for (const t of waiting) await decideApproval(owner, t.id, true);
  }
  return (await getMission(owner, id))!;
}

afterAll(async () => {
  setPriceFetcher(null);
  await resetDbForTests();
});

describe("agent network", () => {
  it("DropForge scores products, launches the winner and auto-posts a campaign", async () => {
    const owner = await user();
    await store(owner);
    const id = await createMission(owner, {
      ...budget, kind: "dropforge", title: "DropForge: Home fitness", brief: "Dropshipping in home fitness", priceCents: 900,
      params: { niche: "Home fitness", candidates: "Resistance bands set | 4 | 24.90 | 7\nYoga mat | 12 | 15 | 20\nBroken item | 30 | 10 | 5" },
    });
    const m = await approveAll(owner, id);
    expect(m.mission.status).toBe("completed");
    expect(m.artifacts.find((a) => a.kind === "product_scout")!.content).toContain("Winner: Resistance bands set");
    const [product] = await myProducts(owner);
    expect(product).toMatchObject({ title: "Resistance bands set", price_cents: 2490, kind: "physical", status: "active" });
    expect((await profilePosts(owner, owner)).length).toBeGreaterThan(0);
  });

  it("DropForge stops when no candidate makes money", async () => {
    const owner = await user();
    const id = await createMission(owner, { ...budget, kind: "dropforge", title: "Bad", brief: "No margin products here", params: { niche: "Gadgets", candidates: "Gadget | 30 | 20 | 5" } });
    await runMission(owner, id);
    const m = (await getMission(owner, id))!;
    expect(m.tasks.find((t) => t.key === "scout")!.status).toBe("blocked");
  });

  it("LinkLoom creates tracked links, counts clicks and reports them", async () => {
    const owner = await user();
    const id = await createMission(owner, {
      ...budget, kind: "linkloom", title: "LinkLoom", brief: "Affiliate site for home office gear",
      params: { network: "amazon:tech-desk", links: "Standing desk | https://example.com/desk?tag=x\nnot a link | http://bad" },
    });
    const m = await approveAll(owner, id);
    const [link] = await q<{ slug: string; destination: string }>(`select slug, destination from affiliate_links where mission_id = $1`, [id]);
    expect(link!.destination).toBe("https://example.com/desk?tag=x");
    const res = await go(new Request(`http://localhost/go/${link!.slug}`), { params: Promise.resolve({ slug: link!.slug }) });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/desk?tag=x");
    const [c] = await q<{ n: number }>(`select count(*)::int as n from affiliate_clicks`);
    expect(c!.n).toBe(1);
    expect(m.artifacts.some((a) => a.content.includes(`/go/${link!.slug}`))).toBe(true);
  });

  it("CryptoPulse trades a paper portfolio from live prices and never trades real money", async () => {
    const owner = await user();
    let px = 100;
    // Steady uptrend with pullbacks (RSI ≈ 67): SMA7 above SMA21, not overbought.
    const up = Array.from({ length: 31 }, (_, i) => [i * 86400_000, (px += i % 2 ? -1 : 2)] as [number, number]);
    setPriceFetcher(async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify({ prices: url.includes("bitcoin") ? up : [] }) }));
    const id = await createMission(owner, { ...budget, kind: "cryptopulse", title: "CryptoPulse", brief: "Trade my watchlist", params: { watchlist: "bitcoin, nocoin", risk: "medium" } });
    const m = await approveAll(owner, id);
    expect(m.mission.status).toBe("completed");
    const [pf] = await q<{ id: string; cash_cents: string }>(`select id, cash_cents from paper_portfolios where mission_id = $1`, [id]);
    const trades = await q<{ symbol: string; side: string }>(`select symbol, side from paper_trades where portfolio_id = $1`, [pf!.id]);
    expect(trades).toEqual([{ symbol: "bitcoin", side: "buy" }]);
    expect(Number(pf!.cash_cents)).toBeLessThan(1_000_000);
    const [note] = await q<{ n: number }>(`select count(*)::int as n from notifications where user_id = $1 and kind = 'trade'`, [owner]);
    expect(note!.n).toBe(1);

    process.env.HUSTERA_LIVE_TRADING = "true";
    try {
      const id2 = await createMission(owner, { ...budget, kind: "cryptopulse", title: "Live", brief: "Try live trading", params: { watchlist: "bitcoin", risk: "low" } });
      await runMission(owner, id2);
      const m2 = (await getMission(owner, id2))!;
      expect(m2.tasks.find((t) => t.key === "trade")!.status).toBe("blocked");
    } finally {
      delete process.env.HUSTERA_LIVE_TRADING;
    }
  });

  it("only admins can run the Hustera Fund and partner agents cannot be launched as missions", async () => {
    const owner = await user();
    await expect(createMission(owner, { ...budget, kind: "hustera-fund", title: "Fund", brief: "Run the fund please", params: { watchlist: "bitcoin" } })).rejects.toThrow(/Hustera team/);
    await expect(createMission(owner, { ...budget, kind: "replyr", title: "Replyr", brief: "Partner agent mission" })).rejects.toThrow(/Unknown agent/);
    const admin = await user(true);
    await expect(createMission(admin, { ...budget, kind: "hustera-fund", title: "Fund", brief: "Run the fund please", params: { watchlist: "bitcoin" } })).resolves.toBeTruthy();
  });

  it("PageSmith publishes a landing page for a live product", async () => {
    const owner = await user();
    await store(owner);
    const productId = await createProduct(owner, { title: "Habit tracker", description: "A printable habit tracker. Track ten habits a day. Undated pages.", kind: "digital", priceCents: 500, deliveryContent: "https://files.example.test/h.pdf", ownershipConfirmed: true });
    await q(`update products set status = 'active' where id = $1`, [productId]);
    const id = await createMission(owner, { ...budget, kind: "pagesmith", title: "Page", brief: "Landing page for my tracker", productId, params: { audience: "Students" } });
    const m = await approveAll(owner, id);
    expect(m.mission.status).toBe("completed");
    const [page] = await q<{ status: string; slug: string }>(`select status, slug from landing_pages where mission_id = $1`, [id]);
    expect(page!.status).toBe("published");
  });

  it("TubeEngine, RankRiver, MailMint, AdCraft and GigMatch run without an AI key", async () => {
    const owner = await user();
    await store(owner);
    const productId = await createProduct(owner, { title: "Budget planner", description: "A monthly budget planner.", kind: "digital", priceCents: 500, deliveryContent: "https://files.example.test/b.pdf", ownershipConfirmed: true });
    await q(`update products set status = 'active' where id = $1`, [productId]);
    const runs: [string, Record<string, string>, string | null][] = [
      ["tubeengine", { niche: "Home cooking", format: "faceless" }, null],
      ["rankriver", {}, null],
      ["mailmint", { goal: "launch" }, productId],
      ["adcraft", {}, productId],
      ["gigmatch", {}, null],
    ];
    for (const [kind, params, pid] of runs) {
      const id = await createMission(owner, { ...budget, kind, title: `${kind} run`, brief: "Logo design and Canva brand kits for small shops", productId: pid, params });
      const m = await approveAll(owner, id);
      expect(m.mission.status, kind).toBe("completed");
    }
    const [svc] = await q<{ n: number }>(`select count(*)::int as n from services where seller_id = $1`, [owner]);
    expect(svc!.n).toBe(1);
  });
});
