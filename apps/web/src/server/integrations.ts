import "server-only";
import { TOOL_REGISTRY, type CapabilityStatus } from "@hustera/domain";
import { llmConfig } from "./llm";
import { providerStatus } from "./payments";
import { authConfigs } from "./composio";

export interface CapabilityRow {
  id: string;
  name: string;
  provider: string;
  status: CapabilityStatus;
  detail: string;
  verifiedAt: string | null;
}

export interface Inventory {
  composio: { configured: boolean; reachable: boolean | null; error: string | null; toolkits: { slug: string; name: string }[]; checkedAt: string | null };
  capabilities: CapabilityRow[];
}

const COMPOSIO_TOOLKITS_URL = "https://backend.composio.dev/api/v3.1/toolkits";

/**
 * Lists toolkits available to the configured Composio project. A toolkit being
 * listed does not mean the user has connected an account, so every toolkit is
 * reported as CONNECT_REQUIRED until per-user connections are implemented.
 */
async function fetchComposioToolkits(apiKey: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(`${COMPOSIO_TOOLKITS_URL}?limit=50`, { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Composio responded ${res.status}`);
  const body = (await res.json()) as { items?: { slug?: string; name?: string }[] };
  return (body.items ?? []).filter((t) => t.slug).map((t) => ({ slug: String(t.slug), name: String(t.name ?? t.slug) }));
}

export async function getInventory(opts: { fetchImpl?: typeof fetch; apiKey?: string } = {}): Promise<Inventory> {
  const apiKey = opts.apiKey ?? process.env.COMPOSIO_API_KEY ?? "";
  const composio: Inventory["composio"] = { configured: !!apiKey, reachable: null, error: null, toolkits: [], checkedAt: null };
  if (apiKey) {
    try {
      composio.toolkits = await fetchComposioToolkits(apiKey, opts.fetchImpl);
      composio.reachable = true;
    } catch (e) {
      composio.reachable = false;
      composio.error = e instanceof Error ? e.message : "Unknown error";
    }
    composio.checkedAt = new Date().toISOString();
  }

  const llm = llmConfig();
  const PROVIDER_LABEL = { sandbox: "Hustera sandbox", hustera: "Hustera", llm: llm.provider ? `AI model (${llm.provider})` : "AI model", composio: "Composio" } as const;
  const capabilities: CapabilityRow[] = TOOL_REGISTRY.filter((t) => t.id !== "channel.publish_listing").map((t) => {
    let status: CapabilityStatus;
    if (t.provider === "llm") status = llm.provider ? "READY" : "CONNECT_REQUIRED";
    else if (t.provider === "composio") status = "CONNECT_REQUIRED";
    else status = t.requiresApproval ? "APPROVAL_REQUIRED" : "READY";
    return {
      id: `${t.id}@${t.version}`,
      name: t.name,
      provider: PROVIDER_LABEL[t.provider],
      status,
      detail: t.simulated ? `${t.description} Output is a draft (simulation).` : t.description,
      verifiedAt: t.provider === "composio" ? null : t.provider === "llm" ? "automated tests (mocked model)" : "automated tests",
    };
  });
  const payments = providerStatus();
  capabilities.push({ id: "payments", name: "Checkout & refunds", provider: payments.provider === "stripe" ? "Stripe" : "Hustera test checkout", status: payments.provider ? (payments.provider === "stripe" ? "READY" : "PARTIAL") : "CONNECT_REQUIRED", detail: payments.reason, verifiedAt: payments.provider === "test" ? "automated tests" : null });
  for (const tk of Object.keys(authConfigs())) {
    if (!composio.toolkits.some((x) => x.slug === tk)) capabilities.push({ id: `composio-auth:${tk}`, name: tk, provider: "Composio", status: "CONNECT_REQUIRED", detail: "Auth config set; each user connects their own account under Settings → Connections.", verifiedAt: null });
  }
  for (const tk of composio.toolkits) {
    capabilities.push({ id: `composio:${tk.slug}`, name: tk.name, provider: "Composio", status: "CONNECT_REQUIRED", detail: "Toolkit listed by your Composio project. No user account connected and no actions tested yet.", verifiedAt: null });
  }
  return { composio, capabilities };
}
