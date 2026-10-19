import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { AGENT_REGISTRY } from "@hustera/domain";
import { RoadmapNotice } from "@/components/roadmap";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Agents" };

export default function AgentsPage() {
  return (
    <>
      <PageHeader title="AI Agents" description="Hustera Core orchestrates specialist agents that work within your budget, permissions and approvals. Every claimed action will be backed by an artifact or verified API result." />
      <RoadmapNotice milestone="B">
        The agent runtime, versioned registry, budget engine and Composio capability importer are not built yet. The registry below describes planned agents — none of them can run, and no ratings or usage numbers are shown because none exist.
      </RoadmapNotice>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENT_REGISTRY.map((a) => (
          <li key={a.id} className="card flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo/20 text-indigo-2"><Bot size={22} aria-hidden="true" /></span>
              <div className="flex-1">
                <h2 className="font-semibold">{a.name}</h2>
                <p className="text-xs text-muted">{a.family} · Milestone {a.milestone}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{a.summary}</p>
            <button className="btn-secondary btn-sm mt-4" disabled>Not available yet</button>
          </li>
        ))}
      </ul>
    </>
  );
}
