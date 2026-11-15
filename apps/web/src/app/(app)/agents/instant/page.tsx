import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Zap } from "lucide-react";
import { agentDisplayName, INSTANT_CATALOG, INSTANT_CAPABILITIES, canOnPlatform } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { instantConfigured, instantOverrides, instantToolStatus } from "@/server/instant";
import { discoverInstantAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Composio Instant apps" };

export default async function InstantPage() {
  const [viewer, status] = await Promise.all([getViewer(), instantToolStatus()]);
  const configured = instantConfigured();
  const overrides = instantOverrides();
  const categories = [...new Set(INSTANT_CATALOG.map((t) => t.category))];
  const agentName = (id: string) => agentDisplayName(id);

  return (
    <div className="space-y-6">
      <Link href="/agents" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> AI Agents</Link>
      <PageHeader
        title="Composio Instant apps"
        description="Apps our agents can call immediately, billed per call to Hustera's Composio wallet — no account for you to connect. Every call is capped by your mission budget."
        actions={viewer && canOnPlatform(viewer.role, "adjust_sparks") && configured ? (
          <ActionForm action={discoverInstantAction} showOk><button className="btn-secondary btn-sm">Discover tool names</button></ActionForm>
        ) : undefined}
      />
      <div className={`card p-4 text-sm ${configured ? "border-mint/30" : "border-warning/30"}`}>
        {configured ? "Composio Instant is configured. A tool is marked verified after its first successful real call." : "Composio Instant isn't configured on this instance yet (COMPOSIO_API_KEY). Agents fall back to offline drafts or skip these steps — they never invent data."}
      </div>

      <section className="card p-6" aria-labelledby="caps-h">
        <h2 id="caps-h" className="font-semibold">What the agents use</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Capability</th><th className="py-2 font-medium">Apps, in order</th><th className="py-2 font-medium">Max per call</th><th className="py-2 font-medium">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {Object.values(INSTANT_CAPABILITIES).map((c) => {
                const rows = status.filter((s) => c.candidates.some((x) => x.toolkit === s.toolkit));
                const ok = rows.find((r) => r.last_success_at);
                const err = rows.find((r) => r.last_error);
                return (
                  <tr key={c.id}>
                    <td className="py-2.5 font-medium">{c.label}</td>
                    <td className="py-2.5 text-muted">{c.candidates.map((x) => overrides[c.id] && x === c.candidates[0] ? `${x.toolkit} (${overrides[c.id]})` : x.toolkit).join(" → ")}</td>
                    <td className="py-2.5">{c.maxCostCents}¢</td>
                    <td className="py-2.5 text-xs">{ok ? <span className="text-mint">Verified {ok.tool_slug} · <TimeAgo date={ok.last_success_at!} /></span> : err ? <span className="text-warning">Last error: {err.last_error?.slice(0, 80)}</span> : <span className="text-muted">Not tested yet</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {categories.map((cat) => (
        <section key={cat} aria-label={cat}>
          <h2 className="eyebrow mb-3">{cat}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {INSTANT_CATALOG.filter((t) => t.category === cat).map((t) => (
              <li key={t.slug} className={`card p-4 ${t.usedBy.length ? "border-indigo/40" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold"><Zap size={14} className="text-mint" aria-hidden="true" />{t.name}</span>
                  {t.active && <span className="chip border-mint/40 text-mint">Active</span>}
                </div>
                <p className="mt-1 text-xs text-muted">{t.tools} tools</p>
                <p className="mt-2 text-xs">{t.usedBy.length ? <>Used by {t.usedBy.map(agentName).join(", ")}</> : <span className="text-muted">Available for future agents</span>}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
