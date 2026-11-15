import { describe, expect, it } from "vitest";
import { AFFILIATE_NETWORKS, findNiche, parseAffiliateLines, planOrders, rsi, signalFor, sma } from "../src";

const trend = (start: number, steps: number[]) => steps.reduce<number[]>((a, d) => [...a, a[a.length - 1]! + d], [start]);

describe("trading strategy", () => {
  it("computes indicators", () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(sma([1], 2)).toBeNull();
    expect(rsi(trend(100, Array(20).fill(1)))).toBe(100);
  });

  it("buys healthy uptrends, sells downtrends and overbought markets", () => {
    const healthy = trend(100, Array.from({ length: 30 }, (_, i) => (i % 2 ? -1 : 2)));
    expect(signalFor("x", healthy).action).toBe("buy");
    expect(signalFor("x", trend(200, Array(30).fill(-2))).action).toBe("sell");
    expect(signalFor("x", trend(100, Array(30).fill(2))).action).toBe("sell");
    expect(signalFor("x", [1, 2, 3]).action).toBe("hold");
  });

  it("sizes positions, applies stop losses and halts buying after max drawdown", () => {
    const buy = { symbol: "a", price: 10, smaFast: 1, smaSlow: 0, rsi: 50, volatility: 1, action: "buy" as const, reason: "up" };
    const [o] = planOrders({ cash: 1000, positions: [], signals: [buy], risk: "low", startValue: 1000 });
    expect(o).toMatchObject({ side: "buy", qty: 10 }); // 10% of 1000 at 10
    const stop = planOrders({ cash: 0, positions: [{ symbol: "a", qty: 10, avgPrice: 20 }], signals: [{ ...buy, price: 15 }], risk: "low", startValue: 1000 });
    expect(stop[0]).toMatchObject({ side: "sell", qty: 10 });
    expect(stop[0]!.reason).toMatch(/Stop loss/);
    expect(planOrders({ cash: 800, positions: [], signals: [buy], risk: "low", startValue: 1000 })).toEqual([]);
  });
});

describe("affiliate catalog", () => {
  it("has networks with niches, keywords and disclosures", () => {
    expect(AFFILIATE_NETWORKS.length).toBeGreaterThanOrEqual(6);
    for (const n of AFFILIATE_NETWORKS) {
      expect(n.disclosure.length).toBeGreaterThan(10);
      for (const x of n.niches) expect(findNiche(`${n.id}:${x.id}`)?.niche.keywords.length).toBeGreaterThan(0);
    }
    expect(findNiche("nope:x")).toBeNull();
    expect(parseAffiliateLines("Desk | https://a.example/x\nBad | http://b\nno pipe")).toEqual([{ name: "Desk", url: "https://a.example/x" }]);
  });
});
