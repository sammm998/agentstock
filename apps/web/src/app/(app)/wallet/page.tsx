import type { Metadata } from "next";
import Link from "next/link";
import { RoadmapNotice } from "@/components/roadmap";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <>
      <PageHeader title="Wallet" description="Your real payments, business revenue, costs and agent budgets — kept completely separate from Sparks." />
      <RoadmapNotice milestone="C">
        No payment provider is connected and Hustera holds no money. When built, the Wallet will only reflect genuine payments verified through an approved provider (e.g. Stripe), with refunds, fees and costs in a double-entry ledger. Looking for your loyalty points? See <Link href="/rewards" className="underline">Rewards</Link>.
      </RoadmapNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        {["Revenue", "Costs", "Agent budget"].map((label) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-muted">—</p>
            <p className="mt-1 text-xs text-muted">Not connected</p>
          </div>
        ))}
      </div>
    </>
  );
}
