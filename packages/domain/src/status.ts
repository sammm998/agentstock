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
  /** Agent started by "Join". */
  launch?: { agentId: string };
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
    agents: ["dropforge", "contentflow"], launch: { agentId: "dropforge" }, status: "VERIFIED",
  },
  {
    id: "etsy-digital", name: "Etsy Digital Products", subtitle: "Printables, art, templates", category: "Digital", icon: "printables", accent: "#F26B3A", featured: true, badge: "Beginner friendly",
    summary: "Create printables and templates, sell them instantly from your Hustera store, and on Etsy once your Etsy account is connected via Composio.",
    requirements: ["Original or properly licensed designs", "Etsy seller account for Etsy listings (via Composio)", "VAT handling for digital sales"],
    agents: ["digicraft", "pagesmith", "contentflow"], launch: { agentId: "digicraft" }, status: "TESTED_SIMULATION",
  },
  {
    id: "youtube-automation", name: "YouTube Automation", subtitle: "AI video content", category: "Media", icon: "video", accent: "#FF3D57", featured: true, badge: "Scalable",
    summary: "Plan and script original videos with AI and promote what you sell. Uploading to YouTube needs a YouTube connection via Composio.",
    requirements: ["Original scripts, footage or properly licensed media", "AI disclosure where platforms require it", "YouTube channel connected via Composio"],
    agents: ["tubeengine"], launch: { agentId: "tubeengine" }, status: "VERIFIED",
  },
  {
    id: "digital-products", name: "Digital products", subtitle: "Guides, templates, checklists", category: "Digital", icon: "printables", accent: "#6558F5", badge: "Instant delivery",
    summary: "Printables, templates and downloadable guides, delivered automatically after payment.",
    requirements: ["Original or properly licensed content", "A Hustera store (built in)", "Payment provider (test checkout until Stripe is connected)", "VAT handling for digital sales"],
    agents: ["digicraft", "ecompro"], launch: { agentId: "digicraft" }, status: "TESTED_SIMULATION",
  },
  {
    id: "existing-product", name: "Sell my existing product", subtitle: "Bring what you already make", category: "Commerce", icon: "box", accent: "#4EF2C2", badge: "Live today",
    summary: "Bring a product you already own and let EcomPro publish, promote and track it.",
    requirements: ["Proof of ownership or right to sell", "A Hustera store, or a store connection via Composio (e.g. Shopify)", "Payment provider", "Fulfilment and returns process"],
    agents: ["ecompro", "contentflow"], launch: { agentId: "ecompro" }, status: "VERIFIED",
  },
  {
    id: "pod", name: "Print-on-demand", subtitle: "Your designs, printed for you", category: "Commerce", icon: "shirt", accent: "#C04CF5", badge: "Needs a print partner",
    summary: "Original designs printed and shipped by a fulfilment partner.",
    requirements: ["Print-on-demand partner account (via Composio)", "Original artwork with commercial rights", "Product safety information", "Returns policy"],
    agents: ["printpilot"], launch: { agentId: "printpilot" }, status: "NEEDS_CONNECTION",
  },
  {
    id: "freelance", name: "Freelance services", subtitle: "Design, writing, video, dev", category: "Services", icon: "briefcase", accent: "#2FA8FF", badge: "Live today",
    summary: "Offer your services to clients in the Hustera marketplace.",
    requirements: ["A portfolio of your own work", "Clear capacity and delivery terms", "A service listing in the Hustera marketplace"],
    agents: ["gigmatch"], launch: { agentId: "gigmatch" }, status: "VERIFIED",
  },
  {
    id: "affiliate", name: "Affiliate marketing", subtitle: "Amazon, Awin, Impact, ClickBank…", category: "Media", icon: "newsletter", accent: "#FFC861", badge: "No inventory",
    summary: "Pick a niche from the big affiliate networks; LinkLoom writes SEO content, posts on social and tracks every click.",
    requirements: ["Approved account in the affiliate network", "Honest disclosure on every post", "Content that genuinely helps buyers"],
    agents: ["linkloom", "rankriver", "contentflow"], launch: { agentId: "linkloom" }, status: "VERIFIED",
  },
  {
    id: "content", name: "Content & newsletter", subtitle: "Build an audience", category: "Media", icon: "newsletter", accent: "#FFC861", badge: "Long-term",
    summary: "Build an audience with original content and a newsletter.",
    requirements: ["Consistent publishing plan", "Email provider with consent and opt-out", "Disclosure for affiliate links"],
    agents: ["mailmint", "contentflow"], launch: { agentId: "mailmint" }, status: "VERIFIED",
  },
];
