import "server-only";
import { q, one } from "./db";
import { UserError } from "./core";

/**
 * Composio client. Paths are centralised here because they must be verified
 * against the live API when the first key is configured (see docs/composio.md).
 * Hustera user ids are passed as Composio `user_id`s so connections are
 * isolated per user.
 */
export const COMPOSIO = {
  base: () => process.env.COMPOSIO_BASE_URL ?? "https://backend.composio.dev",
  key: () => process.env.COMPOSIO_API_KEY ?? "",
  paths: {
    toolkits: "/api/v3.1/toolkits",
    connectedAccounts: "/api/v3/connected_accounts",
    connectedAccount: (id: string) => `/api/v3/connected_accounts/${encodeURIComponent(id)}`,
    executeTool: (slug: string) => `/api/v3/tools/execute/${encodeURIComponent(slug)}`,
  },
};

/** Auth config ids per toolkit, from `COMPOSIO_AUTH_CONFIGS` = {"shopify":"ac_…"}. */
export function authConfigs(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.COMPOSIO_AUTH_CONFIGS ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function composioConfigured() {
  return !!COMPOSIO.key();
}

async function call<T>(path: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  if (!composioConfigured()) throw new UserError("Composio is not configured yet");
  const res = await fetchImpl(COMPOSIO.base() + path, {
    ...init,
    headers: { "content-type": "application/json", "x-api-key": COMPOSIO.key(), ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Composio ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export interface Connection {
  id: string;
  toolkit: string;
  external_id: string | null;
  status: "pending" | "active" | "failed" | "revoked";
  updated_at: Date;
}

export async function myConnections(userId: string) {
  return q<Connection>(`select id, toolkit, external_id, status, updated_at from connected_accounts where user_id = $1 order by toolkit`, [userId]);
}

export async function activeConnection(userId: string, toolkit: string) {
  return one<Connection>(`select id, toolkit, external_id, status, updated_at from connected_accounts where user_id = $1 and provider = 'composio' and toolkit = $2 and status = 'active'`, [userId, toolkit]);
}

/** Starts a hosted Composio connection flow and returns the URL to send the user to. */
export async function startConnection(userId: string, toolkit: string, callbackUrl: string, fetchImpl?: typeof fetch): Promise<string> {
  const authConfigId = authConfigs()[toolkit];
  if (!authConfigId) throw new UserError(`No Composio auth config is set up for ${toolkit}. Add it to COMPOSIO_AUTH_CONFIGS.`);
  const body = await call<{ id?: string; redirect_url?: string; redirectUrl?: string; connectionData?: { val?: { redirectUrl?: string } } }>(
    COMPOSIO.paths.connectedAccounts,
    { method: "POST", body: JSON.stringify({ auth_config: { id: authConfigId }, connection: { user_id: userId, callback_url: callbackUrl } }) },
    fetchImpl,
  );
  const redirect = body.redirect_url ?? body.redirectUrl ?? body.connectionData?.val?.redirectUrl;
  if (!body.id || !redirect) throw new Error("Unexpected Composio response: missing id or redirect URL");
  await q(
    `insert into connected_accounts (user_id, provider, toolkit, external_id, status) values ($1, 'composio', $2, $3, 'pending')
     on conflict (user_id, provider, toolkit) do update set external_id = excluded.external_id, status = 'pending', updated_at = now()`,
    [userId, toolkit, body.id],
  );
  return redirect;
}

/** Confirms a connection after the hosted flow by reading its status from Composio. */
export async function confirmConnection(userId: string, externalId: string, fetchImpl?: typeof fetch) {
  const row = await one<{ id: string }>(`select id from connected_accounts where user_id = $1 and external_id = $2`, [userId, externalId]);
  if (!row) throw new UserError("Connection not found");
  const body = await call<{ status?: string }>(COMPOSIO.paths.connectedAccount(externalId), {}, fetchImpl);
  const status = (body.status ?? "").toUpperCase() === "ACTIVE" ? "active" : "failed";
  await q(`update connected_accounts set status = $2, updated_at = now() where id = $1`, [row.id, status]);
  return status;
}

export async function revokeConnection(userId: string, connectionId: string) {
  await q(`update connected_accounts set status = 'revoked', updated_at = now() where id = $1 and user_id = $2`, [connectionId, userId]);
}

export interface ToolExecution {
  successful: boolean;
  data: unknown;
  error: string | null;
}

/** Executes a Composio tool for a user. Arguments must match the tool's schema. */
export async function executeComposioTool(userId: string, toolSlug: string, args: Record<string, unknown>, fetchImpl?: typeof fetch): Promise<ToolExecution> {
  const body = await call<{ successful?: boolean; data?: unknown; error?: string | null }>(
    COMPOSIO.paths.executeTool(toolSlug),
    { method: "POST", body: JSON.stringify({ user_id: userId, arguments: args }) },
    fetchImpl,
  );
  return { successful: body.successful === true, data: body.data ?? null, error: body.error ?? null };
}

/** Which external publish action to use, e.g. toolkit "shopify" + tool "SHOPIFY_CREATE_PRODUCT". */
export function publishTarget(): { toolkit: string; tool: string } | null {
  const toolkit = process.env.COMPOSIO_PUBLISH_TOOLKIT;
  const tool = process.env.COMPOSIO_PUBLISH_TOOL;
  return toolkit && tool ? { toolkit, tool } : null;
}
