/**
 * Composio Instant: toolkits billed per call from the Composio wallet, with no
 * user account to connect. The catalog below is the list shown in the
 * operator's Composio dashboard. Toolkit and tool slugs are best guesses until
 * discovered or verified against the live API (see docs/composio.md).
 */

export interface InstantToolkit {
  name: string;
  /** Composio toolkit slug (lowercase). Verify with discovery. */
  slug: string;
  category: string;
  tools: number;
  /** Hustera agents that use this toolkit. */
  usedBy: string[];
  /** Shown as "Active" in the dashboard (already enabled on the account). */
  active?: boolean;
}

const t = (name: string, category: string, tools: number, usedBy: string[] = [], slug?: string, active?: boolean): InstantToolkit => ({
  name,
  slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  category,
  tools,
  usedBy,
  active,
});

export const INSTANT_CATALOG: readonly InstantToolkit[] = [
  t("SerpApi", "Web Search & Research", 59, ["research", "ecompro"]),
  t("Tavily", "Web Search & Research", 5, ["research"]),
  t("Exa", "Web Search & Research", 64, ["research"]),
  t("You.com", "Web Search & Research", 8, [], "you"),
  t("OpenAlex", "Web Search & Research", 16),
  t("Parallel", "Web Search & Research", 42),
  t("Serper", "Web Search & Research", 15, ["research"]),
  t("Firecrawl", "Web Scraping & Browser", 245, ["research", "ecompro"]),
  t("Apify", "Web Scraping & Browser", 184),
  t("Bright Data", "Web Scraping & Browser", 167),
  t("Browser Use", "Web Scraping & Browser", 48),
  t("Context.dev", "Web Scraping & Browser", 13, [], "context_dev"),
  t("MrScraper", "Web Scraping & Browser", 11),
  t("People Data Labs", "People & Contact Data", 26),
  t("Apollo", "People & Contact Data", 72),
  t("ContactOut", "People & Contact Data", 25),
  t("Hunter", "People & Contact Data", 39),
  t("Icypeas", "People & Contact Data", 22),
  t("LeadMagic", "People & Contact Data", 109),
  t("Lusha", "People & Contact Data", 67),
  t("Prospeo", "People & Contact Data", 8),
  t("Tomba", "People & Contact Data", 25),
  t("ZeroBounce", "People & Contact Data", 22),
  t("Crustdata", "Company Data", 15),
  t("Akta", "Company Data", 39),
  t("CompanyEnrich", "Company Data", 48),
  t("Logo.dev", "Company Data", 8, [], "logo_dev"),
  t("PredictLeads", "Company Data", 11),
  t("The Companies API", "Company Data", 29, [], "the_companies_api"),
  t("Ahrefs", "SEO & AI Visibility", 46, ["seo"]),
  t("DataForSEO", "SEO & AI Visibility", 354, ["seo"]),
  t("Just One API", "Social & Creator Data", 279),
  t("ScrapeCreators", "Social & Creator Data", 196, ["contentflow"]),
  t("TikHub", "Social & Creator Data", 515, ["contentflow"]),
  t("Google Maps", "Places & Weather", 24, [], "google_maps"),
  t("AccuWeather", "Places & Weather", 41),
  t("GraphHopper", "Places & Weather", 13),
  t("Black Forest Labs", "Media Generation", 14, ["designstudio", "contentflow"], "black_forest_labs"),
  t("Fal.ai", "Media Generation", 13, ["designstudio", "contentflow"], "fal_ai"),
  t("Higgsfield", "Media Generation", 13),
  t("Luma Labs", "Media Generation", 11, [], "luma_labs"),
  t("ElevenLabs", "Audio & Speech", 396),
  t("Deepgram", "Audio & Speech", 17),
  t("Fish Audio", "Audio & Speech", 12),
  t("Supadata", "Audio & Speech", 20),
  t("Mathpix", "Documents & OCR", 28),
  t("Alpha Vantage", "Market Data", 56, ["markets"], "alpha_vantage"),
  t("CoinGecko", "Market Data", 60, ["markets"]),
  t("EODHD APIs", "Market Data", 13, [], "eodhd_apis"),
  t("Finnhub", "Market Data", 11, ["markets"]),
  t("Marketstack", "Market Data", 19),
  t("Twelve Data", "Market Data", 100, [], "twelve_data"),
  t("Vaquill", "Legal & Public Records", 31),
  t("Artificial Analysis", "Artificial Intelligence", 12),
  t("Cloro", "Artificial Intelligence", 14),
  t("DeepSeek", "Artificial Intelligence", 6, ["designstudio", "contentflow", "ecompro"]),
  t("Gemini", "Artificial Intelligence", 8, ["designstudio", "contentflow", "ecompro", "research"], "gemini", true),
  t("Jev", "Artificial Intelligence", 2),
  t("MiniMax", "Artificial Intelligence", 35),
  t("Mistral AI", "Artificial Intelligence", 105, [], "mistral_ai"),
  t("OpenAI", "Artificial Intelligence", 128, ["designstudio", "contentflow", "ecompro", "research"]),
  t("OpenRouter", "Artificial Intelligence", 122, ["designstudio", "contentflow", "ecompro"]),
  t("OpenWeb Ninja", "Artificial Intelligence", 164, [], "openweb_ninja"),
  t("Surf", "Artificial Intelligence", 122),
  t("TinyFish", "Artificial Intelligence", 32),
  t("Clay", "Sales & CRM", 15),
  t("LimaData", "Sales & CRM", 18),
  t("Semrush", "Marketing", 74, ["seo"]),
  t("MagicSlides", "Productivity & Project Management", 4),
  t("HTML/CSS to Image", "Content & Files", 10, [], "htmlcsstoimage"),
  t("Memelord", "Content & Files", 22),
  t("PDF.co", "Content & Files", 49, ["designstudio"], "pdf_co"),
  t("PhotoRoom", "Content & Files", 4, ["ecompro"]),
  t("API Ninjas", "Developer Tools", 246, [], "api_ninjas"),
  t("API-Sports", "Developer Tools", 73, [], "api_sports"),
  t("CarsXE", "Developer Tools", 13),
  t("Etherscan", "Developer Tools", 54),
  t("GetAnyAPI", "Developer Tools", 477),
  t("IPinfo", "Developer Tools", 27),
  t("Strale", "Developer Tools", 309),
  t("SEOptimer", "Data & Analytics", 2, ["seo"]),
  t("Job Search", "HR & Recruiting", 94, [], "job_search"),
  t("Web3 Career", "HR & Recruiting", 1, [], "web3_career"),
  t("Cloudflare Api Key", "IT & Security", 43, [], "cloudflare_api_key"),
  t("Ignav Flights", "Lifestyle & More", 5, [], "ignav_flights"),
  t("Listen Notes", "Other", 26, [], "listen_notes"),
  t("Yelp", "Other", 12),
];

