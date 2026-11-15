/**
 * Affiliate networks and niches used by LinkLoom. Commission figures are not
 * shown: they vary by programme and change often — users read them in their
 * own network dashboard.
 */
export interface AffiliateNiche {
  id: string;
  name: string;
  keywords: string[];
  angles: string[];
}

export interface AffiliateNetwork {
  id: string;
  name: string;
  region: string;
  disclosure: string;
  niches: AffiliateNiche[];
}

const n = (id: string, name: string, keywords: string[], angles: string[]): AffiliateNiche => ({ id, name, keywords, angles });

export const AFFILIATE_NETWORKS: readonly AffiliateNetwork[] = [
  {
    id: "amazon", name: "Amazon Associates", region: "Global", disclosure: "As an Amazon Associate I earn from qualifying purchases.",
    niches: [
      n("home-fitness", "Home fitness gear", ["best adjustable dumbbells", "home gym for small spaces", "resistance bands review"], ["Small-space setups", "Budget vs premium", "Beginner routines"]),
      n("kitchen", "Kitchen & cooking", ["best air fryer", "budget kitchen gadgets", "meal prep containers"], ["Time-saving gadgets", "Healthy cooking", "Small kitchens"]),
      n("tech-desk", "Desk & home office tech", ["best ergonomic chair", "standing desk review", "budget webcam"], ["Work-from-home upgrades", "Ergonomics", "Under €100 picks"]),
      n("baby", "Baby & parenting", ["best baby monitor", "travel stroller review", "baby essentials list"], ["First-time parents", "Travel with kids", "Safety first"]),
      n("outdoor", "Outdoor & camping", ["best camping tent", "hiking backpack review", "ultralight gear"], ["Weekend trips", "Beginner camping", "Ultralight"]),
    ],
  },
  {
    id: "awin", name: "Awin", region: "Europe", disclosure: "This post contains affiliate links. I may earn a commission at no extra cost to you.",
    niches: [
      n("fashion", "Fashion & accessories", ["sustainable fashion brands", "capsule wardrobe", "best sneakers"], ["Capsule wardrobes", "Sustainable picks", "Seasonal edits"]),
      n("travel", "Travel & hotels", ["cheap flights tips", "best city breaks europe", "travel insurance compared"], ["City guides", "Budget travel", "Packing lists"]),
      n("personal-finance", "Personal finance tools", ["best budgeting app", "credit card compared", "savings accounts"], ["Beginner budgeting", "Comparisons", "Money habits"]),
    ],
  },
  {
    id: "impact", name: "Impact", region: "Global", disclosure: "Some links are affiliate links; I may earn a commission.",
    niches: [
      n("saas-tools", "SaaS & productivity tools", ["best project management tool", "notion alternatives", "email marketing software"], ["Tool stacks", "Alternatives to X", "Tutorials"]),
      n("subscriptions", "Subscriptions & streaming", ["best vpn", "meal kit compared", "streaming services compared"], ["Is it worth it?", "Comparisons", "Deals"]),
    ],
  },
  {
    id: "clickbank", name: "ClickBank", region: "Global", disclosure: "I may earn a commission if you buy through my links.",
    niches: [
      n("health", "Health & wellness", ["sleep better tips", "healthy habits", "stress relief"], ["Science-backed habits", "Routines", "Honest reviews"]),
      n("self-improvement", "Self-improvement", ["productivity system", "learn a language fast", "habit tracker"], ["Systems", "Challenges", "Reviews"]),
      n("money-skills", "Online skills & courses", ["learn copywriting", "freelance course review", "learn excel"], ["Skill roadmaps", "Course reviews", "Before/after"]),
    ],
  },
  {
    id: "partnerstack", name: "PartnerStack", region: "Global", disclosure: "This post contains partner links. I may earn a commission.",
    niches: [n("b2b-saas", "B2B SaaS", ["best crm for small business", "invoicing software", "website builder compared"], ["For freelancers", "For small teams", "Comparisons"])],
  },
  {
    id: "adtraction", name: "Adtraction", region: "Nordics", disclosure: "Inlägget innehåller affiliatelänkar / This post contains affiliate links.",
    niches: [
      n("nordic-fashion", "Nordic fashion & beauty", ["skincare routine", "nordic fashion brands", "best sunscreen"], ["Routines", "Seasonal picks", "Local brands"]),
      n("telecom-insurance", "Telecom, energy & insurance", ["cheapest mobile plan", "electricity price compared", "home insurance compared"], ["Save money", "Comparisons", "How to switch"]),
    ],
  },
  {
    id: "scoutr-partner", name: "Scoutr Partner", region: "Global", disclosure: "I earn a recurring commission if you subscribe through my link.",
    niches: [n("ai-tools", "AI tools for business", ["ai customer service chatbot", "ai data analyst", "ai email assistant"], ["Use cases", "Time saved", "Setup guides"])],
  },
];

export function findNiche(value: string): { network: AffiliateNetwork; niche: AffiliateNiche } | null {
  const [nid, xid] = value.split(":");
  const network = AFFILIATE_NETWORKS.find((x) => x.id === nid);
  const niche = network?.niches.find((x) => x.id === xid);
  return network && niche ? { network, niche } : null;
}

/** Parses "name | url" lines into affiliate destinations (https only). */
export function parseAffiliateLines(text: string): { name: string; url: string }[] {
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p.length >= 2 && p[0] && /^https:\/\/\S+$/i.test(p[1]!))
    .slice(0, 20)
    .map((p) => ({ name: p[0]!.slice(0, 80), url: p[1]!.slice(0, 500) }));
}
