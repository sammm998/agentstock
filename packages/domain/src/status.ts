/** Honest feature status used across product UI and documentation. */
export type FeatureStatus = "VERIFIED" | "TESTED_SIMULATION" | "NEEDS_CONNECTION" | "NEEDS_APPROVAL" | "BLOCKED" | "NOT_BUILT";

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  VERIFIED: "Live",
  TESTED_SIMULATION: "Simulation",
  NEEDS_CONNECTION: "Needs connection",
  NEEDS_APPROVAL: "Needs approval",
  BLOCKED: "Blocked",
  NOT_BUILT: "Not built yet",
};

export interface AgentDefinition {
  id: string;
  name: string;
  family: string;
  summary: string;
  milestone: string;
  status: FeatureStatus;
}

/**
 * The agent registry. "Simulation" agents run today with sandbox tools that only
 * produce drafts; "Not built" agents are planned. No ratings or usage numbers are
 * shown because none exist.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  { id: "core", name: "Hustera Core", family: "Orchestrator", summary: "Plans missions with a deterministic planner, dispatches tasks to specialist agents within your budget and approvals, and records every result.", milestone: "B", status: "TESTED_SIMULATION" },
  { id: "research", name: "Market Research", family: "Research", summary: "Today: drafts a structured research plan from your brief. Later: live research with cited sources.", milestone: "B", status: "TESTED_SIMULATION" },
  { id: "storefront", name: "Ecommerce", family: "Commerce", summary: "Drafts listings for your approval and publishes them to your Hustera store; external stores via Composio.", milestone: "C", status: "VERIFIED" },
  { id: "social", name: "Social Content", family: "Marketing", summary: "Drafts posts for YouTube, TikTok and Instagram for your approval before publishing.", milestone: "F", status: "NOT_BUILT" },
  { id: "design", name: "Design Studio", family: "Creative", summary: "Today: writes digital products (guides, templates) with the configured AI model, followed by your rights review. Images and mockups come later.", milestone: "D", status: "NEEDS_CONNECTION" },
  { id: "web", name: "Website Builder", family: "Build", summary: "Landing pages and small websites built in a sandbox and deployed with your approval.", milestone: "F", status: "NOT_BUILT" },
  { id: "seo", name: "SEO", family: "Marketing", summary: "Keyword research and on-page recommendations.", milestone: "F", status: "NOT_BUILT" },
  { id: "support", name: "Support", family: "Operations", summary: "Drafts replies to customer questions, returns and refunds.", milestone: "C", status: "NOT_BUILT" },
  { id: "finance", name: "Finance", family: "Operations", summary: "Reconciles verified payments, costs and refunds into a profit ledger.", milestone: "C", status: "NOT_BUILT" },
  { id: "markets", name: "Stock & Crypto Research", family: "Research", summary: "Information, backtesting and paper trading only. No real trades.", milestone: "F", status: "NOT_BUILT" },
];

export interface OpportunityTemplate {
  id: string;
  name: string;
  category: string;
  summary: string;
  requirements: string[];
  status: FeatureStatus;
}

/**
 * Opportunity templates describe business models and what they genuinely
 * require. They deliberately show no earnings figures.
 */
export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = [
  { id: "digital-products", name: "Digital products", category: "Digital", summary: "Printables, templates and downloadable guides.", requirements: ["Original or properly licensed content", "A Hustera store (built in) or marketplace seller account", "Payment provider (test checkout until Stripe is connected)", "VAT handling for digital sales"], status: "TESTED_SIMULATION" },
  { id: "pod", name: "Print-on-demand", category: "Commerce", summary: "Original designs printed and shipped by a fulfilment partner.", requirements: ["Print-on-demand partner account", "Original artwork with commercial rights", "Product safety information", "Returns policy"], status: "NOT_BUILT" },
  { id: "existing-product", name: "Sell my existing product", category: "Commerce", summary: "Bring a product you already own and let agents help with listings, marketing and support.", requirements: ["Proof of ownership or right to sell", "A Hustera store, or a store connection via Composio (e.g. Shopify)", "Payment provider", "Fulfilment and returns process"], status: "TESTED_SIMULATION" },
  { id: "freelance", name: "Freelance services", category: "Services", summary: "Offer design, writing, video or development services to clients.", requirements: ["A portfolio of your own work", "Clear capacity and delivery terms", "A service listing in the Hustera marketplace"], status: "VERIFIED" },
  { id: "content", name: "Content & newsletter", category: "Media", summary: "Build an audience with original content and a newsletter.", requirements: ["Consistent publishing plan", "Email provider with consent and opt-out", "Disclosure for affiliate links"], status: "NOT_BUILT" },
  { id: "dropshipping", name: "Dropshipping", category: "Commerce", summary: "Sell products shipped by a verified supplier.", requirements: ["Reliable, compliant supplier", "Seller responsibilities under EU consumer and product safety law", "Accurate delivery times", "Returns and refunds"], status: "NOT_BUILT" },
];
