import type { Metadata } from "next";
import { HusteraCardVisual } from "@/components/visuals";
import { Illustrative, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Hustera Card (concept)" };

export default function CardPage() {
  return (
    <>
      <PageHeader title="Hustera Card" description="Spend your success anywhere — a brand and product exploration for the future." />
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <HusteraCardVisual className="mx-auto w-full max-w-md py-8" />
        <div className="card p-6">
          <Illustrative>Concept only</Illustrative>
          <h2 className="mt-3 text-xl font-bold">There is no Hustera Card today</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Hustera does not issue payment cards, card numbers or accounts, and offers no banking or e-money services.</li>
            <li>A real card would require a licensed issuing / e-money partner, identity verification (KYC/AML), safeguarding of funds, fraud controls, disputes and regulatory approval.</li>
            <li>Sparks can never be loaded onto a card or spent with merchants.</li>
          </ul>
          <h3 className="eyebrow mt-6">What it could do — once licensed</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>Spend your verified business revenue directly</li>
            <li>Separate cards for agent budgets with hard limits</li>
            <li>Freeze, limits and receipts from your wallet</li>
          </ul>
        </div>
      </div>
    </>
  );
}
