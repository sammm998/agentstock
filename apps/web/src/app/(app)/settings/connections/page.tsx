import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { authConfigs, composioConfigured, myConnections, publishTarget } from "@/server/composio";
import { llmConfig } from "@/server/llm";
import { providerStatus } from "@/server/payments";
import { connectToolkitAction, revokeConnectionAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Connections" };

export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const viewer = await requireViewer();
  const { status } = await searchParams;
  const [connections] = await Promise.all([myConnections(viewer.id)]);
  const toolkits = Object.keys(authConfigs());
  const llm = llmConfig();
  const payments = providerStatus();
  const target = publishTarget();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Connections" description="Accounts your agents may use on your behalf. You authenticate directly with each service; Hustera never sees your passwords." />
      {status && <p role="status" className={`text-sm ${status === "active" ? "text-mint" : "text-danger"}`}>{status === "active" ? "Connection confirmed." : "The connection could not be confirmed. Try again."}</p>}

      <section className="card p-6" aria-labelledby="composio-h">
        <h2 id="composio-h" className="font-semibold">Composio apps</h2>
        {!composioConfigured() ? (
          <p className="mt-2 text-sm text-muted">Composio isn&apos;t configured on this Hustera instance yet. Once an operator adds a Composio API key, you can connect stores and marketplaces here.</p>
        ) : toolkits.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Composio is configured, but no apps are enabled yet (COMPOSIO_AUTH_CONFIGS).</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {toolkits.map((tk) => {
              const c = connections.find((x) => x.toolkit === tk);
              return (
                <li key={tk} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="flex-1"><p className="font-medium capitalize">{tk}</p><p className="text-xs text-muted">{c ? <>{c.status} · updated <TimeAgo date={c.updated_at} /></> : "Not connected"}{target?.toolkit === tk && " · used for external publishing"}</p></div>
                  {c?.status === "active" ? (
                    <ActionForm action={revokeConnectionAction} confirm={`Disconnect ${tk}? Agents will no longer be able to use it.`}><input type="hidden" name="connectionId" value={c.id} /><button className="btn-ghost btn-sm">Disconnect</button></ActionForm>
                  ) : (
                    <ActionForm action={connectToolkitAction}><input type="hidden" name="toolkit" value={tk} /><button className="btn-primary btn-sm">Connect</button></ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-6 text-sm" aria-labelledby="platform-h">
        <h2 id="platform-h" className="font-semibold">Platform services</h2>
        <ul className="mt-3 space-y-2 text-muted">
          <li><span className="text-cloud">Payments:</span> {payments.reason}</li>
          <li><span className="text-cloud">AI model:</span> {llm.provider ? `${llm.provider} (${llm.model})` : "not configured — AI product generation is unavailable"}</li>
        </ul>
      </section>
    </div>
  );
}
