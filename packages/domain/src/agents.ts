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

export type ToolProvider = "sandbox" | "composio" | "hustera" | "llm" | "instant" | "stripe" | "markets" | "partner";

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
  { id: "stripe.payment_link", version: 1, provider: "stripe", name: "Stripe payment link", description: "Creates the product, price and a shareable Payment Link in your Stripe account, so you can sell anywhere. Money goes straight to your Stripe balance.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "stripe.revenue_report", version: 1, provider: "stripe", name: "Revenue report", description: "Reports verified sales, refunds, costs and profit from your Hustera ledger, plus your live Stripe balance and latest payments when Stripe is connected.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "sandbox.promo_drafts", version: 1, provider: "sandbox", name: "Promotion drafts", description: "Writes three post variants announcing your product, with the price and a link.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: true },
  { id: "hustera.promote_post", version: 1, provider: "hustera", name: "Post to your followers", description: "Publishes the approved promotion post to your Hustera feed, linking to the product.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "sandbox.listing_draft", version: 1, provider: "sandbox", name: "Listing draft", description: "Writes a product listing draft for your review. Nothing is published.", maxCostCents: 30, requiresApproval: true, status: "READY", simulated: true },
  { id: "ai.generate_product", version: 1, provider: "llm", name: "Generate digital product", description: "Writes the content of a digital product (guide, template or checklist) from your offer, using the configured AI model.", maxCostCents: 50, requiresApproval: false, status: "CONNECT_REQUIRED", simulated: false },
  { id: "hustera.rights_qa", version: 1, provider: "hustera", name: "Rights & quality review", description: "You confirm the generated content is accurate, original enough to sell, and free of third-party rights issues.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "hustera.publish_to_store", version: 1, provider: "hustera", name: "Publish to your Hustera store", description: "Creates the product in your Hustera storefront. Digital products with delivery content go live; others are saved as drafts for you to finish.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "composio.publish_listing", version: 1, provider: "composio", name: "Publish to external channel", description: "Publishes the approved listing to an external store (e.g. Shopify) through your Composio connection.", maxCostCents: 0, requiresApproval: true, status: "CONNECT_REQUIRED", simulated: false },
  { id: "drop.product_scout", version: 1, provider: "hustera", name: "Product scout", description: "Scores product candidates on margin after fees and shipping, delivery time and demand signals.", maxCostCents: 5, requiresApproval: false, status: "READY", simulated: false },
  { id: "drop.supplier_checklist", version: 1, provider: "sandbox", name: "Supplier checklist", description: "Supplier, delivery, returns and EU product-safety checklist for the chosen product.", maxCostCents: 5, requiresApproval: false, status: "READY", simulated: true },
  { id: "social.campaign_plan", version: 1, provider: "hustera", name: "Social campaign plan", description: "Plans seven posts with hooks, angles and hashtags (AI when available).", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "social.schedule_posts", version: 1, provider: "hustera", name: "Schedule posts", description: "Schedules the approved posts; they publish automatically at the planned times.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "pod.design_concepts", version: 1, provider: "hustera", name: "Design concepts", description: "Original design concepts with slogans and artwork prompts.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "price.watch_products", version: 1, provider: "instant", name: "Price watch", description: "Checks competitor prices for each of your live products.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: false },
  { id: "pages.generate", version: 1, provider: "hustera", name: "Landing page draft", description: "Writes a landing page for one of your products.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "pages.publish", version: 1, provider: "hustera", name: "Publish landing page", description: "Publishes the landing page at its own address.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "yt.ideas", version: 1, provider: "hustera", name: "Video ideas", description: "Ten video ideas ranked by search intent.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "yt.scripts", version: 1, provider: "hustera", name: "Scripts & metadata", description: "Scripts, titles, descriptions and tags.", maxCostCents: 30, requiresApproval: false, status: "READY", simulated: false },
  { id: "yt.thumbnails", version: 1, provider: "hustera", name: "Thumbnail concepts", description: "Thumbnail concepts and image prompts.", maxCostCents: 5, requiresApproval: false, status: "READY", simulated: false },
  { id: "yt.publish_plan", version: 1, provider: "hustera", name: "Upload schedule", description: "A weekly upload calendar.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "aff.keyword_plan", version: 1, provider: "hustera", name: "Affiliate keyword plan", description: "Buyer-intent keywords for the niche.", maxCostCents: 5, requiresApproval: false, status: "READY", simulated: false },
  { id: "aff.create_links", version: 1, provider: "hustera", name: "Tracked links", description: "Creates tracked short links with disclosure.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "aff.articles", version: 1, provider: "hustera", name: "Affiliate articles", description: "Review and comparison articles with links and disclosure.", maxCostCents: 30, requiresApproval: false, status: "READY", simulated: false },
  { id: "aff.report", version: 1, provider: "hustera", name: "Click report", description: "Clicks per link and per day.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "seo.keyword_map", version: 1, provider: "hustera", name: "Keyword map", description: "Groups keywords by search intent.", maxCostCents: 5, requiresApproval: false, status: "READY", simulated: false },
  { id: "seo.briefs", version: 1, provider: "hustera", name: "Content briefs", description: "Briefs for the best keyword opportunities.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: false },
  { id: "seo.onpage_checklist", version: 1, provider: "sandbox", name: "On-page checklist", description: "On-page SEO checklist.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: true },
  { id: "mail.sequence", version: 1, provider: "hustera", name: "Email sequence", description: "Five emails with subjects and timing.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: false },
  { id: "mail.consent_checklist", version: 1, provider: "sandbox", name: "Consent checklist", description: "Consent, unsubscribe and sender checklist.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: true },
  { id: "ads.angles", version: 1, provider: "hustera", name: "Ad angles", description: "Pain, desire, proof and offer angles.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "ads.copy", version: 1, provider: "hustera", name: "Ad copy", description: "Copy variants per platform.", maxCostCents: 20, requiresApproval: false, status: "READY", simulated: false },
  { id: "markets.prices", version: 1, provider: "markets", name: "Market prices", description: "Price history from public market data.", maxCostCents: 1, requiresApproval: false, status: "READY", simulated: false },
  { id: "markets.analyze", version: 1, provider: "markets", name: "Market analysis", description: "SMA, RSI and volatility with an AI note.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "markets.trade", version: 1, provider: "markets", name: "Paper trading", description: "Rule-based trades in a simulated portfolio.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: true },
  { id: "gigs.demand_scan", version: 1, provider: "hustera", name: "Demand scan", description: "Marketplace demand by category.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  { id: "gigs.service_draft", version: 1, provider: "hustera", name: "Service draft", description: "Drafts a service offer.", maxCostCents: 10, requiresApproval: false, status: "READY", simulated: false },
  { id: "gigs.publish_service", version: 1, provider: "hustera", name: "Publish service", description: "Publishes the service to the marketplace.", maxCostCents: 0, requiresApproval: true, status: "READY", simulated: false },
  { id: "partner.handoff", version: 1, provider: "partner", name: "Partner hand-off", description: "Runs in the partner product.", maxCostCents: 0, requiresApproval: false, status: "READY", simulated: false },
  /** Deprecated: replaced by hustera.publish_to_store and composio.publish_listing. Kept for existing missions. */
  { id: "channel.publish_listing", version: 1, provider: "composio", name: "Publish listing (legacy)", description: "Publishes an approved listing to a connected store or marketplace.", maxCostCents: 0, requiresApproval: true, status: "CONNECT_REQUIRED", simulated: false },
];

export function getTool(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id);
}

// ---------------------------------------------------------------- missions & planning

/** Missions store the agent id as their kind; older missions use the legacy kinds below. */
export type MissionKind = string;
export type MissionMode = "approve_each" | "autonomous";
export type MissionStatus = "active" | "paused" | "blocked" | "completed" | "stopped";

export const MISSION_KIND_LABEL: Record<string, string> = {
  start_business: "Start a business for me",
  sell_existing: "Sell my existing product",
  promote_product: "Promote one of my products",
  market_watch: "Market snapshot",
  revenue_report: "Revenue report",
};

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
