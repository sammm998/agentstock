import "server-only";
import type { Queryable } from "../db";
import { generateText, llmConfig } from "../llm";

export interface ToolResult {
  artifact: { kind: string; title: string; content: string };
  costCents: number;
  message: string;
}

export type ToolOutcome = { ok: true; result: ToolResult } | { ok: false; blocked: true; reason: string } | { ok: false; blocked: false; error: string };

export interface ToolContext {
  db: Queryable;
  ownerId: string;
  missionId: string;
  kind: string;
  title: string;
  brief: string;
  region: string;
  priceCents: number;
  productKind: "digital" | "physical" | "service";
  deliveryContent: string;
  productId: string | null;
  params: Record<string, string>;
  inputs: Record<string, string>;
}

export const ok = (kind: string, title: string, content: string, message: string, costCents = 0): ToolOutcome => ({ ok: true, result: { costCents, message, artifact: { kind, title, content } } });

export function skipped(title: string, reason: string): ToolOutcome {
  return ok("skipped", title, `# ${title}\n\n_Skipped: ${reason}_`, `Skipped — ${reason}`);
}

/** Machine-readable data carried inside an artifact (hidden from the rendered view). */
export function embed(data: unknown): string {
  return `<!-- data:${Buffer.from(JSON.stringify(data)).toString("base64")} -->`;
}

export function extract<T>(content: string | undefined): T | null {
  const m = content?.match(/<!-- data:([A-Za-z0-9+/=]+) -->/);
  if (!m) return null;
  try {
    return JSON.parse(Buffer.from(m[1]!, "base64").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Runs the configured AI model, or returns null so the caller can use its template. */
export async function aiText(ctx: ToolContext, system: string, prompt: string, maxTokens = 900): Promise<{ text: string; costCents: number; model: string } | null> {
  if (!llmConfig().provider) return null;
  try {
    const r = await generateText(`${system} Never invent statistics, results, testimonials or income claims.`, prompt, { maxTokens, db: ctx.db });
    return r.text.trim().length > 40 ? { text: r.text.trim(), costCents: r.costCents, model: r.model } : null;
  } catch {
    return null;
  }
}

export function slugify(text: string, max = 40): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max) || "item";
}

export function randomSuffix(n = 4): string {
  return Math.random().toString(36).slice(2, 2 + n);
}

export interface OwnedProduct {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  kind: string;
  status: string;
  slug: string;
  stripe_payment_link_url: string | null;
}

/** The product a mission works on: the selected product, or the one the mission created. */
export async function missionProduct(ctx: ToolContext): Promise<OwnedProduct | null> {
  const [p] = await ctx.db.query<OwnedProduct>(
    `select p.id, p.title, p.description, p.price_cents, p.currency, p.kind, p.status, s.slug, p.stripe_payment_link_url
       from products p join stores s on s.id = p.store_id
      where s.owner_id = $1 and (p.id = $2 or p.mission_id = $3) order by (p.status = 'active') desc, p.created_at desc limit 1`,
    [ctx.ownerId, ctx.productId, ctx.missionId],
  );
  return p ?? null;
}

export const productUrl = (p: OwnedProduct) => `/store/${p.slug}/${p.id}`;
