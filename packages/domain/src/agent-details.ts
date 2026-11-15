/**
 * Rich, human-readable detail for every agent: what it produces, how it works
 * under the hood, what it costs and where the money goes. Rendered on agent pages.
 */
import { getTool } from "./agents";
import { getAgent, type AgentDef } from "./workflows";

export type PreviewKind =
  | "store" | "scout" | "pod" | "product" | "prices" | "page" | "campaign" | "video" | "affiliate" | "seo" | "mail" | "ads"
  | "trading" | "fund" | "ledger" | "gigs" | "chat" | "data" | "inbox" | "lingo" | "studio" | "brief";

export interface AgentDetail {
  preview: PreviewKind;
  idealFor: string;
  /** What the user has in hand after a run. */
  deliverables: string[];
  /** How it works under the hood, in plain words. */
  engine: string[];
  /** Costs that happen outside the agent budget (never charged by Hustera). */
  external: string[];
}

export const AGENT_DETAILS: Record<string, AgentDetail> = {
  ecompro: {
    preview: "store", idealFor: "Creators with a finished product — a PDF, template, course or physical item — who want it selling today.",
    deliverables: ["Buyer & competitor research with sources", "Keyword list and price comparison", "Approved product listing", "Live product in your Hustera store", "Stripe payment link for bios and DMs", "Launch post to your followers"],
    engine: ["Searches the web through Composio Instant (Exa, Tavily, SerpApi) with automatic fallback when one source is down.", "Writes the listing from your brief and the research — never invents reviews or results.", "Publishes through Hustera's store and checkout; digital products deliver instantly after payment.", "Creates a Stripe Payment Link so money lands in your Stripe balance."],
    external: ["Stripe processing fees on each sale (≈1.5% + €0.25 in the EU)"],
  },
  dropforge: {
    preview: "scout", idealFor: "Dropshippers testing products from AliExpress, CJ, Zendrop or local suppliers who want to launch only what makes money.",
    deliverables: ["Ranked product scorecard with margin per sale", "Winner launched in your store at your price", "Supplier & EU compliance checklist (GPSR, returns, IOSS)", "Stripe payment link", "7-day social campaign, posted automatically every day"],
    engine: ["Scans the niche for demand signals and buyer complaints.", "Scores every candidate: price excl. 25% VAT − supplier cost − payment fees, plus shipping speed and demand mentions.", "Refuses to launch if nothing makes money after fees.", "Hands the winner to EcomPro to list and ContentFlow to post the campaign."],
    external: ["Supplier cost and shipping per order — paid by you to the supplier", "Stripe fees on each sale", "Optional paid ads (never run by the agent)"],
  },
  printpilot: {
    preview: "pod", idealFor: "Print-on-demand sellers (Printful, Printify, Gelato) who need original designs for a niche.",
    deliverables: ["Niche research and trademark warnings", "Five original design concepts with slogans", "AI-generated artwork, labelled as AI", "Rights review signed by you", "Listing ready for your store"],
    engine: ["Researches what resonates in the niche and which phrases are trademarked.", "Drafts concepts, then generates artwork for the best one.", "Blocks publishing until you confirm nothing infringes rights."],
    external: ["Print & fulfilment cost per order at your POD provider"],
  },
  digicraft: {
    preview: "product", idealFor: "Anyone who wants a digital product — guide, planner, checklist — created from an idea.",
    deliverables: ["Research brief", "The full product written by AI", "Cover image", "Rights & quality review", "Live listing and payment link"],
    engine: ["Uses the connected AI model to write the product content.", "Every AI output is reviewed and approved by you before it's sold.", "Delivers automatically to buyers after payment."],
    external: ["Stripe fees on each sale"],
  },
  pricescout: {
    preview: "prices", idealFor: "Sellers with live products who want to know if their prices are in line with the market.",
    deliverables: ["Daily price report: your price vs market median", "Position per product: below, in line or above"],
    engine: ["Searches Google Shopping through SerpApi for each live product.", "Filters out junk prices and computes the median.", "Never changes your prices — it only reports."],
    external: [],
  },
  pagesmith: {
    preview: "page", idealFor: "Sellers who want one focused page to send traffic to from ads, bios or emails.",
    deliverables: ["Headline, benefits and FAQ written for your audience", "Published landing page at hustera/p/your-page", "Buy button wired to your checkout or Stripe link"],
    engine: ["Writes copy from your product description — with AI when connected, otherwise from a proven template.", "Publishes only after your approval; views are counted."],
    external: [],
  },
  contentflow: {
    preview: "campaign", idealFor: "Sellers who want consistent social posting without writing every day.",
    deliverables: ["Seven posts with different hooks", "Day 1 posted immediately", "Days 2–7 auto-posted at 09:00 UTC"],
    engine: ["Plans a week of hooks: problem, use-cases, behind the scenes, FAQ, last call.", "Posts to your Hustera feed through the background worker; TikTok, Instagram and X are added when connected.", "No fake scarcity or invented claims."],
    external: [],
  },
  tubeengine: {
    preview: "video", idealFor: "Faceless or personal YouTube channels that need a steady pipeline of ideas and scripts.",
    deliverables: ["Ten video ideas for your niche", "Three full scripts with title, description and tags", "Thumbnail concepts and image prompts", "Weekly upload schedule"],
    engine: ["Researches the niche, then generates ideas and scripts with AI (outlines without AI).", "Repeats weekly with fresh ideas when scheduled.", "Uploading needs a YouTube connection — the agent never uploads without your approval."],
    external: ["Voice-over or editing tools you choose to use"],
  },
  linkloom: {
    preview: "affiliate", idealFor: "Affiliate marketers on Amazon, Awin, Impact, ClickBank, PartnerStack, Adtraction or Scoutr Partner.",
    deliverables: ["Buyer-intent keyword plan for your niche", "Tracked short links with click counting", "Comparison article with disclosure", "7-day social campaign using your links", "Weekly click report"],
    engine: ["Pick a network and niche — keywords and angles come from the built-in niche catalog.", "Every link goes through /go/… so clicks are counted and the disclosure is shown.", "Commissions are paid by the network; you record them in your wallet."],
    external: ["Commissions are paid to you directly by the affiliate network"],
  },
  rankriver: {
    preview: "seo", idealFor: "Stores and blogs that want organic Google traffic.",
    deliverables: ["Keyword research", "Keyword map by search intent", "Content briefs per keyword", "On-page SEO checklist"],
    engine: ["Pulls keyword ideas through Composio Instant when connected.", "Groups keywords by intent (buy, compare, learn) and maps them to page types."],
    external: [],
  },
  mailmint: {
    preview: "mail", idealFor: "Sellers with an email list (or starting one) who want a launch or welcome sequence.",
    deliverables: ["Five-email sequence with subjects and timing", "GDPR consent checklist"],
    engine: ["Writes honest emails with one call to action each.", "Sending needs a Resend key; until then the emails stay drafts."],
    external: ["Email sending service (e.g. Resend) if you send at volume"],
  },
  adcraft: {
    preview: "ads", idealFor: "Sellers preparing Meta, TikTok or Google ads.",
    deliverables: ["Ad angles: pain, desire, proof, offer, objection", "Copy variants per platform"],
    engine: ["Writes within ad-platform policies — no guarantees or before/after claims.", "Never launches ads and never spends ad money."],
    external: ["Your ad spend on Meta/TikTok/Google — only if you decide to run ads"],
  },
  cryptopulse: {
    preview: "trading", idealFor: "Members who want to learn systematic crypto trading without risking money.",
    deliverables: ["Live prices for your watchlist", "SMA 7/21, RSI 14 and volatility per coin", "AI market note", "Rule-based trades in your paper portfolio", "Notification on every trade"],
    engine: ["Fetches 30 days of prices from CoinGecko.", "Decisions come from fixed rules — buy uptrends that aren't overbought, sell downtrends, stop losses, position limits and a drawdown stop.", "The AI only writes the explanation; it can't place trades.", "Virtual €10,000. Real-money trading and profit sharing stay disabled until Hustera is licensed."],
    external: [],
  },
  stocksense: {
    preview: "trading", idealFor: "Members who want to practise stock and ETF strategies on real prices.",
    deliverables: ["Daily price history", "Trend, momentum and volatility signals", "AI market note", "Paper trades with risk limits"],
    engine: ["Daily closes from Stooq for US tickers.", "Same transparent rules engine as CryptoPulse.", "Virtual $10,000 — no real orders are ever sent."],
    external: [],
  },
  "hustera-fund": {
    preview: "fund", idealFor: "The Hustera team's public showcase portfolio.",
    deliverables: ["Public paper portfolio with every trade visible"],
    engine: ["Runs the same rules engine on a public portfolio.", "Real money and member profit sharing require authorisation and are switched off."],
    external: [],
  },
  revenuedesk: {
    preview: "ledger", idealFor: "Everyone selling on Hustera who wants honest numbers.",
    deliverables: ["Daily or weekly revenue report", "Refunds, costs and profit", "Live Stripe balance when connected"],
    engine: ["Reads your Hustera ledger and, with Stripe connected, your balance and latest charges.", "Read-only — it never moves money."],
    external: [],
  },
  gigmatch: {
    preview: "gigs", idealFor: "Freelancers who want to sell a service on the Hustera marketplace.",
    deliverables: ["Demand scan by category", "Service offer with scope, delivery time and revisions", "Published service after your approval"],
    engine: ["Compares completed contracts with open services per category.", "Matches categories to the skills you describe.", "Contracts and payments run through Hustera's escrow-style marketplace."],
    external: [],
  },
  replyr: {
    preview: "chat", idealFor: "Stores and businesses that get the same customer questions every day.",
    deliverables: ["Chat widget trained on your site and documents", "Answers in 50+ languages, 24/7", "Hand-off to you for anything it can't answer"],
    engine: ["Runs in Chattagent, our partner's product.", "You connect your site; it learns products, policies and tone."],
    external: ["Partner subscription, billed by the partner"],
  },
  insightlens: {
    preview: "data", idealFor: "Anyone with spreadsheets, PDFs or reports they need answers from.",
    deliverables: ["Plain-language answers about your data", "Charts and tables", "Shareable report"],
    engine: ["Runs in Scoutr Data.", "Upload files and ask questions in plain language."],
    external: ["Partner subscription, billed by the partner"],
  },
  daybreak: {
    preview: "inbox", idealFor: "Busy founders who live in email, calendar and docs.",
    deliverables: ["Drafted replies", "Planned week in your calendar", "Updated docs and tasks"],
    engine: ["Runs in Scoutr AI across Gmail, Calendar, Slack, Notion and GitHub.", "Acts only with your approval."],
    external: ["Partner subscription, billed by the partner"],
  },
  lingocoach: {
    preview: "lingo", idealFor: "Members learning a language for travel, work or new markets.",
    deliverables: ["Conversation practice", "Word cards and syllables", "Pronunciation feedback"],
    engine: ["Runs in Lingo by Scoutr Learn."],
    external: ["Partner subscription, billed by the partner"],
  },
  studioshot: {
    preview: "studio", idealFor: "Stores that need product photos, motion videos and ad creatives.",
    deliverables: ["Studio-style product photos", "Short motion videos", "Campaign creatives per channel"],
    engine: ["Runs in Forma: paste your store URL and it reads your products."],
    external: ["Partner subscription, billed by the partner"],
  },
  scoutbrief: {
    preview: "brief", idealFor: "Professionals who want to keep up with their industry in minutes a week.",
    deliverables: ["Weekly personalised industry brief"],
    engine: ["Runs in Scoutr: learns your role from your LinkedIn and scouts news, tools and changes."],
    external: ["Partner subscription, billed by the partner"],
  },
};

