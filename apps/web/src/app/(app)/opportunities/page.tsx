import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { OPPORTUNITY_TEMPLATES } from "@hustera/domain";
import { RoadmapNotice } from "@/components/roadmap";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Opportunities" };

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title="Opportunities" description="Business models people build on Hustera, with what each one genuinely requires. We don't show earnings estimates — results depend on your work, market and costs." />
      <RoadmapNotice milestone="C–F">
        Missions that let agents help you “Sell my existing product” or “Start a business for me” are not built yet. Use these templates to plan, and find collaborators in Communities.
      </RoadmapNotice>
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
          </li>
        ))}
      </ul>
    </>
  );
}
