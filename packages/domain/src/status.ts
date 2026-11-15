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

export type AgentLaunch = "sell_existing" | "start_business" | "promote_product" | "market_watch" | "revenue_report";

export interface AgentDefinition {
  id: string;
  name: string;
  /** Short role shown under the name, e.g. "E-commerce agent". */
  role: string;
  family: string;
  summary: string;
  /** What the agent does today, step by step. */
  capabilities: string[];
  milestone: string;
  status: FeatureStatus;
  /** Mission kind started by "Use agent", if the agent can run today. */
  launch?: AgentLaunch;
  /** Shown in "Popular AI agents" on Home. */
  featured?: boolean;
  /** Icon key and accent used by the UI. */
  icon: "bag" | "play" | "palette" | "globe" | "bot" | "search" | "trend" | "chat" | "ledger" | "chart";
  accent: string;
  /** What the user must provide or connect for it to work. */
  needs?: string;
}

/**
 * The agent registry. Agents marked Live run end to end today; "Needs
 * connection" agents run once the named key or account is connected. Usage
 * counts shown in the UI are real mission counts — no invented ratings.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: "ecompro", name: "EcomPro", role: "E-commerce agent", family: "Commerce", icon: "bag", accent: "#6558F5", featured: true, launch: "sell_existing", milestone: "C", status: "VERIFIED",
    summary: "Sells a product you own: prepares the offer and listing, publishes it to your store, promotes it to your followers and tracks real sales.",
    capabilities: ["Creates a shareable Stripe Payment Link — money goes straight to your Stripe", "Researches buyers and competitors on the live web (Composio Instant: Tavily, Exa, Serper, SerpApi, Firecrawl)", "Checks competitor prices (SerpApi Google Shopping) and finds keywords (DataForSEO, Semrush)", "Builds the offer, launch checklist and an AI-written listing (Gemini, OpenAI or OpenRouter)", "Publishes to your Hustera store after your approval", "Announces it to your followers after your approval", "Tracks orders, revenue and refunds in your wallet"],
  },
  {
    id: "contentflow", name: "ContentFlow", role: "Social media agent", family: "Marketing", icon: "play", accent: "#FF5C8A", featured: true, launch: "promote_product", milestone: "F", status: "VERIFIED",
    summary: "Turns one of your products into promotion posts and publishes them to your Hustera audience with your approval. YouTube, TikTok and Instagram via Composio.",
    capabilities: ["Writes three post variants with AI (Gemini, OpenAI or OpenRouter via Composio Instant)", "Publishes the one you approve to your feed", "External networks once connected via Composio"],
    needs: "External networks need a Composio connection",
  },
  {
    id: "designstudio", name: "DesignStudio", role: "AI design agent", family: "Creative", icon: "palette", accent: "#C04CF5", featured: true, launch: "start_business", milestone: "D", status: "NEEDS_CONNECTION",
    summary: "Creates a new digital product (guide, template, checklist) from your idea with AI, then lists and sells it after your rights review.",
    capabilities: ["Researches the niche on the live web", "Writes the full product with AI (Gemini via Composio Instant, or your own model key)", "Creates an original cover image (Black Forest Labs or Fal.ai)", "Requires your rights & quality review", "Publishes and delivers it automatically after payment"],
    needs: "Needs Composio Instant (COMPOSIO_API_KEY) or an AI model key",
  },
  {
    id: "webbuilder", name: "WebBuilder", role: "Website agent", family: "Build", icon: "globe", accent: "#2FA8FF", featured: true, milestone: "F", status: "NOT_BUILT",
    summary: "Landing pages and small websites built in a sandbox and deployed with your approval.",
    capabilities: ["Planned: landing pages for your products", "Planned: deploy to your own domain"],
  },
  { id: "core", name: "Hustera Core", role: "Orchestrator", family: "Orchestrator", icon: "bot", accent: "#4EF2C2", milestone: "B", status: "VERIFIED", summary: "Plans every mission, dispatches tasks to specialist agents within your budget and approvals, and records every result.", capabilities: ["Deterministic planning", "Budget reservations and approvals", "Pause, stop and kill switch"] },
  { id: "research", name: "Market Research", role: "Research agent", family: "Research", icon: "search", accent: "#2FA8FF", milestone: "F", status: "NEEDS_CONNECTION", summary: "Searches the live web and summarises demand and competitors with sources, inside every product mission.", capabilities: ["Web search via Tavily, Exa, Serper or SerpApi", "Summary with cited sources via Gemini/OpenAI", "Offline research plan when Composio is unavailable"], needs: "Composio Instant (COMPOSIO_API_KEY)" },
  { id: "seo", name: "SEO", role: "Search agent", family: "Marketing", icon: "trend", accent: "#FFC861", milestone: "F", status: "NEEDS_CONNECTION", summary: "Finds the keywords buyers search for and works them into your listing and posts.", capabilities: ["Keyword ideas via DataForSEO or Semrush", "Feeds the listing writer"], needs: "Composio Instant (COMPOSIO_API_KEY)" },
  { id: "support", name: "Support", role: "Customer service agent", family: "Operations", icon: "chat", accent: "#8893AD", milestone: "C", status: "NOT_BUILT", summary: "Drafts replies to customer questions, returns and refunds.", capabilities: [] },
  { id: "finance", name: "RevenueDesk", role: "Revenue & bookkeeping agent", family: "Operations", icon: "ledger", accent: "#4EF2C2", featured: false, launch: "revenue_report", milestone: "C", status: "VERIFIED", summary: "Reports what you actually earned: verified sales, refunds, costs and profit from your ledger, plus your live Stripe balance and latest payments.", capabilities: ["Profit report from your double-entry ledger", "Live Stripe balance and latest payments (when Stripe is connected)", "Platform-fee preview with loss carry-forward"], needs: "Stripe figures need STRIPE_SECRET_KEY" },
  { id: "markets", name: "MarketWatch", role: "Stock & crypto research", family: "Research", icon: "chart", accent: "#F7931A", milestone: "F", status: "NEEDS_CONNECTION", launch: "market_watch", summary: "Fetches current crypto and stock prices for a watchlist. Information only — no trading, no advice, no custody.", capabilities: ["Crypto prices via CoinGecko", "Stock quotes via Finnhub or Alpha Vantage", "Never trades or moves money"], needs: "Composio Instant (COMPOSIO_API_KEY)" },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}

export interface OpportunityTemplate {
  id: string;
  name: string;
  /** Short line under the name, e.g. "Printables, art, templates". */
  subtitle: string;
  category: string;
  summary: string;
  requirements: string[];
  /** Honest, non-financial badge, e.g. "Beginner friendly". */
  badge: string;
  /** Agents that run this opportunity today. */
  agents: string[];
  /** Mission kind and agent started by "Join". */
  launch?: { kind: "sell_existing" | "start_business"; agentId: string };
  featured?: boolean;
  icon: "store" | "printables" | "video" | "shirt" | "briefcase" | "newsletter" | "box";
  accent: string;
  status: FeatureStatus;
}

