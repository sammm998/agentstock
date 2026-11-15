import "server-only";
import type { AgentDef } from "@hustera/domain";
import { composioConfigured } from "./composio";
import { instantConfigured } from "./instant";
import { llmConfig } from "./llm";
import { stripeConfigured } from "./stripe-api";

/** What a step needs that isn't connected yet (null when it runs today). */
export function stepNeed(toolId: string): string | null {
  if (toolId.startsWith("instant.") || toolId === "price.watch_products") return instantConfigured() ? null : "Composio Instant";
  if (toolId === "ai.generate_product") return llmConfig().provider ? null : "an AI model";
  if (toolId === "stripe.payment_link") return stripeConfigured() ? null : "Stripe";
  if (toolId === "composio.publish_listing") return composioConfigured() ? null : "Composio";
  return null;
}

export function stepNeeds(agent: AgentDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const st of agent.steps) {
    const n = stepNeed(st.toolId);
    if (n) out[st.key] = n;
  }
  return out;
}

/** "Runs now" unless a non-optional step is blocked by something missing. */
export function readiness(agent: AgentDef): { label: string; ready: boolean } {
  if (agent.partner) return { label: "Partner product", ready: true };
  const missing = [...new Set(agent.steps.filter((s) => !s.when && s.toolId === "ai.generate_product").map((s) => stepNeed(s.toolId)).filter(Boolean))];
  if (missing.length) return { label: `Needs ${missing.join(", ")}`, ready: false };
  const optional = [...new Set(Object.values(stepNeeds(agent)))];
  return { label: optional.length ? `Runs now · more with ${optional.join(", ")}` : "Runs now", ready: true };
}