/** A Hustera capability served by one or more Instant toolkits, tried in order. */
export interface InstantCapability {
  id: InstantCapabilityId;
  label: string;
  /** Candidates in preference order. `tool` is the default slug; operators can override it. */
  candidates: { toolkit: string; tool: string; keywords: string[] }[];
  /** Upper bound reserved from the mission budget per call, in cents. */
  maxCostCents: number;
}

export type InstantCapabilityId = "llm" | "web_search" | "scrape" | "shopping_search" | "keywords" | "image" | "crypto_price" | "stock_quote";

export const INSTANT_CAPABILITIES: Record<InstantCapabilityId, InstantCapability> = {
  llm: {
    id: "llm",
    label: "Text generation",
    candidates: [
      { toolkit: "gemini", tool: "GEMINI_GENERATE_CONTENT", keywords: ["generate", "content", "text"] },
      { toolkit: "openai", tool: "OPENAI_CREATE_RESPONSE", keywords: ["response", "chat", "completion"] },
      { toolkit: "openrouter", tool: "OPENROUTER_CHAT_COMPLETION", keywords: ["chat", "completion"] },
      { toolkit: "deepseek", tool: "DEEPSEEK_CHAT_COMPLETION", keywords: ["chat", "completion"] },
    ],
    maxCostCents: 10,
  },
  web_search: {
    id: "web_search",
    label: "Web search",
    candidates: [
      { toolkit: "tavily", tool: "TAVILY_SEARCH", keywords: ["search"] },
      { toolkit: "exa", tool: "EXA_SEARCH", keywords: ["search"] },
      { toolkit: "serper", tool: "SERPER_SEARCH", keywords: ["search"] },
      { toolkit: "serpapi", tool: "SERPAPI_SEARCH", keywords: ["search"] },
    ],
    maxCostCents: 3,
  },
  scrape: {
    id: "scrape",
    label: "Read a web page",
    candidates: [{ toolkit: "firecrawl", tool: "FIRECRAWL_SCRAPE", keywords: ["scrape"] }],
    maxCostCents: 3,
  },
  shopping_search: {
    id: "shopping_search",
    label: "Competitor prices",
    candidates: [{ toolkit: "serpapi", tool: "SERPAPI_GOOGLE_SHOPPING_SEARCH", keywords: ["shopping"] }],
    maxCostCents: 3,
  },
  keywords: {
    id: "keywords",
    label: "Keyword research",
    candidates: [
      { toolkit: "dataforseo", tool: "DATAFORSEO_KEYWORD_SUGGESTIONS", keywords: ["keyword", "suggestion"] },
      { toolkit: "semrush", tool: "SEMRUSH_KEYWORD_OVERVIEW", keywords: ["keyword"] },
    ],
    maxCostCents: 10,
  },
  image: {
    id: "image",
    label: "Image generation",
    candidates: [
      { toolkit: "black_forest_labs", tool: "BLACK_FOREST_LABS_GENERATE_IMAGE", keywords: ["generate", "image", "flux"] },
      { toolkit: "fal_ai", tool: "FAL_AI_GENERATE_IMAGE", keywords: ["image", "generate"] },
    ],
    maxCostCents: 10,
  },
  crypto_price: {
    id: "crypto_price",
    label: "Crypto prices",
    candidates: [{ toolkit: "coingecko", tool: "COINGECKO_GET_SIMPLE_PRICE", keywords: ["simple", "price"] }],
    maxCostCents: 1,
  },
  stock_quote: {
    id: "stock_quote",
    label: "Stock quotes",
    candidates: [
      { toolkit: "finnhub", tool: "FINNHUB_QUOTE", keywords: ["quote"] },
      { toolkit: "alpha_vantage", tool: "ALPHA_VANTAGE_GLOBAL_QUOTE", keywords: ["global", "quote"] },
    ],
    maxCostCents: 1,
  },
};

