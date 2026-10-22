import { describe, expect, it } from "vitest";
import { computeSettlement, costLines, isBalanced, isPrivateAddress, parseProductMeta, productSchema, refundLines, saleLines, simulatedFee } from "../src";

const zero = { revenueCents: 0, refundsCents: 0, paymentFeesCents: 0, cogsCents: 0, shippingCents: 0, advertisingCents: 0, toolsCents: 0, otherCents: 0, agentCostsCents: 0, lossCarryforwardCents: 0 };

describe("ledger", () => {
  it("produces balanced double-entry groups", () => {
    expect(isBalanced(saleLines(1999, simulatedFee(1999)))).toBe(true);
    expect(isBalanced(refundLines(1999))).toBe(true);
    expect(isBalanced(costLines("advertising", 500))).toBe(true);
    expect(isBalanced([{ account: "cash:provider", amountCents: 1 }])).toBe(false);
  });
});

describe("settlement", () => {
  it("charges 30% only on positive profit after costs", () => {
    const s = computeSettlement({ ...zero, revenueCents: 10_000, paymentFeesCents: 400, cogsCents: 2_600 });
    expect(s.netProfitCents).toBe(7_000);
    expect(s.platformFeeCents).toBe(2_100);
    expect(s.userShareCents).toBe(4_900);
  });

  it("never charges on losses and carries them forward", () => {
    const loss = computeSettlement({ ...zero, revenueCents: 1_000, advertisingCents: 3_000 });
    expect(loss.platformFeeCents).toBe(0);
    expect(loss.lossCarryforwardCents).toBe(2_000);
    const next = computeSettlement({ ...zero, revenueCents: 5_000, lossCarryforwardCents: 2_000 });
    expect(next.eligibleProfitCents).toBe(3_000);
    expect(next.platformFeeCents).toBe(900);
  });

  it("treats refunds as reducing profit, not revenue being profit", () => {
    expect(computeSettlement({ ...zero, revenueCents: 2_000, refundsCents: 2_000 }).platformFeeCents).toBe(0);
  });
});

describe("product rules", () => {
  it("requires ownership confirmation and sane prices", () => {
    const base = { title: "Planner", description: "Weekly printable planner", kind: "digital", priceCents: 900, deliveryContent: "https://example.com/file" };
    expect(productSchema.safeParse({ ...base, ownershipConfirmed: true }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, ownershipConfirmed: false }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, priceCents: 50, ownershipConfirmed: true }).success).toBe(false);
  });
});

describe("url import safety", () => {
  it("detects private addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["93.184.216.34", "1.1.1.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("parses product meta tags", () => {
    const html = `<html><head><title>Fallback</title><meta property="og:title" content="Weekly Planner &amp; Notes"><meta name="description" content="A printable planner."></head></html>`;
    expect(parseProductMeta(html)).toEqual({ title: "Weekly Planner & Notes", description: "A printable planner." });
  });
});