/**
 * Opportunity templates describe business models and what they genuinely
 * require. They deliberately show no earnings figures: results depend on the
 * person, market and costs. "Joined" counts in the UI are real mission counts.
 */
export const OPPORTUNITY_TEMPLATES: readonly OpportunityTemplate[] = [
  {
    id: "dropshipping", name: "Dropshipping Store", subtitle: "AI setup + marketing", category: "Commerce", icon: "store", accent: "#2FBF71", featured: true, badge: "Needs a supplier",
    summary: "Sell products shipped by a verified supplier. EcomPro sets up the listing and launch checklist; you stay the seller of record.",
    requirements: ["Reliable, compliant supplier with real delivery times", "Seller responsibilities under EU consumer and product safety law", "Returns and refunds process"],
    agents: ["ecompro", "contentflow"], launch: { kind: "sell_existing", agentId: "ecompro" }, status: "TESTED_SIMULATION",
  },
  {
    id: "etsy-digital", name: "Etsy Digital Products", subtitle: "Printables, art, templates", category: "Digital", icon: "printables", accent: "#F26B3A", featured: true, badge: "Beginner friendly",
    summary: "Create printables and templates, sell them instantly from your Hustera store, and on Etsy once your Etsy account is connected via Composio.",
    requirements: ["Original or properly licensed designs", "Etsy seller account for Etsy listings (via Composio)", "VAT handling for digital sales"],
    agents: ["designstudio", "ecompro", "contentflow"], launch: { kind: "start_business", agentId: "designstudio" }, status: "TESTED_SIMULATION",
  },
  {
    id: "youtube-automation", name: "YouTube Automation", subtitle: "AI video content", category: "Media", icon: "video", accent: "#FF3D57", featured: true, badge: "Scalable",
    summary: "Plan and script original videos with AI and promote what you sell. Uploading to YouTube needs a YouTube connection via Composio.",
    requirements: ["Original scripts, footage or properly licensed media", "AI disclosure where platforms require it", "YouTube channel connected via Composio"],
    agents: ["contentflow"], status: "NEEDS_CONNECTION",
  },
  {
    id: "digital-products", name: "Digital products", subtitle: "Guides, templates, checklists", category: "Digital", icon: "printables", accent: "#6558F5", badge: "Instant delivery",
    summary: "Printables, templates and downloadable guides, delivered automatically after payment.",
    requirements: ["Original or properly licensed content", "A Hustera store (built in)", "Payment provider (test checkout until Stripe is connected)", "VAT handling for digital sales"],
    agents: ["designstudio", "ecompro"], launch: { kind: "start_business", agentId: "designstudio" }, status: "TESTED_SIMULATION",
  },
  {
    id: "existing-product", name: "Sell my existing product", subtitle: "Bring what you already make", category: "Commerce", icon: "box", accent: "#4EF2C2", badge: "Live today",
    summary: "Bring a product you already own and let EcomPro publish, promote and track it.",
    requirements: ["Proof of ownership or right to sell", "A Hustera store, or a store connection via Composio (e.g. Shopify)", "Payment provider", "Fulfilment and returns process"],
    agents: ["ecompro", "contentflow"], launch: { kind: "sell_existing", agentId: "ecompro" }, status: "VERIFIED",
  },
  {
    id: "pod", name: "Print-on-demand", subtitle: "Your designs, printed for you", category: "Commerce", icon: "shirt", accent: "#C04CF5", badge: "Needs a print partner",
    summary: "Original designs printed and shipped by a fulfilment partner.",
    requirements: ["Print-on-demand partner account (via Composio)", "Original artwork with commercial rights", "Product safety information", "Returns policy"],
    agents: ["ecompro"], status: "NEEDS_CONNECTION",
  },
  {
    id: "freelance", name: "Freelance services", subtitle: "Design, writing, video, dev", category: "Services", icon: "briefcase", accent: "#2FA8FF", badge: "Live today",
    summary: "Offer your services to clients in the Hustera marketplace.",
    requirements: ["A portfolio of your own work", "Clear capacity and delivery terms", "A service listing in the Hustera marketplace"],
    agents: [], status: "VERIFIED",
  },
  {
    id: "content", name: "Content & newsletter", subtitle: "Build an audience", category: "Media", icon: "newsletter", accent: "#FFC861", badge: "Long-term",
    summary: "Build an audience with original content and a newsletter.",
    requirements: ["Consistent publishing plan", "Email provider with consent and opt-out", "Disclosure for affiliate links"],
    agents: ["contentflow"], status: "NOT_BUILT",
  },
];
