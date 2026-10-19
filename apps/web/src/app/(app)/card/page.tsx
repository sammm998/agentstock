import type { Metadata } from "next";
import { LogoMark } from "@/components/brand";
import { Illustrative, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Hustera Card (concept)" };

export default function CardPage() {
  return (
    <>
      <PageHeader title="Hustera Card" description="A brand and product exploration." />
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute inset-6 rounded-3xl bg-mint/30 blur-3xl" aria-hidden="true" />
          <div role="img" aria-label="Concept artwork of a dark Hustera card with the logo. Not a real card." className="relative aspect-[1.586] rotate-[-6deg] overflow-hidden rounded-3xl border border-mint/40 p-6 shadow-[0_0_60px_rgb(78_242_194/0.25)]" style={{ background: "linear-gradient(135deg, #1a2236, #0b1222 60%, #10303a)" }}>
            <div className="flex items-center gap-2"><LogoMark size={30} /><span className="text-xl font-extrabold italic tracking-tight">hustera</span></div>
            <div className="mt-8 h-9 w-12 rounded-md bg-gradient-to-br from-[#d9d4c5] to-[#8f8a7c]" aria-hidden="true" />
            <p className="absolute bottom-6 left-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Concept · Not a payment card</p>
          </div>
        </div>
        <div className="card p-6">
          <Illustrative>Concept only</Illustrative>
          <h2 className="mt-3 text-xl font-bold">There is no Hustera Card today</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Hustera does not issue payment cards, card numbers or accounts, and offers no banking or e-money services.</li>
            <li>A real card would require a licensed issuing / e-money partner, identity verification (KYC/AML), safeguarding of funds, fraud controls, disputes and regulatory approval.</li>
            <li>Sparks can never be loaded onto a card or spent with merchants.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
