import Link from "next/link";
import type { Metadata } from "next";
import { Bot, Plug } from "lucide-react";
import { AGENT_REGISTRY, type CapabilityStatus } from "@hustera/domain";
import { getInventory } from "@/server/integrations";
import { getViewer } from "@/server/session";
import { PageHeader, StatusBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Agents" };

const CAP_STYLE: Record<CapabilityStatus, string> = {
  READY: "border-mint/30 bg-mint/10 text-mint",
  APPROVAL_REQUIRED: "border-indigo/40 bg-indigo/10 text-[#b8b0ff]",
  CONNECT_REQUIRED: "border-warning/30 bg-warning/10 text-warning",
  PARTIAL: "border-warning/30 bg-warning/10 text-warning",
  UNSUPPORTED: "border-line bg-slate-2 text-muted",
  BLOCKED: "border-danger/30 bg-danger/10 text-danger",
};

export default async function AgentsPage() {
  const [viewer, inventory] = await Promise.all([getViewer(), getInventory()]);
  return (
    <>
      <PageHeader
        title="AI Agents"
        description="Hustera Core plans missions and dispatches tasks to specialist agents — always within your budget limits and approvals, with every result recorded."
        actions={viewer ? <Link href="/projects/new" className="btn-primary"><Bot size={16} aria-hidden="true" /> Start a mission</Link> : undefined}
      />
      <div className="card mb-6 border-warning/25 p-5 text-sm text-muted">
        <strong className="text-cloud">What runs today:</strong> agents marked <em>Simulation</em> use Hustera sandbox tools that turn your own brief into drafts — research plans, offer outlines, launch checklists and listings. They do not browse the web, contact anyone, publish or spend real money. Live tools arrive through Composio connections.
      </div>

      <h2 className="eyebrow mb-3">Agent registry</h2>
      <ul className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENT_REGISTRY.map((a) => (
          <li key={a.id} className="card flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo/20 text-indigo-2"><Bot size={22} aria-hidden="true" /></span>
              <div className="flex-1">
                <h3 className="font-semibold">{a.name}</h3>
                <p className="text-xs text-muted">{a.family} · Milestone {a.milestone}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-3 flex-1 text-sm text-muted">{a.summary}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="inv">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="inv" className="eyebrow">Capability inventory</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Plug size={13} aria-hidden="true" />
            Composio: {inventory.composio.configured ? (inventory.composio.reachable ? `connected to project · ${inventory.composio.toolkits.length} toolkits listed` : `unreachable (${inventory.composio.error})`) : "not configured"}
          </p>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="px-5 py-3 font-medium">Capability</th><th className="px-5 py-3 font-medium">Provider</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Verified</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inventory.capabilities.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3"><p className="font-medium">{c.name}</p><p className="text-xs text-muted">{c.detail}</p></td>
                  <td className="px-5 py-3 text-muted">{c.provider}</td>
                  <td className="px-5 py-3"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CAP_STYLE[c.status]}`}>{c.status}</span></td>
                  <td className="px-5 py-3 text-xs text-muted">{c.verifiedAt ?? "Not tested"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
