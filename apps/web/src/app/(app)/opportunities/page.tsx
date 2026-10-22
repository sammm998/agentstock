import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { OPPORTUNITY_TEMPLATES } from "@hustera/domain";
import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Opportunities" };

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title="Opportunities" description="Business models people build on Hustera, with what each one genuinely requires. We don't show earnings estimates — results depend on your work, market and costs." />
      <div className="card mb-6 p-5 text-sm text-muted">
        Start a mission from a template: Hustera Core drafts research, an offer, a launch checklist and a listing, and can publish to your Hustera store with your approval. “Simulation” means payments run through the test checkout until Stripe is connected.
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OPPORTUNITY_TEMPLATES.map((o) => (
          <li key={o.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{o.name}</h2>
                <p className="text-xs text-muted">{o.category}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-3 text-sm text-muted">{o.summary}</p>
            <h3 className="eyebrow mt-4">What you&apos;ll need</h3>
            <ul className="mt-2 space-y-1.5">
              {o.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{r}</li>
              ))}
            </ul>
            <div className="mt-4 flex-1" />
            {o.id === "freelance" ? (
              <Link href="/marketplace/new" className="btn-secondary btn-sm mt-2 w-fit">Offer a service</Link>
            ) : o.status !== "NOT_BUILT" ? (
              <Link href={`/projects/new?template=${o.id}`} className="btn-primary btn-sm mt-2 w-fit">Start a mission</Link>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
