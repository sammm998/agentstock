/**
 * The Hustera agent network. Every agent is declared once here: who it is,
 * what it asks the user for, and the workflow it runs. Forms, visual workflow
 * diagrams, plans and catalog pages are all generated from these definitions.
 */
import type { FeatureStatus } from "./status";
import { AFFILIATE_NETWORKS } from "./affiliate";

export type AgentCategory = "Commerce" | "Growth" | "Markets" | "Operations" | "Partner";

export type AgentIconKey =
  | "bag" | "truck" | "shirt" | "palette" | "radar" | "layout" | "play" | "video" | "link" | "trend"
  | "mail" | "megaphone" | "bitcoin" | "chart" | "vault" | "ledger" | "briefcase" | "chat" | "lens" | "sun" | "book" | "camera" | "compass" | "bot";

export interface InputField {
  name: string;
  label: string;
  type: "text" | "textarea" | "money" | "select" | "product" | "checkbox" | "lines";
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string; group?: string }[];
  defaultValue?: string;
  maxLength?: number;
}

export interface WorkflowStep {
  key: string;
  agentId: string;
  toolId: string;
  title: string;
  dependsOn: string[];
  /** Plain-language explanation shown in the visual workflow. */
  explain: string;
  /** Only included when this input is truthy. */
  when?: string;
}

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  category: AgentCategory;
  icon: AgentIconKey;
  accent: string;
  /** One line shown on cards. */
  tagline: string;
  summary: string;
  status: FeatureStatus;
  /** What unlocks the full workflow, if anything is missing today. */
  needs?: string;
  featured?: boolean;
  /** Only platform admins can launch it. */
  adminOnly?: boolean;
  inputs: InputField[];
  steps: WorkflowStep[];
  /** Allowed repeat intervals in hours; the first is the default. */
  repeat?: number[];
  /** Partner agents hand the user over to a Scoutr product instead of running steps. */
  partner?: { product: string; key: string; highlights: string[] };
}

// ---------------------------------------------------------------- shared inputs

const productName: InputField = { name: "title", label: "Product name", type: "text", required: true, maxLength: 80, placeholder: "Budget meal planner (PDF)" };
const productBrief: InputField = { name: "brief", label: "Describe the product for buyers", type: "textarea", required: true, maxLength: 2000, help: "Shown to buyers. Be accurate — no claims you can't back up." };
const price: InputField = { name: "price", label: "Price incl. VAT (€)", type: "money", required: true, defaultValue: "9.00" };
const ownership: InputField = { name: "ownershipConfirmed", label: "I own this product or am authorised to sell it, and I'm responsible for it as the seller.", type: "checkbox", required: true };
const yourProduct: InputField = { name: "productId", label: "Product", type: "product", required: true, help: "One of your published products." };
const niche: InputField = { name: "niche", label: "Niche", type: "text", required: true, maxLength: 80, placeholder: "Home fitness for beginners" };

const s = (key: string, agentId: string, toolId: string, title: string, explain: string, dependsOn: string[] = [], when?: string): WorkflowStep => ({ key, agentId, toolId, title, explain, dependsOn, when });

// Common tail: listing → store → Stripe link → announcement
const sellSteps = (after: string[], extra: string[] = []): WorkflowStep[] => [
  s("checklist", "core", "sandbox.compliance_checklist", "Prepare launch checklist", "Rights, consumer law, VAT and platform rules to confirm before selling.", after),
  s("listing", "ecompro", "sandbox.listing_draft", "Write the product listing", "An honest listing written for buyers, using the keywords found. You approve it.", after),
  s("publish", "ecompro", "hustera.publish_to_store", "Publish to your Hustera store", "Goes live in your store after your approval.", ["listing", "checklist", ...extra]),
  s("paylink", "ecompro", "stripe.payment_link", "Create a Stripe payment link", "A shareable checkout link — money lands in your Stripe balance.", ["publish"]),
];

// ---------------------------------------------------------------- agents

