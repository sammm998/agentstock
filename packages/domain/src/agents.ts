/**
 * Agent foundation (Milestone B): missions, tasks, tools and budgets.
 *
 * Everything here is deterministic and free of I/O so that the parts that
 * decide money and permissions are never delegated to a language model.
 */

// ---------------------------------------------------------------- capability status

/** Integration / tool availability, as required by the product spec. */
export type CapabilityStatus = "READY" | "CONNECT_REQUIRED" | "APPROVAL_REQUIRED" | "PARTIAL" | "UNSUPPORTED" | "BLOCKED";

// ---------------------------------------------------------------- tools

export type ToolProvider = "sandbox" | "composio" | "hustera" | "llm";

export interface ToolDefinition {
  id: string;
  version: number;
  provider: ToolProvider;
  name: string;
  description: string;
  /** Upper bound reserved before execution, in minor units (cents). */
  maxCostCents: number;
  /** Requires an explicit human approval before every execution. */
  requiresApproval: boolean;
  /** Static availability. Composio tools are resolved at runtime from the inventory. */
  status: CapabilityStatus;
  /** True when the tool's output is a simulation / draft, not a real-world action. */
  simulated: boolean;
}

/**
 * Versioned tool registry. Sandbox tools run in Hustera's own process and only
 * produce draft documents; they never contact third parties or spend money.
 * Their costs are simulated so the budget engine is exercised end to end.
 */
