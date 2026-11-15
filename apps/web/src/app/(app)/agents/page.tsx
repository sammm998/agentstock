import Link from "next/link";
import type { Metadata } from "next";
import { Activity, Plug } from "lucide-react";
import { agentUsage } from "@/server/agents";
import { AgentIcon } from "@/components/visuals";
import { AGENTS, AGENT_DETAILS, AGENT_CATEGORIES, type AgentCategory, type CapabilityStatus } from "@hustera/domain";
import { getInventory } from "@/server/integrations";
import { getViewer } from "@/server/session";
import { readiness } from "@/server/agent-catalog";
import { PageHeader } from "@/components/ui";
import { WorkflowMini } from "@/components/workflow-diagram";
import { AgentPreview } from "@/components/agent-preview";
import { TiltCard } from "@/components/motion";

export const metadata: Metadata = { title: "Agents" };

const CAP_STYLE: Record<CapabilityStatus, string> = {
  READY: "border-mint/30 bg-mint/10 text-mint",
  APPROVAL_REQUIRED: "border-indigo/40 bg-indigo/10 text-[#b8b0ff]",
  CONNECT_REQUIRED: "border-warning/30 bg-warning/10 text-warning",
  PARTIAL: "border-warning/30 bg-warning/10 text-warning",
  UNSUPPORTED: "border-line bg-slate-2 text-muted",
  BLOCKED: "border-danger/30 bg-danger/10 text-danger",
};

const CATEGORY_COPY: Record<AgentCategory, string> = {
  Commerce: "Find products, build offers and sell them — in your store and through Stripe.",
  Growth: "Content, social, YouTube, affiliate, SEO, email and ads that bring buyers in.",
  Markets: "Live market data, rule-based decisions and AI notes — traded in paper portfolios.",
  Operations: "Bookkeeping and freelance work that keeps the money side honest.",
  Partner: "Specialist products from our partner Scoutr, available to Hustera members.",
};

export default async function AgentsPage() {
  const [viewer, inventory, usage] = await Promise.all([getViewer(), getInventory(), agentUsage()]);
  const visible = AGENTS.filter((a) => !a.adminOnly || viewer?.role === "admin");
  return (
    <>
      <PageHeader
        title="AI Agents"
        description={`${visible.length} agents, each with a visible workflow. Hustera Core plans every mission, checks your budget before each step and waits for your approval before anything goes public.`}
        actions={<><Link href="/live" className="btn-secondary"><Activity size={16} aria-hidden="true" /> Control room</Link><Link href="/agents/instant" className="btn-ghost">Instant apps</Link></>}
      />
      <div className="card mb-8 border-warning/25 p-5 text-sm text-muted">
        <strong className="text-cloud">How agents work:</strong> every agent runs inside a mission with your budget limits and approvals. You see each step live, can pause or stop at any time, and every sale, click and trade lands in your notifications and wallet. Agents never promise income.
      </div>

      {AGENT_CATEGORIES.map((cat) => {
        const list = visible.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat} className="mb-10" aria-labelledby={`cat-${cat}`}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id={`cat-${cat}`} className="text-xl font-bold">{cat}</h2>
                <p className="text-sm text-muted">{CATEGORY_COPY[cat]}</p>
              </div>
              <span className="chip">{list.length} agents</span>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((a) => {
                const u = usage.find((x) => x.agent_id === a.id);
                const r = readiness(a);
                return (
                  <li key={a.id}>
                    <TiltCard max={6} className="h-full">
                    <Link href={`/agents/${a.id}`} className="card glow-border flex h-full flex-col overflow-hidden p-5" data-agent={a.id}>
                      {AGENT_DETAILS[a.id] && (
                        <div className="relative -mx-5 -mt-5 mb-4 h-36 overflow-hidden border-b border-white/5 px-4 pt-4" aria-hidden="true">
                          <div className="preview-thumb"><AgentPreview kind={AGENT_DETAILS[a.id]!.preview} accent={a.accent} compact /></div>
                          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#090b1c] to-transparent" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <AgentIcon icon={a.icon} accent={a.accent} />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{a.name}</h3>
                          <p className="text-xs text-muted">{a.role}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${r.ready ? "border-mint/30 bg-mint/10 text-mint" : "border-warning/30 bg-warning/10 text-warning"}`}>{r.ready ? (a.partner ? "Partner" : "Runs now") : "Needs setup"}</span>
                      </div>
                      <p className="mt-3 flex-1 text-sm text-muted">{a.tagline}</p>
                      <div className="mt-4"><WorkflowMini steps={a.steps} accent={a.accent} /></div>
                      <p className="mt-3 text-xs text-muted">{a.steps.length} steps{u ? ` · ${u.missions} missions${u.live_products ? ` · ${u.live_products} live products` : ""}` : ""}{a.repeat ? " · recurring" : ""}</p>
                    </Link>
                    </TiltCard>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

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
