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

export type ToolProvider = "sandbox" | "composio" | "hustera" | "llm" | "instant";

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
  { id: "instant.market_research", version: 1, provider: "instant", name: "Live market research", description: "Searches the web (Tavily, Exa, Serper or SerpApi) and summarises what buyers and competitors say, with sources. Falls back to an offline research plan if Composio Instant is unavailable.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: false },
  { id: "instant.keyword_research", version: 1, provider: "instant", name: "Keyword research", description: "Finds search keywords for the product (DataForSEO or Semrush) for the listing and posts. Skipped if unavailable.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "instant.competitor_prices", version: 1, provider: "instant", name: "Competitor prices", description: "Looks up comparable products and prices (SerpApi Google Shopping) to sanity-check your price. Skipped if unavailable.", maxCostCents: 3, requiresApproval: false, status: "READY", simulated: false },
  { id: "instant.cover_image", version: 1, provider: "instant", name: "Cover image", description: "Generates an original cover image for a digital product (Black Forest Labs or Fal.ai). Shown to buyers as AI-generated. Skipped if unavailable.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "instant.market_snapshot", version: 1, provider: "instant", name: "Market snapshot", description: "Fetches current crypto and stock prices (CoinGecko, Finnhub, Alpha Vantage). Information only — no trading.", maxCostCents: 3, requiresApproval: false, status: "READY", simulated: false },
  { id: "sandbox.promo_drafts", version: 1, provider: "sandbox", name: "Promotion drafts", description: "Writes three post variants announcing your product, with the price and a link.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: true },
  { id: "hustera.promote_post", version: 1, provider: "hustera", name: "Post to your followers", description: "Publishes the approved promotion post to your Hustera feed, linking to the product.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
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

export type MissionKind = "start_business" | "sell_existing" | "promote_product" | "market_watch";
export type MissionMode = "approve_each" | "autonomous";
export type MissionStatus = "active" | "paused" | "blocked" | "completed" | "stopped";

export const MISSION_KIND_LABEL: Record<MissionKind, string> = {
  start_business: "Start a business for me",
  sell_existing: "Sell my existing product",
  promote_product: "Promote one of my products",
  market_watch: "Market snapshot (information only)",
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
  if (kind === "promote_product") {
    return [
      { key: "promo", agentId: "contentflow", toolId: "sandbox.promo_drafts", title: "Draft promotion posts", dependsOn: [] },
      { key: "post", agentId: "contentflow", toolId: "hustera.promote_post", title: "Post to your followers", dependsOn: ["promo"] },
    ];
  }
  if (kind === "market_watch") {
    return [{ key: "snapshot", agentId: "markets", toolId: "instant.market_snapshot", title: "Fetch a market snapshot", dependsOn: [] }];
  }
  const plan: PlannedTask[] = [
    { key: "research", agentId: "research", toolId: "instant.market_research", title: kind === "start_business" ? "Research demand and feasibility" : "Research audience and competitors", dependsOn: [] },
    { key: "seo", agentId: "seo", toolId: "instant.keyword_research", title: "Find search keywords", dependsOn: ["research"] },
    { key: "prices", agentId: "ecompro", toolId: "instant.competitor_prices", title: "Check competitor prices", dependsOn: ["research"] },
    { key: "offer", agentId: "core", toolId: "sandbox.offer_outline", title: kind === "start_business" ? "Outline a first offer to test" : "Evaluate offer and unit economics", dependsOn: ["research", "prices"] },
  ];
  const publishDeps = ["listing", "checklist"];
  if (kind === "start_business") {
    plan.push(
      { key: "generate", agentId: "designstudio", toolId: "ai.generate_product", title: "Create the digital product", dependsOn: ["offer"] },
      { key: "cover", agentId: "designstudio", toolId: "instant.cover_image", title: "Create a cover image", dependsOn: ["generate"] },
      { key: "rights", agentId: "core", toolId: "hustera.rights_qa", title: "Review rights and quality", dependsOn: ["generate", "cover"] },
    );
    publishDeps.push("rights");
  }
  plan.push(
    { key: "checklist", agentId: "core", toolId: "sandbox.compliance_checklist", title: "Prepare launch checklist", dependsOn: ["offer"] },
    { key: "listing", agentId: "ecompro", toolId: "sandbox.listing_draft", title: "Write the product listing", dependsOn: ["offer", "seo"] },
    { key: "publish", agentId: "ecompro", toolId: "hustera.publish_to_store", title: "Publish to your Hustera store", dependsOn: publishDeps },
    { key: "promo", agentId: "contentflow", toolId: "sandbox.promo_drafts", title: "Draft promotion posts", dependsOn: ["publish"] },
    { key: "post", agentId: "contentflow", toolId: "hustera.promote_post", title: "Announce it to your followers", dependsOn: ["promo"] },
  );
  if (opts.externalChannel) plan.push({ key: "external", agentId: "ecompro", toolId: "composio.publish_listing", title: "Publish to your external store", dependsOn: ["publish"] });
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
