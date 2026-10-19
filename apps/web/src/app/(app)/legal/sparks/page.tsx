import type { Metadata } from "next";
import { SPARKS_TERMS } from "@hustera/domain";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Sparks terms" };

export default function SparksTermsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Sparks terms" description="Plain-language terms for Hustera's loyalty points." />
      <ol className="card list-decimal space-y-3 p-6 pl-10 text-sm leading-relaxed">
        {SPARKS_TERMS.map((t) => <li key={t}>{t}</li>)}
      </ol>
    </div>
  );
}