/**
 * Picks the most likely tool slug from a discovered tool list: an exact match
 * on the default first, then the slug matching the most keywords.
 */
export function pickToolSlug(defaultSlug: string, keywords: string[], available: string[]): string | null {
  if (!available.length) return null;
  if (available.includes(defaultSlug)) return defaultSlug;
  let best: { slug: string; score: number } | null = null;
  for (const slug of available) {
    const lower = slug.toLowerCase();
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > 0 && (!best || score > best.score || (score === best.score && slug.length < best.slug.length))) best = { slug, score };
  }
  return best?.slug ?? null;
}

/** Depth-first search for the longest string in a JSON value (model output, page text). */
export function findText(value: unknown, depth = 0): string | null {
  if (depth > 8 || value == null) return null;
  if (typeof value === "string") return value;
  let best: string | null = null;
  const consider = (s: string | null) => {
    if (s && (!best || s.length > best.length)) best = s;
  };
  if (Array.isArray(value)) value.forEach((v) => consider(findText(v, depth + 1)));
  else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/^(id|url|link|image|href|model|role|object|created|type|status)$/i.test(k)) continue;
      consider(findText(v, depth + 1));
    }
  }
  return best;
}

/** All http(s) URLs in a JSON value, in order of appearance. */
export function findUrls(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 8 || v == null) return;
    if (typeof v === "string") {
      if (/^https?:\/\/\S+$/i.test(v)) out.push(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => walk(x, depth + 1));
  };
  walk(value, 0);
  return [...new Set(out)];
}

/** Search results as { title, url, snippet }, from the common shapes search APIs return. */
export function findResults(value: unknown, limit = 8): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 8 || v == null || out.length >= limit) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    const url = [o.url, o.link, o.href].find((x) => typeof x === "string" && /^https?:\/\//.test(x)) as string | undefined;
    const title = [o.title, o.name].find((x) => typeof x === "string") as string | undefined;
    if (url && title) {
      const snippet = [o.snippet, o.content, o.description, o.text, o.summary].find((x) => typeof x === "string") as string | undefined;
      out.push({ title: title.slice(0, 200), url, snippet: (snippet ?? "").replace(/\s+/g, " ").slice(0, 400) });
      return;
    }
    Object.values(o).forEach((x) => walk(x, depth + 1));
  };
  walk(value, 0);
  return out;
}

/** Prices found in shopping results, in cents. */
export function findPrices(value: unknown): number[] {
  const out: number[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 8 || v == null) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v !== "object") return;
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (/^(extracted_price|price_value|price)$/i.test(k)) {
        const n = typeof x === "number" ? x : typeof x === "string" ? Number(x.replace(/[^0-9.,]/g, "").replace(",", ".")) : NaN;
        if (Number.isFinite(n) && n > 0 && n < 100000) out.push(Math.round(n * 100));
      } else walk(x, depth + 1);
    }
  };
  walk(value, 0);
  return out;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}
