import "server-only";
import { TOOL_REGISTRY, type CapabilityStatus } from "@hustera/domain";

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

  const capabilities: CapabilityRow[] = TOOL_REGISTRY.map((t) => ({
    id: `${t.id}@${t.version}`,
    name: t.name,
    provider: t.provider === "sandbox" ? "Hustera sandbox" : "Composio",
    status: t.provider === "sandbox" ? (t.requiresApproval ? "APPROVAL_REQUIRED" : "READY") : "CONNECT_REQUIRED",
    detail: t.provider === "sandbox" ? `${t.description} Output is a draft (simulation).` : t.description,
    verifiedAt: t.provider === "sandbox" ? "automated tests" : null,
  }));
  for (const tk of composio.toolkits) {
    capabilities.push({ id: `composio:${tk.slug}`, name: tk.name, provider: "Composio", status: "CONNECT_REQUIRED", detail: "Toolkit listed by your Composio project. No user account connected and no actions tested yet.", verifiedAt: null });
  }
  return { composio, capabilities };
}
