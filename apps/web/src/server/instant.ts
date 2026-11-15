import "server-only";
import { INSTANT_CAPABILITIES, pickToolSlug, type InstantCapabilityId } from "@hustera/domain";
import type { Queryable } from "./db";
import { q } from "./db";
import { COMPOSIO, composioConfigured, executeComposioTool } from "./composio";

/**
 * Composio Instant runs tools billed to the Hustera Composio wallet, without a
 * per-user connection. Every call is made as one platform user id.
 */
export const INSTANT_USER_ID = () => process.env.COMPOSIO_INSTANT_USER_ID ?? "hustera-platform";

export class InstantUnavailable extends Error {}

export function instantConfigured() {
  return composioConfigured() && process.env.COMPOSIO_INSTANT !== "off";
}

/** Operator overrides: {"web_search":"TAVILY_SEARCH","gemini":"GEMINI_GENERATE_CONTENT"} keyed by capability or toolkit. */
export function instantOverrides(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.COMPOSIO_INSTANT_TOOLS ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Lists a toolkit's tool slugs from Composio and remembers them. */
export async function discoverToolkit(toolkit: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${COMPOSIO.base()}/api/v3/tools?toolkit_slug=${encodeURIComponent(toolkit)}&limit=500`, {
    headers: { "x-api-key": COMPOSIO.key() },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Composio ${res.status} listing ${toolkit}`);
  const body = (await res.json()) as { items?: { slug?: string }[] };
  const slugs = (body.items ?? []).map((i) => i.slug).filter((x): x is string => !!x);
  for (const slug of slugs) {
    await q(`insert into instant_tools (toolkit, tool_slug, discovered_at) values ($1, $2, now()) on conflict (toolkit, tool_slug) do update set discovered_at = now()`, [toolkit, slug]);
  }
  return slugs;
}

async function knownSlugs(db: Queryable, toolkit: string): Promise<string[]> {
  return (await db.query<{ tool_slug: string }>(`select tool_slug from instant_tools where toolkit = $1 and discovered_at is not null`, [toolkit])).map((r) => r.tool_slug);
}

async function record(db: Queryable, toolkit: string, slug: string, error: string | null) {
  await db.query(
    error
      ? `insert into instant_tools (toolkit, tool_slug, last_error, last_error_at, calls) values ($1, $2, $3, now(), 1)
         on conflict (toolkit, tool_slug) do update set last_error = excluded.last_error, last_error_at = now(), calls = instant_tools.calls + 1`
      : `insert into instant_tools (toolkit, tool_slug, last_success_at, calls) values ($1, $2, now(), 1)
         on conflict (toolkit, tool_slug) do update set last_success_at = now(), last_error = null, calls = instant_tools.calls + 1`,
    error ? [toolkit, slug, error.slice(0, 500)] : [toolkit, slug],
  );
}

/** Arguments for a capability, using the names most search/LLM tools accept. */
function argsFor(cap: InstantCapabilityId, toolkit: string, input: Record<string, unknown>): Record<string, unknown> {
  switch (cap) {
    case "llm":
      return toolkit === "gemini" ? { prompt: input.prompt } : { prompt: input.prompt, input: input.prompt };
    case "web_search":
      return { query: input.query, max_results: 6, num_results: 6 };
    case "scrape":
      return { url: input.url };
    case "shopping_search":
      return { q: input.query, query: input.query, gl: "se" };
    case "keywords":
      return { keyword: input.keyword, keywords: [input.keyword], location_name: "Sweden", language_code: "en" };
    case "image":
      return { prompt: input.prompt };
    case "crypto_price":
      return { ids: input.ids, vs_currencies: "eur" };
    case "stock_quote":
      return { symbol: input.symbol };
  }
}

export interface InstantResult {
  toolkit: string;
  tool: string;
  data: unknown;
  maxCostCents: number;
}

/**
 * Runs a capability through its Instant candidates in order, returning the
 * first successful result. Throws InstantUnavailable if none worked.
 */
export async function runInstant(cap: InstantCapabilityId, input: Record<string, unknown>, opts: { fetchImpl?: typeof fetch; db?: Queryable } = {}): Promise<InstantResult> {
  // Inside a mission step, reuse its transaction: a second connection would wait on the open transaction.
  const db: Queryable = opts.db ?? { query: q };
  if (!instantConfigured()) throw new InstantUnavailable("Composio Instant is not configured (COMPOSIO_API_KEY)");
  const def = INSTANT_CAPABILITIES[cap];
  const overrides = instantOverrides();
  const errors: string[] = [];
  for (const c of def.candidates) {
    const slug = overrides[`${cap}:${c.toolkit}`] ?? (c === def.candidates[0] ? overrides[cap] : undefined) ?? overrides[c.toolkit] ?? pickToolSlug(c.tool, c.keywords, await knownSlugs(db, c.toolkit)) ?? c.tool;
    try {
      const r = await executeComposioTool(INSTANT_USER_ID(), slug, argsFor(cap, c.toolkit, input), opts.fetchImpl);
      if (!r.successful) throw new Error(r.error ?? "unsuccessful");
      await record(db, c.toolkit, slug, null);
      return { toolkit: c.toolkit, tool: slug, data: r.data, maxCostCents: def.maxCostCents };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${slug}: ${msg}`);
      await record(db, c.toolkit, slug, msg).catch(() => {});
    }
  }
  throw new InstantUnavailable(`No ${def.label.toLowerCase()} tool worked — ${errors.join("; ").slice(0, 400)}`);
}

export async function instantToolStatus() {
  return q<{ toolkit: string; tool_slug: string; discovered_at: Date | null; last_success_at: Date | null; last_error: string | null; calls: number }>(
    `select toolkit, tool_slug, discovered_at, last_success_at, last_error, calls from instant_tools
      where last_success_at is not null or last_error is not null order by toolkit, tool_slug`,
  );
}