export const AGENTS: readonly AgentDef[] = [
  // ------------------------------------------------ Commerce
  {
    id: "ecompro", name: "EcomPro", role: "E-commerce agent", category: "Commerce", icon: "bag", accent: "#6558F5", featured: true, status: "VERIFIED",
    tagline: "Sell a product you own — from listing to Stripe link.",
    summary: "Researches buyers, builds the offer, writes the listing, publishes to your store with a Stripe payment link and announces it to your followers.",
    inputs: [productName, productBrief, price, { name: "productKind", label: "Type", type: "select", options: [{ value: "digital", label: "Digital (instant delivery)" }, { value: "physical", label: "Physical (you ship it)" }, { value: "service", label: "Service" }], defaultValue: "digital" }, { name: "deliveryContent", label: "Delivery for digital products", type: "textarea", maxLength: 5000, placeholder: "Download link or the content buyers get right after paying" }, ownership, { name: "externalChannel", label: "Also publish to my external store via Composio", type: "checkbox" }],
    steps: [
      s("research", "research", "instant.market_research", "Research buyers and competitors", "Searches the web for what buyers want and what competitors charge, with sources."),
      s("seo", "rankriver", "instant.keyword_research", "Find search keywords", "Keywords people actually search for, used in the listing.", ["research"]),
      s("prices", "pricescout", "instant.competitor_prices", "Check competitor prices", "Compares your price with similar listings — never changes it automatically.", ["research"]),
      s("offer", "core", "sandbox.offer_outline", "Build the offer", "Audience, promise and a unit-economics worksheet.", ["research", "prices"]),
      ...sellSteps(["offer", "seo"]),
      s("promo", "contentflow", "sandbox.promo_drafts", "Draft promotion posts", "Three honest launch posts with the price and link.", ["publish", "paylink"]),
      s("post", "contentflow", "hustera.promote_post", "Announce to your followers", "Posts the approved announcement to your feed.", ["promo"]),
      s("external", "ecompro", "composio.publish_listing", "Publish to your external store", "Lists it on Shopify or similar through your connection.", ["publish"], "externalChannel"),
    ],
  },
  {
    id: "dropforge", name: "DropForge", role: "Dropshipping agent", category: "Commerce", icon: "truck", accent: "#2FBF71", featured: true, status: "VERIFIED",
    needs: "Live trend data needs Composio Instant; posting to TikTok/Instagram needs a connection",
    tagline: "Finds winning products, launches them and runs the social campaign.",
    summary: "Scores product candidates on demand, margin and competition, prepares the supplier checklist, launches the best one in your store and runs a 7-day social campaign automatically.",
    inputs: [
      niche,
      { name: "candidates", label: "Product candidates", type: "lines", required: true, help: "One per line: name | supplier cost € | planned price € | shipping days", placeholder: "Posture corrector | 6.50 | 24.90 | 8\nLED desk lamp | 11 | 39 | 10", maxLength: 3000 },
      ownership,
    ],
    steps: [
      s("trends", "research", "instant.market_research", "Scan trends in the niche", "Searches what's selling and what buyers complain about in the niche."),
      s("scout", "dropforge", "drop.product_scout", "Score every product", "Ranks candidates by margin after fees and shipping, delivery time and demand signals — picks the winner.", ["trends"]),
      s("supplier", "dropforge", "drop.supplier_checklist", "Supplier & compliance checklist", "Delivery times, returns, product safety (GPSR) and EU seller duties for the winner.", ["scout"]),
      s("listing", "ecompro", "sandbox.listing_draft", "Write the product listing", "Benefit-led listing with real delivery times. You approve it.", ["scout"]),
      s("publish", "ecompro", "hustera.publish_to_store", "Launch in your store", "Goes live after your approval — you stay the seller of record.", ["listing", "supplier"]),
      s("paylink", "ecompro", "stripe.payment_link", "Create a Stripe payment link", "One link for bios, ads and DMs.", ["publish"]),
      s("campaign", "contentflow", "social.campaign_plan", "Plan a 7-day social campaign", "Hooks, angles and posts for each day — TikTok, Instagram and your feed.", ["publish"]),
      s("schedule", "contentflow", "social.schedule_posts", "Auto-post the campaign", "After your approval, posts go out daily at the planned times.", ["campaign", "paylink"]),
    ],
  },
  {
    id: "printpilot", name: "PrintPilot", role: "Print-on-demand agent", category: "Commerce", icon: "shirt", accent: "#C04CF5", status: "NEEDS_CONNECTION",
    needs: "AI designs need COMPOSIO_API_KEY or an AI key; printing needs a POD partner connection",
    tagline: "Original designs for shirts, mugs and posters — ready to sell.",
    summary: "Turns a niche into original design concepts and artwork, writes the listing and prepares it for your print-on-demand partner.",
    inputs: [niche, { name: "title", label: "Collection name", type: "text", required: true, maxLength: 80 }, { name: "brief", label: "Style and audience", type: "textarea", required: true, maxLength: 1000 }, price],
    steps: [
      s("research", "research", "instant.market_research", "Research the niche", "What designs and phrases resonate — and which trademarks to avoid."),
      s("concepts", "printpilot", "pod.design_concepts", "Create design concepts", "Five original concepts with slogans and artwork prompts.", ["research"]),
      s("cover", "printpilot", "instant.cover_image", "Generate the artwork", "Original AI artwork for the best concept, labelled AI-generated.", ["concepts"]),
      s("rights", "core", "hustera.rights_qa", "Rights & quality review", "You confirm nothing infringes trademarks or copyrights.", ["cover"]),
      s("listing", "ecompro", "sandbox.listing_draft", "Write the listing", "Product copy for the collection.", ["concepts"]),
      s("publish", "ecompro", "hustera.publish_to_store", "Save to your store", "Saved for your print partner setup, then published.", ["listing", "rights"]),
    ],
  },
  {
    id: "digicraft", name: "DigiCraft", role: "Digital product agent", category: "Commerce", icon: "palette", accent: "#9B5CF6", featured: true, status: "NEEDS_CONNECTION",
    needs: "Writing the product needs COMPOSIO_API_KEY (Gemini via Instant) or an AI key",
    tagline: "Creates a digital product with AI and sells it for you.",
    summary: "Writes a complete guide, template or checklist with AI, designs a cover, waits for your rights review, then sells and delivers it automatically.",
    inputs: [{ name: "title", label: "Product idea", type: "text", required: true, maxLength: 80, placeholder: "Study planner for university students" }, { name: "brief", label: "Who is it for and what should it include?", type: "textarea", required: true, maxLength: 2000 }, price],
    steps: [
      s("research", "research", "instant.market_research", "Research demand", "What buyers in this niche are looking for, with sources."),
      s("seo", "rankriver", "instant.keyword_research", "Find search keywords", "Search terms for the title and listing.", ["research"]),
      s("prices", "pricescout", "instant.competitor_prices", "Check competitor prices", "Comparable products and their prices.", ["research"]),
      s("offer", "core", "sandbox.offer_outline", "Build the offer", "Audience, promise and pricing worksheet.", ["research", "prices"]),
      s("generate", "digicraft", "ai.generate_product", "Write the product", "The complete product content, written by AI from your brief.", ["offer"]),
      s("cover", "digicraft", "instant.cover_image", "Design a cover", "An original AI cover image.", ["generate"]),
      s("rights", "core", "hustera.rights_qa", "Rights & quality review", "You check accuracy and originality before anything is sold.", ["generate", "cover"]),
      ...sellSteps(["offer", "seo"], ["rights"]),
      s("promo", "contentflow", "sandbox.promo_drafts", "Draft promotion posts", "Launch posts with the price and link.", ["publish", "paylink"]),
      s("post", "contentflow", "hustera.promote_post", "Announce to your followers", "Posts the approved announcement.", ["promo"]),
    ],
  },
  {
    id: "pricescout", name: "PriceScout", role: "Price monitoring agent", category: "Commerce", icon: "radar", accent: "#2FA8FF", status: "NEEDS_CONNECTION", repeat: [24, 168],
    needs: "Competitor prices come from SerpApi via Composio Instant",
    tagline: "Watches competitor prices for your products every day.",
    summary: "Checks comparable listings for each of your live products, flags where you're far above or below the market and sends you the report.",
    inputs: [],
    steps: [s("watch", "pricescout", "price.watch_products", "Scan competitor prices", "For every live product: lowest, median and highest comparable price, and where you stand.")],
  },
  {
    id: "pagesmith", name: "PageSmith", role: "Landing page agent", category: "Commerce", icon: "layout", accent: "#4EF2C2", featured: true, status: "VERIFIED",
    tagline: "A high-converting landing page for any of your products.",
    summary: "Builds a fast, mobile-ready landing page for one of your products — headline, benefits, FAQ and a buy button — and publishes it after your approval.",
    inputs: [yourProduct, { name: "audience", label: "Who is the page for?", type: "text", maxLength: 120, placeholder: "Busy students on a budget" }],
    steps: [
      s("draft", "pagesmith", "pages.generate", "Write the landing page", "Headline, benefits, objections, FAQ and call to action from your product."),
      s("publish", "pagesmith", "pages.publish", "Publish the page", "Goes live at its own address after your approval.", ["draft"]),
    ],
  },

  // ------------------------------------------------ Growth
  {
    id: "contentflow", name: "ContentFlow", role: "Social media agent", category: "Growth", icon: "play", accent: "#FF5C8A", featured: true, status: "VERIFIED", repeat: [168],
    needs: "Posting to TikTok, Instagram or X needs a connection",
    tagline: "A week of social content, written and posted for you.",
    summary: "Plans a 7-day content calendar for a product, writes every post and publishes them automatically at the planned times after your approval.",
    inputs: [yourProduct, { name: "tone", label: "Tone", type: "select", options: [{ value: "friendly", label: "Friendly" }, { value: "expert", label: "Expert" }, { value: "playful", label: "Playful" }], defaultValue: "friendly" }],
    steps: [
      s("campaign", "contentflow", "social.campaign_plan", "Plan the content week", "Seven posts with hooks, angles and hashtags."),
      s("schedule", "contentflow", "social.schedule_posts", "Auto-post every day", "Posts go out daily at the planned time after your approval.", ["campaign"]),
    ],
  },
  {
    id: "tubeengine", name: "TubeEngine", role: "YouTube automation agent", category: "Growth", icon: "video", accent: "#FF3D57", featured: true, status: "VERIFIED", repeat: [168],
    needs: "Full scripts need an AI model; uploading needs a YouTube connection",
    tagline: "Video ideas, scripts and a publishing plan for your channel.",
    summary: "Finds video ideas in your niche, writes scripts, titles, descriptions and tags, plans thumbnails and builds a weekly upload schedule.",
    inputs: [niche, { name: "format", label: "Format", type: "select", options: [{ value: "faceless", label: "Faceless (voice-over + b-roll)" }, { value: "shorts", label: "Shorts" }, { value: "tutorial", label: "Tutorials" }], defaultValue: "faceless" }],
    steps: [
      s("research", "research", "instant.market_research", "Research the niche", "What viewers search for and what's already performing."),
      s("ideas", "tubeengine", "yt.ideas", "Find 10 video ideas", "Ideas ranked by search intent and evergreen potential.", ["research"]),
      s("scripts", "tubeengine", "yt.scripts", "Write scripts & metadata", "Hook, outline, script, title, description and tags for the top ideas.", ["ideas"]),
      s("thumbs", "tubeengine", "yt.thumbnails", "Plan thumbnails", "Thumbnail concepts and image prompts.", ["scripts"]),
      s("plan", "tubeengine", "yt.publish_plan", "Build the upload schedule", "A weekly publishing calendar you can follow — or connect YouTube to upload.", ["scripts"]),
    ],
  },
  {
    id: "linkloom", name: "LinkLoom", role: "Affiliate marketing agent", category: "Growth", icon: "link", accent: "#FFC861", featured: true, status: "VERIFIED", repeat: [168],
    tagline: "Affiliate niche, SEO content, social posts and tracked links.",
    summary: "Picks a niche from the big affiliate networks, plans keywords, drafts SEO articles, creates tracked links, posts on social and reports clicks every week.",
    inputs: [
      { name: "network", label: "Affiliate network & niche", type: "select", required: true, options: AFFILIATE_NETWORKS.flatMap((n) => n.niches.map((x) => ({ value: `${n.id}:${x.id}`, label: x.name, group: n.name }))) },
      { name: "links", label: "Your affiliate links", type: "lines", required: true, help: "One per line: product name | your affiliate URL (from the network dashboard)", placeholder: "Adjustable dumbbells | https://amzn.to/xxxx", maxLength: 3000 },
    ],
    steps: [
      s("keywords", "rankriver", "aff.keyword_plan", "Plan keywords", "Buyer-intent keywords for the niche: reviews, comparisons, 'best for'."),
      s("links", "linkloom", "aff.create_links", "Create tracked links", "Short Hustera links that count every click and show the disclosure.", ["keywords"]),
      s("articles", "linkloom", "aff.articles", "Draft SEO articles", "Comparison and review articles with your links and an honest disclosure.", ["links"]),
      s("campaign", "contentflow", "social.campaign_plan", "Plan social posts", "A week of posts pointing to your best articles and links.", ["articles"]),
      s("schedule", "contentflow", "social.schedule_posts", "Auto-post the week", "Posts go out daily after your approval.", ["campaign"]),
      s("report", "linkloom", "aff.report", "Weekly click report", "Clicks per link and per day — record commissions in your wallet.", ["links"]),
    ],
  },
  {
    id: "rankriver", name: "RankRiver", role: "SEO agent", category: "Growth", icon: "trend", accent: "#7BFFD9", status: "VERIFIED", repeat: [168],
    needs: "Search volumes need Composio Instant (DataForSEO or Semrush)",
    tagline: "Keyword map, content briefs and on-page fixes.",
    summary: "Builds a keyword map for your product or site, writes content briefs for the best opportunities and an on-page checklist.",
    inputs: [{ name: "title", label: "Product or site topic", type: "text", required: true, maxLength: 80 }, { name: "brief", label: "What do you sell and to whom?", type: "textarea", required: true, maxLength: 1000 }],
    steps: [
      s("seo", "rankriver", "instant.keyword_research", "Find search keywords", "Keyword ideas with volumes when available."),
      s("map", "rankriver", "seo.keyword_map", "Build the keyword map", "Groups keywords by intent: buy, compare, learn.", ["seo"]),
      s("briefs", "rankriver", "seo.briefs", "Write content briefs", "Title, outline, questions to answer and internal links for each page.", ["map"]),
      s("onpage", "rankriver", "seo.onpage_checklist", "On-page checklist", "Titles, meta descriptions, headings, speed and schema to fix.", ["map"]),
    ],
  },
  {
    id: "mailmint", name: "MailMint", role: "Email marketing agent", category: "Growth", icon: "mail", accent: "#A8B4FF", status: "VERIFIED",
    needs: "Sending needs RESEND_API_KEY and a consented list",
    tagline: "Welcome and launch email sequences that respect consent.",
    summary: "Writes a welcome sequence and launch emails for one of your products, plus the consent and unsubscribe checklist.",
    inputs: [yourProduct, { name: "goal", label: "Goal", type: "select", options: [{ value: "launch", label: "Launch a product" }, { value: "welcome", label: "Welcome new subscribers" }], defaultValue: "launch" }],
    steps: [
      s("sequence", "mailmint", "mail.sequence", "Write the email sequence", "Five emails with subject lines, timing and a clear call to action."),
      s("consent", "mailmint", "mail.consent_checklist", "Consent checklist", "GDPR consent, unsubscribe and sender identity before anything is sent.", ["sequence"]),
    ],
  },
  {
    id: "adcraft", name: "AdCraft", role: "Ad creative agent", category: "Growth", icon: "megaphone", accent: "#FF8A3D", status: "VERIFIED",
    tagline: "Ad angles, copy variants and creative briefs — never spends.",
    summary: "Finds the strongest angles for a product and writes ad copy variants and creative briefs for Meta, TikTok and Google. It never launches or pays for ads.",
    inputs: [yourProduct],
    steps: [
      s("angles", "adcraft", "ads.angles", "Find ad angles", "Pain, desire, proof and offer angles for your audience."),
      s("copy", "adcraft", "ads.copy", "Write copy variants", "Headlines and primary text per platform, within ad-policy rules.", ["angles"]),
    ],
  },

  // ------------------------------------------------ Markets
  {
    id: "cryptopulse", name: "CryptoPulse", role: "Crypto trading agent", category: "Markets", icon: "bitcoin", accent: "#F7931A", featured: true, status: "TESTED_SIMULATION", repeat: [1, 4, 24],
    needs: "Trades a simulated €10,000 portfolio with live prices. Real-money trading is disabled until licensed.",
    tagline: "Analyses the crypto market and trades a live paper portfolio.",
    summary: "Pulls live prices, computes trend and momentum (SMA crossover, RSI, volatility), writes an AI market note and buys or sells in your paper portfolio with strict risk limits.",
    inputs: [
      { name: "watchlist", label: "Coins", type: "text", required: true, defaultValue: "bitcoin, ethereum, solana", help: "CoinGecko ids, comma separated." },
      { name: "risk", label: "Risk level", type: "select", options: [{ value: "low", label: "Low — max 10% per position" }, { value: "medium", label: "Medium — max 20%" }, { value: "high", label: "High — max 35%" }], defaultValue: "medium" },
    ],
    steps: [
      s("prices", "cryptopulse", "markets.prices", "Fetch live prices", "30 days of price history for every coin on the watchlist."),
      s("analyze", "cryptopulse", "markets.analyze", "Analyse the market", "SMA 7/21 crossover, RSI 14 and volatility, plus an AI market note.", ["prices"]),
      s("trade", "cryptopulse", "markets.trade", "Trade the paper portfolio", "Buys and sells by the rules, with position limits and a drawdown stop.", ["analyze"]),
    ],
  },
  {
    id: "stocksense", name: "StockSense", role: "Stock trading agent", category: "Markets", icon: "chart", accent: "#3DDC97", featured: true, status: "TESTED_SIMULATION", repeat: [24, 4],
    needs: "Trades a simulated €10,000 portfolio with live prices. Real-money trading is disabled until licensed.",
    tagline: "Analyses stocks and ETFs and trades a live paper portfolio.",
    summary: "Daily prices for your watchlist, trend and momentum analysis, an AI note and rule-based trades in a paper portfolio.",
    inputs: [
      { name: "watchlist", label: "Tickers", type: "text", required: true, defaultValue: "AAPL, MSFT, NVDA, SPY", help: "US tickers, comma separated." },
      { name: "risk", label: "Risk level", type: "select", options: [{ value: "low", label: "Low — max 10% per position" }, { value: "medium", label: "Medium — max 20%" }, { value: "high", label: "High — max 35%" }], defaultValue: "low" },
    ],
    steps: [
      s("prices", "stocksense", "markets.prices", "Fetch live prices", "Daily price history for every ticker."),
      s("analyze", "stocksense", "markets.analyze", "Analyse the market", "Trend, momentum and volatility, plus an AI market note.", ["prices"]),
      s("trade", "stocksense", "markets.trade", "Trade the paper portfolio", "Rule-based buys and sells with risk limits.", ["analyze"]),
    ],
  },
  {
    id: "hustera-fund", name: "Hustera Fund", role: "Community showcase portfolio", category: "Markets", icon: "vault", accent: "#4EF2C2", status: "TESTED_SIMULATION", adminOnly: true, repeat: [4, 24],
    needs: "Public simulation. Sharing real profits with members needs a fund licence (AIF/portfolio management) — disabled until approved.",
    tagline: "The platform's own strategy, fully public — trade by trade.",
    summary: "A public, transparent paper portfolio run by Hustera's strategy. Every trade and its reasoning is visible to all members.",
    inputs: [{ name: "watchlist", label: "Assets", type: "text", required: true, defaultValue: "bitcoin, ethereum" }, { name: "risk", label: "Risk level", type: "select", options: [{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }], defaultValue: "low" }],
    steps: [
      s("prices", "hustera-fund", "markets.prices", "Fetch live prices", "Price history for every asset."),
      s("analyze", "hustera-fund", "markets.analyze", "Analyse the market", "Trend, momentum, volatility and an AI note.", ["prices"]),
      s("trade", "hustera-fund", "markets.trade", "Trade the public portfolio", "Rule-based trades, published live to all members.", ["analyze"]),
    ],
  },

  // ------------------------------------------------ Operations
  {
    id: "revenuedesk", name: "RevenueDesk", role: "Revenue & bookkeeping agent", category: "Operations", icon: "ledger", accent: "#4EF2C2", status: "VERIFIED", repeat: [24, 168],
    tagline: "What you actually earned — every day.",
    summary: "Reports verified sales, refunds, costs and profit from your ledger, plus your live Stripe balance and latest payments.",
    inputs: [],
    steps: [s("report", "revenuedesk", "stripe.revenue_report", "Build the revenue report", "Ledger results and, with Stripe connected, your live balance and payments.")],
  },
  {
    id: "gigmatch", name: "GigMatch", role: "Freelance agent", category: "Operations", icon: "briefcase", accent: "#2FA8FF", status: "VERIFIED",
    tagline: "Turns your skills into a service people are buying.",
    summary: "Scans marketplace demand, finds the best category for your skills, drafts a clear service offer and publishes it after your approval.",
    inputs: [{ name: "brief", label: "Your skills and experience", type: "textarea", required: true, maxLength: 1000, placeholder: "Logo design, Canva templates, 3 years freelancing" }, { name: "price", label: "Starting price (€)", type: "money", required: true, defaultValue: "49.00" }],
    steps: [
      s("demand", "gigmatch", "gigs.demand_scan", "Scan marketplace demand", "Completed contracts and open services per category."),
      s("draft", "gigmatch", "gigs.service_draft", "Draft your service", "Title, what's included, delivery time and revisions.", ["demand"]),
      s("publish", "gigmatch", "gigs.publish_service", "Publish your service", "Listed in the marketplace after your approval.", ["draft"]),
    ],
  },

  // ------------------------------------------------ Partner agents (Scoutr family)
  partner("replyr", "Replyr", "Customer chat agent", "chat", "#6C8CFF", "chattagent", "Answers your customers 24/7 in 50+ languages.", "Trained on your website and documents, Replyr answers customer questions in over 50 languages and hands tricky ones to you.", ["Train on your site & docs", "Answers in 50+ languages", "Hands over to you when needed"], [
    ["Connect your site", "Point it at your website and upload documents."],
    ["Train the agent", "It learns your products, policies and tone."],
    ["Go live", "Add the chat to your store; it answers 24/7."],
  ]),
  partner("insightlens", "InsightLens", "Data analyst agent", "lens", "#9AA8FF", "scoutr-data", "Your spreadsheets and PDFs, turned into answers.", "Upload spreadsheets, PDFs or screenshots and get clear answers, charts and reports.", ["Spreadsheets, PDFs, screenshots", "Charts and reports", "Plain-language answers"], [
    ["Upload data", "Spreadsheets, PDFs or screenshots."],
    ["Ask questions", "In plain language."],
    ["Get answers", "Charts, tables and a report you can share."],
  ]),
  partner("daybreak", "Daybreak", "Everyday work agent", "sun", "#FFC861", "scoutr-ai", "Email, calendar and docs — handled.", "Reads, plans and acts across Gmail, Calendar, Slack, Notion, GitHub and 1,000+ apps.", ["Inbox triage and replies", "Calendar planning", "Docs across your apps"], [
    ["Connect your apps", "Gmail, Calendar, Slack, Notion and more."],
    ["Tell it the goal", "'Plan my week', 'answer these leads'."],
    ["It acts", "Drafts, schedules and updates — you approve."],
  ]),
  partner("lingocoach", "LingoCoach", "Language tutor agent", "book", "#4EF2C2", "lingo", "Learn a language by talking.", "Conversation practice with word cards, syllables and pronunciation feedback at your pace.", ["Real conversations", "Word cards and syllables", "Pronunciation practice"], [
    ["Pick a language", "And your level."],
    ["Talk", "Practise real conversations with the tutor."],
    ["Improve", "Word cards and pronunciation feedback."],
  ]),
  partner("studioshot", "StudioShot", "Product visuals agent", "camera", "#C04CF5", "forma", "Studio-grade product photos and videos from your store URL.", "Paste your store URL and get studio-grade product photos, motion videos and full campaigns.", ["Product photos", "Motion videos", "Full campaigns"], [
    ["Paste your store", "It reads your products."],
    ["Generate visuals", "Studio photos and motion videos on-brand."],
    ["Launch campaigns", "Ready-made creatives for every channel."],
  ]),
  partner("scoutbrief", "ScoutBrief", "Industry intelligence agent", "compass", "#2FA8FF", "scoutr", "A weekly brief on what matters in your industry.", "Add your LinkedIn and get a weekly brief on the news, tools and changes that matter to your role.", ["Weekly brief", "Tools and news for your role", "No noise"], [
    ["Add your profile", "It learns your role and industry."],
    ["It scouts", "News, tools and changes every week."],
    ["Read the brief", "Only what matters to you."],
  ]),
];

