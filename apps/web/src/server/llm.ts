import "server-only";
import { findText } from "@hustera/domain";
import type { Queryable } from "./db";
import { instantConfigured, runInstant } from "./instant";

export interface LlmResult {
  text: string;
  provider: "anthropic" | "openai" | "composio";
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Estimated from token usage and the configured per-million-token prices. */
  costCents: number;
}

export interface LlmConfig {
  provider: "anthropic" | "openai" | "composio" | null;
  model: string | null;
}

/**
 * Direct keys win (Anthropic first); otherwise Composio Instant text tools
 * (Gemini, OpenAI, OpenRouter, DeepSeek) billed to the Composio wallet.
 */
export function llmConfig(): LlmConfig {
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", model: process.env.HUSTERA_LLM_MODEL ?? "claude-sonnet-5-5" };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", model: process.env.HUSTERA_LLM_MODEL ?? "gpt-5-mini" };
  if (instantConfigured()) return { provider: "composio", model: "Composio Instant (Gemini → OpenAI → OpenRouter → DeepSeek)" };
  return { provider: null, model: null };
}

function estimateCents(inputTokens: number, outputTokens: number): number {
  // Prices are operator configuration (USD-cents ≈ EUR-cents per million tokens); defaults are conservative upper bounds.
  const inPrice = Number(process.env.HUSTERA_LLM_INPUT_CENTS_PER_MTOK ?? 300);
  const outPrice = Number(process.env.HUSTERA_LLM_OUTPUT_CENTS_PER_MTOK ?? 1500);
  return Math.ceil((inputTokens * inPrice + outputTokens * outPrice) / 1_000_000);
}

/**
 * Generates text with the configured model. Used only to draft content for the
 * user to review — never to decide approvals, budgets or payments.
 */
export async function generateText(system: string, prompt: string, opts: { maxTokens?: number; fetchImpl?: typeof fetch; db?: Queryable } = {}): Promise<LlmResult> {
  const cfg = llmConfig();
  const f = opts.fetchImpl ?? fetch;
  const maxTokens = opts.maxTokens ?? 2000;
  if (cfg.provider === "anthropic") {
    const res = await f("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
    const inputTokens = body.usage?.input_tokens ?? 0;
    const outputTokens = body.usage?.output_tokens ?? 0;
    return { text, provider: "anthropic", model: cfg.model!, inputTokens, outputTokens, costCents: estimateCents(inputTokens, outputTokens) };
  }
  if (cfg.provider === "openai") {
    const res = await f("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: cfg.model, max_completion_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const text = (body.choices?.[0]?.message?.content ?? "").trim();
    const inputTokens = body.usage?.prompt_tokens ?? 0;
    const outputTokens = body.usage?.completion_tokens ?? 0;
    return { text, provider: "openai", model: cfg.model!, inputTokens, outputTokens, costCents: estimateCents(inputTokens, outputTokens) };
  }
  if (cfg.provider === "composio") {
    const r = await runInstant("llm", { prompt: `${system}\n\n${prompt}` }, { fetchImpl: opts.fetchImpl, db: opts.db });
    const text = (findText(r.data) ?? "").trim();
    if (!text) throw new Error(`${r.tool} returned no text`);
    return { text, provider: "composio", model: `${r.toolkit}/${r.tool}`, inputTokens: 0, outputTokens: 0, costCents: r.maxCostCents };
  }
  throw new Error("No AI model is configured");
}