export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  { id: "sandbox.research_plan", version: 1, provider: "sandbox", name: "Research plan", description: "Turns your idea into a structured demand and competition research plan with the questions to answer and sources to check.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: true },
  { id: "sandbox.offer_outline", version: 1, provider: "sandbox", name: "Offer outline", description: "Drafts an offer: audience, problem, deliverables, pricing hypotheses to test, and unit-economics worksheet.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: true },
  { id: "sandbox.compliance_checklist", version: 1, provider: "sandbox", name: "Launch checklist", description: "Lists rights, consumer-law, VAT and platform-policy items to confirm before selling in Sweden/EU.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: true },
  { id: "sandbox.listing_draft", version: 1, provider: "sandbox", name: "Listing draft", description: "Writes a product listing draft for your review. Nothing is published.", maxCostCents: 30, requiresApproval: true, status: "READY", simulated: true },
  { id: "ai.generate_product", version: 1, provider: "llm", name: "Generate digital product", description: "Writes the content of a digital product (guide, template or checklist) from your offer, using the configured AI model.", maxCostCents: 50, requiresApproval: false, status: "CONNECT_REQUIRED", simulated: false },
  { id: "hustera.rights_qa", version: 1, provider: "hustera", name: "Rights & quality review", description: "You confirm the generated content is accurate, original enough to sell, and free of third-party rights issues.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "hustera.publish_to_store", version: 1, provider: "hustera", name: "Publish to your Hustera store", description: "Creates the product in your Hustera storefront. Digital products with delivery content go live; others are saved as drafts for you to finish.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "composio.publish_listing", version: 1, provider: "composio", name: "Publish to external channel", description: "Publishes the approved listing to an external store (e.g. Shopify) through your Composio connection.", maxCostCents: 0, requiresApproval: true, status: "CONNECT_REQUIRED", simulated: false },
  /** Deprecated: replaced by hustera.publish_to_store and composio.publish_listing. Kept for existing missions. */
  { id: "channel.publish_listing", version: 1, provider: "composio", name: "Publish listing (legacy)", description: "Publishes an approved listing to a connected store or marketplace.", maxCostCents: 0, requiresApproval: true, status: "CONNECT_REQUIRED", simulated: false },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id);
}

// ---------------------------------------------------------------- missions & planning

export type MissionKind = "start_business" | "sell_existing";
export type MissionMode = "approve_each" | "autonomous";
export type MissionStatus = "active" | "paused" | "blocked" | "completed" | "stopped";

export const MISSION_KIND_LABEL: Record<MissionKind, string> = {
  start_business: "Start a business for me",
  sell_existing: "Sell my existing product",
};

export interface PlannedTask {
  key: string;
  agentId: string;
  toolId: string;
  title: string;
  dependsOn: string[];
}

/**
 * Hustera Core's deterministic planner. It selects a small, fixed sequence of
 * tools per mission kind; LLM-based planning is a later capability.
 */
export function planMission(kind: MissionKind, opts: { externalChannel?: boolean } = {}): PlannedTask[] {
  const plan: PlannedTask[] = [
    { key: "research", agentId: "research", toolId: "sandbox.research_plan", title: kind === "start_business" ? "Research demand and feasibility" : "Research audience and competitors", dependsOn: [] },
    { key: "offer", agentId: "core", toolId: "sandbox.offer_outline", title: kind === "start_business" ? "Outline a first offer to test" : "Evaluate offer and unit economics", dependsOn: ["research"] },
  ];
  const publishDeps = ["listing", "checklist"];
  if (kind === "start_business") {
    plan.push(
      { key: "generate", agentId: "design", toolId: "ai.generate_product", title: "Create the digital product", dependsOn: ["offer"] },
      { key: "rights", agentId: "core", toolId: "hustera.rights_qa", title: "Review rights and quality", dependsOn: ["generate"] },
    );
    publishDeps.push("rights");
  }
  plan.push(
    { key: "checklist", agentId: "core", toolId: "sandbox.compliance_checklist", title: "Prepare launch checklist", dependsOn: ["offer"] },
    { key: "listing", agentId: "storefront", toolId: "sandbox.listing_draft", title: "Draft a product listing", dependsOn: ["offer"] },
    { key: "publish", agentId: "storefront", toolId: "hustera.publish_to_store", title: "Publish to your Hustera store", dependsOn: publishDeps },
  );
  if (opts.externalChannel) plan.push({ key: "external", agentId: "storefront", toolId: "composio.publish_listing", title: "Publish to your external store", dependsOn: ["publish"] });
  return plan;
}

// ---------------------------------------------------------------- task state machine

export type TaskStatus = "queued" | "awaiting_approval" | "running" | "succeeded" | "failed" | "blocked" | "cancelled";

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  queued: ["awaiting_approval", "running", "blocked", "cancelled"],
  awaiting_approval: ["queued", "cancelled"],
  running: ["succeeded", "failed", "blocked", "queued"],
  succeeded: [],
  failed: ["queued", "cancelled"],
  blocked: ["queued", "cancelled"],
  cancelled: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: TaskStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

// ---------------------------------------------------------------- budget engine

export interface BudgetLimits {
  totalCents: number;
  perDayCents: number;
  perTaskCents: number;
}

export interface BudgetUsage {
  /** Held reservations plus settled spend for the mission. */
  committedCents: number;
  /** Held reservations plus settled spend for the current UTC day. */
  committedTodayCents: number;
}

export type ReservationDecision = { ok: true } | { ok: false; reason: string };

/**
 * Decides whether a reservation of `amountCents` may be made. The amount must
 * be the tool's upper-bound cost, never an estimate from a model.
 */
export function checkReservation(limits: BudgetLimits, usage: BudgetUsage, amountCents: number): ReservationDecision {
  if (!Number.isInteger(amountCents) || amountCents < 0) return { ok: false, reason: "Invalid amount" };
  if (amountCents > limits.perTaskCents) return { ok: false, reason: `Task cost limit of ${formatCents(limits.perTaskCents)} would be exceeded` };
  if (usage.committedTodayCents + amountCents > limits.perDayCents) return { ok: false, reason: `Daily limit of ${formatCents(limits.perDayCents)} would be exceeded` };
  if (usage.committedCents + amountCents > limits.totalCents) return { ok: false, reason: `Mission budget of ${formatCents(limits.totalCents)} would be exceeded` };
  return { ok: true };
}

export function formatCents(cents: number, currency = "EUR"): string {
  // Normalise -0 so empty totals don't render as "-€0.00".
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format((cents === 0 ? 0 : cents) / 100);
}

export const BUDGET_MAX_CENTS = 100_00;
