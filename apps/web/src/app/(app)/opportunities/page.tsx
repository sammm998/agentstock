import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { AGENT_REGISTRY, OPPORTUNITY_TEMPLATES } from "@hustera/domain";
import { templateUsage } from "@/server/agents";
import { OpportunityIcon } from "@/components/opportunity";
import { PageHeader, StatusBadge } from "@/components/ui";
import { compactNumber } from "@/components/visuals";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const usage = await templateUsage();
  return (
    <>
      <PageHeader title="Opportunities" description="Business models people run on Hustera, the agents that help, and what each one genuinely requires. We don't show earnings estimates — results depend on your work, market and costs." />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OPPORTUNITY_TEMPLATES.map((o) => {
          const joined = usage.find((u) => u.template_id === o.id)?.missions ?? 0;
          return (
            <li key={o.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <OpportunityIcon icon={o.icon} accent={o.accent} />
                <div className="flex-1">
                  <h2 className="font-semibold">{o.name}</h2>
                  <p className="text-xs text-muted">{o.subtitle}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <span className="mt-3 w-fit rounded-md bg-mint/10 px-2 py-0.5 text-xs font-medium text-mint">{o.badge}</span>
              <p className="mt-3 text-sm text-muted">{o.summary}</p>
              <h3 className="eyebrow mt-4">What you&apos;ll need</h3>
              <ul className="mt-2 space-y-1.5">
                {o.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{r}</li>
                ))}
              </ul>
              {o.agents.length > 0 && <p className="mt-4 text-xs text-muted">Agents: {o.agents.map((id) => AGENT_REGISTRY.find((a) => a.id === id)?.name).join(" + ")}</p>}
              <div className="mt-4 flex flex-1 items-end justify-between gap-2">
                <span className="text-xs text-muted">{joined ? `${compactNumber(joined)} joined` : "Be the first"}</span>
                {o.id === "freelance" ? (
                  <Link href="/marketplace/new" className="btn-secondary btn-sm">Offer a service</Link>
                ) : o.launch ? (
                  <Link href={`/agents/${o.launch.agentId}?template=${o.id}`} className="btn-primary btn-sm">Join</Link>
                ) : (
                  <span className="btn-secondary btn-sm cursor-default opacity-70">{o.status === "NEEDS_CONNECTION" ? "Needs connection" : "Coming soon"}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