function partner(id: string, name: string, role: string, icon: AgentIconKey, accent: string, key: string, tagline: string, summary: string, highlights: string[], flow: [string, string][]): AgentDef {
  return {
    id, name, role, category: "Partner", icon, accent, tagline, summary, status: "VERIFIED",
    inputs: [],
    steps: flow.map(([title, explain], i) => s(`p${i}`, id, "partner.handoff", title, explain, i ? [`p${i - 1}`] : [])),
    partner: { product: name, key, highlights },
  };
}

export function getAgent(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Display name for an agent id used in task logs (includes retired ids). */
export function agentDisplayName(id: string): string {
  if (id === "core") return "Hustera Core";
  const legacy: Record<string, string> = { research: "Market Research", seo: "RankRiver", storefront: "EcomPro", design: "DigiCraft", designstudio: "DigiCraft", finance: "RevenueDesk", markets: "MarketWatch" };
  return getAgent(id)?.name ?? legacy[id] ?? id;
}

/** The concrete steps for a mission, honouring conditional steps. */
export function planWorkflow(agentId: string, params: Record<string, unknown> = {}): WorkflowStep[] {
  const agent = getAgent(agentId);
  if (!agent || agent.partner) return [];
  const steps = agent.steps.filter((st) => !st.when || !!params[st.when]);
  const keys = new Set(steps.map((st) => st.key));
  return steps.map((st) => ({ ...st, dependsOn: st.dependsOn.filter((d) => keys.has(d)) }));
}

export const AGENT_CATEGORIES: readonly AgentCategory[] = ["Commerce", "Growth", "Markets", "Operations", "Partner"];

/** The standard mission fields every agent form can fill; anything else is stored as agent params. */
export const STANDARD_INPUTS = new Set(["title", "brief", "price", "productKind", "deliveryContent", "productId", "externalChannel", "ownershipConfirmed"]);

/**
 * Checks a submitted agent form against the agent's declared inputs.
 * Returns the first error, or the agent-specific params to store with the mission.
 */
export function validateAgentInputs(agent: AgentDef, raw: Record<string, string>): { error: string } | { params: Record<string, string> } {
  const params: Record<string, string> = {};
  for (const f of agent.inputs) {
    const v = (raw[f.name] ?? "").trim();
    if (f.required && (f.type === "checkbox" ? v !== "on" : v === "")) return { error: f.type === "checkbox" ? "Please confirm the checkbox to continue" : `${f.label} is required` };
    if (f.maxLength && v.length > f.maxLength) return { error: `${f.label} is too long` };
    if (f.type === "select" && v && f.options && !f.options.some((o) => o.value === v)) return { error: `Choose a valid ${f.label.toLowerCase()}` };
    if (f.type === "money" && v && !(Number(v.replace(",", ".")) >= 0)) return { error: `${f.label} must be a number` };
    if (!STANDARD_INPUTS.has(f.name) && v) params[f.name] = v;
  }
  return { params };
}