export type CostKind = "data" | "ai" | "free" | "stripe" | "market" | "partner";

export const COST_KIND_LABEL: Record<CostKind, string> = {
  data: "Live web & market data",
  ai: "AI model (writing, analysis, images)",
  free: "Runs on Hustera — free",
  stripe: "Stripe (fees only when you sell)",
  market: "Public market data",
  partner: "Partner product",
};

function costKind(toolId: string, provider: string): CostKind {
  if (provider === "partner") return "partner";
  if (provider === "stripe") return "stripe";
  if (provider === "markets") return toolId === "markets.analyze" ? "ai" : "market";
  if (provider === "instant") return "data";
  if (provider === "llm" || toolId.startsWith("ai.")) return "ai";
  if (/^(pod|yt|aff\.articles|seo\.briefs|mail\.sequence|ads|pages\.generate|gigs\.service_draft|social\.campaign_plan)/.test(toolId)) return "ai";
  return "free";
}

export interface BudgetLine {
  key: string;
  title: string;
  kind: CostKind;
  maxCents: number;
}

/** Where a run's budget can go, step by step (upper bounds, never exceeded). */
export function budgetBreakdown(agentOrId: AgentDef | string): { lines: BudgetLine[]; totalMaxCents: number; byKind: { kind: CostKind; cents: number; steps: number }[] } {
  const agent = typeof agentOrId === "string" ? getAgent(agentOrId) : agentOrId;
  if (!agent) return { lines: [], totalMaxCents: 0, byKind: [] };
  const lines = agent.steps.map((s) => {
    const tool = getTool(s.toolId);
    return { key: s.key, title: s.title, kind: costKind(s.toolId, tool?.provider ?? "sandbox"), maxCents: tool?.maxCostCents ?? 0 };
  });
  const kinds = new Map<CostKind, { cents: number; steps: number }>();
  for (const l of lines) {
    const k = kinds.get(l.kind) ?? { cents: 0, steps: 0 };
    k.cents += l.maxCents;
    k.steps += 1;
    kinds.set(l.kind, k);
  }
  return { lines, totalMaxCents: lines.reduce((a, l) => a + l.maxCents, 0), byKind: [...kinds].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.cents - a.cents) };
}
