import "server-only";
import { findPrices, findResults, formatCents, median, simulatedFee } from "@hustera/domain";
import { instantConfigured, runInstant } from "../instant";
import { aiText, embed, extract, missionProduct, ok, randomSuffix, skipped, slugify, type ToolContext, type ToolOutcome } from "./shared";

// ---------------------------------------------------------------- DropForge

interface Candidate {
  name: string;
  cost: number;
  price: number;
  days: number;
  netCents: number;
  marginCents: number;
  marginPct: number;
  demand: number;
  score: number;
}

/** Parses "name | cost | price | days" lines; prices are € incl. 25% VAT. */
export function scoreCandidates(text: string, researchText = ""): Candidate[] {
  const research = researchText.toLowerCase();
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p[0] && p.length >= 3)
    .slice(0, 25)
    .map((p) => {
      const cost = Math.round(Number((p[1] ?? "").replace(",", ".")) * 100);
      const price = Math.round(Number((p[2] ?? "").replace(",", ".")) * 100);
      const days = Number(p[3] ?? 10) || 10;
      const net = Math.round(price / 1.25);
      const margin = net - cost - simulatedFee(price);
      const marginPct = price > 0 ? (margin / net) * 100 : 0;
      const words = p[0]!.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const demand = words.filter((w) => research.includes(w)).length;
      const delivery = days <= 7 ? 25 : days <= 14 ? 15 : 5;
      const score = Math.round(Math.max(0, Math.min(60, marginPct)) + delivery + Math.min(15, demand * 5));
      return { name: p[0]!.slice(0, 80), cost, price, days, netCents: net, marginCents: margin, marginPct, demand, score };
    })
    .filter((c) => Number.isFinite(c.price) && c.price > 0 && Number.isFinite(c.cost))
    .sort((a, b) => b.score - a.score);
}

export async function productScout(ctx: ToolContext): Promise<ToolOutcome> {
  const list = scoreCandidates(ctx.params.candidates ?? "", ctx.inputs.trends ?? "");
  if (!list.length) return { ok: false, blocked: false, error: "No valid candidates. Use: name | supplier cost | price | shipping days" };
  const best = list[0]!;
  if (best.marginCents <= 0) return { ok: false, blocked: true, reason: "None of the candidates makes money after VAT, payment fees and supplier cost. Raise prices or find cheaper suppliers, then retry." };
  const niche = ctx.params.niche ?? "your niche";
  const brief = `${best.name} for ${niche.toLowerCase()}. Ships from our supplier in about ${best.days} days. ${ctx.brief && ctx.brief !== ctx.title ? ctx.brief : ""}`.trim();
  await ctx.db.query(`update missions set title = $2, brief = $3, price_cents = $4, product_kind = 'physical', updated_at = now() where id = $1`, [ctx.missionId, best.name, brief.slice(0, 2000), best.price]);
  const rows = list.map((c, i) => `| ${i === 0 ? "🏆 " : ""}${c.name} | ${formatCents(c.cost)} | ${formatCents(c.price)} | ${formatCents(c.marginCents)} (${c.marginPct.toFixed(0)}%) | ${c.days} d | ${c.demand} | **${c.score}** |`);
  return ok(
    "product_scout",
    `Product scout — ${niche}`,
    `# Product scout\n\nMargin = price excl. 25% VAT − supplier cost − payment fees. Demand = mentions in the trend research. Shipping speed matters for reviews and refunds.\n\n| Product | Cost | Price | Margin | Shipping | Demand | Score |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\n**Winner: ${best.name}** — the mission now launches this product at ${formatCents(best.price)}.`,
    `Scored ${list.length} products — winner: ${best.name} (${formatCents(best.marginCents)} margin per sale)`,
    5,
  );
}

export function supplierChecklist(ctx: ToolContext): ToolOutcome {
  return ok(
    "checklist",
    `Supplier checklist — ${ctx.title}`,
    [
      `# Supplier & compliance checklist: ${ctx.title}`,
      "_You are the seller of record. Confirm each item before launch — not legal advice._",
      "- [ ] Order a sample and check quality yourself",
      "- [ ] Confirm real delivery times to Sweden/EU and show them on the product page",
      "- [ ] Supplier has CE marking / safety documents where required (GPSR) and an EU responsible person",
      "- [ ] No counterfeit, trademarked or restricted goods",
      "- [ ] Returns address and 14-day right of withdrawal are handled",
      "- [ ] Customs and import VAT (IOSS) are covered in your price",
      "- [ ] Tracking numbers are shared with buyers",
      "- [ ] Marketing claims are true — no fake reviews, scarcity or before/after promises",
    ].join("\n"),
    "Supplier and compliance checklist ready",
  );
}

// ---------------------------------------------------------------- PrintPilot

export async function designConcepts(ctx: ToolContext): Promise<ToolOutcome> {
  const niche = ctx.params.niche ?? ctx.title;
  const ai = await aiText(ctx, "You create original print-on-demand design concepts. No trademarks, celebrities or copyrighted characters.", `Niche: ${niche}\nCollection: ${ctx.title}\nStyle: ${ctx.brief}\n\nGive five concepts as '## Concept N' with slogan, visual description and an image prompt.`, 900);
  const words = niche.split(/\s+/).filter(Boolean);
  const template = [1, 2, 3, 4, 5]
    .map((i) => `## Concept ${i}\n- **Slogan:** ${["Made for", "Powered by", "Just one more", "Certified", "Proudly"][i - 1]} ${words.join(" ").toLowerCase()}\n- **Visual:** ${["minimal line art", "retro badge", "bold typography", "hand-drawn icon", "geometric pattern"][i - 1]}\n- **Prompt:** ${["minimal line art", "retro badge", "bold typography", "hand-drawn icon", "geometric pattern"][i - 1]} about ${niche}, flat colours, transparent background`)
    .join("\n\n");
  return ok("concepts", `Design concepts — ${ctx.title}`, `# Design concepts\n\n${ai?.text ?? template}`, ai ? `Five concepts written with ${ai.model}` : "Five design concepts drafted", ai?.costCents ?? 2);
}

// ---------------------------------------------------------------- PriceScout

export async function priceWatch(ctx: ToolContext): Promise<ToolOutcome> {
  if (!instantConfigured()) return skipped("Price watch", "competitor prices come from SerpApi via Composio Instant (COMPOSIO_API_KEY)");
  const products = await ctx.db.query<{ id: string; title: string; price_cents: number }>(
    `select p.id, p.title, p.price_cents from products p join stores s on s.id = p.store_id where s.owner_id = $1 and p.status = 'active' order by p.created_at desc limit 10`,
    [ctx.ownerId],
  );
  if (!products.length) return skipped("Price watch", "you have no live products yet");
  const rows: string[] = [];
  let cost = 0;
  for (const p of products) {
    try {
      const r = await runInstant("shopping_search", { query: p.title }, { db: ctx.db });
      cost += r.maxCostCents;
      const prices = findPrices(r.data).filter((x) => x >= 50);
      const mid = median(prices);
      const pos = mid === null ? "no data" : p.price_cents < mid * 0.7 ? "well below market" : p.price_cents > mid * 1.3 ? "well above market" : "in line";
      rows.push(`| ${p.title} | ${formatCents(p.price_cents)} | ${mid === null ? "–" : formatCents(mid)} | ${prices.length} | ${pos} |`);
    } catch (e) {
      rows.push(`| ${p.title} | ${formatCents(p.price_cents)} | – | 0 | ${e instanceof Error ? e.message.slice(0, 60) : "error"} |`);
    }
  }
  return ok("prices", "Price watch", `# Price watch\n\n| Product | Your price | Market median | Listings | Position |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}\n\nPrices are never changed automatically.`, `Checked ${products.length} products against the market`, cost);
}

// ---------------------------------------------------------------- PageSmith

export interface PageContent {
  headline: string;
  subheadline: string;
  benefits: string[];
  faq: [string, string][];
  cta: string;
  audience: string;
}

export async function pageGenerate(ctx: ToolContext): Promise<ToolOutcome> {
  const p = await missionProduct(ctx);
  if (!p || p.status !== "active") return { ok: false, blocked: true, reason: "Choose one of your published products." };
  const audience = ctx.params.audience ?? "";
  const sentences = p.description.split(/(?<=[.!?])\s+/).filter(Boolean);
  let content: PageContent = {
    headline: p.title,
    subheadline: sentences[0] ?? p.description.slice(0, 160),
    benefits: (sentences.slice(1, 4).length ? sentences.slice(1, 4) : ["Instant access after payment", "Made by an independent creator", "Secure checkout"]).map((x) => x.slice(0, 160)),
    faq: [
      ["How do I get it?", p.kind === "digital" ? "You get access immediately after payment, by email and on your order page." : "The seller ships it to you; delivery times are shown at checkout."],
      ["Can I get a refund?", "Contact the seller through your order page. EU consumer rights apply."],
      ["Is payment secure?", "Payments are processed by Stripe; Hustera never sees your card details."],
    ],
    cta: `Get ${p.title} — ${formatCents(p.price_cents, p.currency)}`,
    audience,
  };
  let cost = 2;
  const ai = await aiText(ctx, "You write high-converting but honest landing pages. Return JSON only.", `Product: ${p.title}\nDescription: ${p.description}\nPrice: ${formatCents(p.price_cents)}\nAudience: ${audience}\n\nReturn {"headline","subheadline","benefits":[3-5 strings],"faq":[[q,a],...3]}`, 700);
  if (ai) {
    try {
      const j = JSON.parse(ai.text.replace(/^```(json)?|```$/g, "").trim()) as Partial<PageContent>;
      if (j.headline && j.benefits?.length) content = { ...content, ...j, cta: content.cta, audience };
      cost = ai.costCents;
    } catch {
      // keep template
    }
  }
  const slug = `${slugify(p.title, 40)}-${randomSuffix()}`;
  await ctx.db.query(`insert into landing_pages (owner_id, product_id, mission_id, slug, content) values ($1, $2, $3, $4, $5)`, [ctx.ownerId, p.id, ctx.missionId, slug, JSON.stringify(content)]);
  return ok(
    "landing_page",
    `Landing page — ${p.title}`,
    `# ${content.headline}\n\n${content.subheadline}\n\n## Benefits\n${content.benefits.map((b) => `- ${b}`).join("\n")}\n\n## FAQ\n${content.faq.map(([q, a]) => `- **${q}** ${a}`).join("\n")}\n\nPreview address after publishing: /p/${slug}`,
    "Landing page drafted",
    cost,
  );
}

export async function pagePublish(ctx: ToolContext): Promise<ToolOutcome> {
  const [page] = await ctx.db.query<{ slug: string }>(`update landing_pages set status = 'published' where mission_id = $1 and owner_id = $2 returning slug`, [ctx.missionId, ctx.ownerId]);
  if (!page) return { ok: false, blocked: false, error: "No landing page draft found" };
  return ok("publication", "Landing page live", `# Landing page live\n\nShare it anywhere: /p/${page.slug}`, `Landing page live at /p/${page.slug}`);
}

// ---------------------------------------------------------------- GigMatch

const CATEGORY_HINTS: Record<string, string[]> = {
  Development: ["code", "developer", "react", "web app", "api"],
  "Web design": ["website", "webflow", "wordpress", "landing"],
  "Graphic design": ["logo", "design", "canva", "brand", "illustration"],
  Copywriting: ["copy", "writing", "blog", "content"],
  Video: ["video", "editing", "youtube", "reels"],
  Research: ["research", "analysis"],
  Automation: ["automation", "zapier", "make", "ai"],
  SEO: ["seo", "keywords", "ranking"],
  Translation: ["translation", "swedish", "spanish", "language"],
  "Virtual assistance": ["assistant", "admin", "email", "calendar"],
  Courses: ["teach", "course", "coach"],
  "Downloadable products": ["template", "printable", "notion"],
};

export async function demandScan(ctx: ToolContext): Promise<ToolOutcome> {
  const rows = await ctx.db.query<{ category: string; services: number; completed: number }>(
    `select s.category, count(distinct s.id)::int as services, count(c.id) filter (where c.status = 'completed')::int as completed
       from services s left join contracts c on c.service_id = s.id where s.status = 'active' group by s.category`,
  );
  const skills = ctx.brief.toLowerCase();
  const scored = Object.entries(CATEGORY_HINTS)
    .map(([category, hints]) => {
      const r = rows.find((x) => x.category === category);
      const fit = hints.filter((h) => skills.includes(h)).length;
      const demand = (r?.completed ?? 0) * 3 - (r?.services ?? 0);
      return { category, fit, demand, services: r?.services ?? 0, completed: r?.completed ?? 0, score: fit * 10 + demand };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0]!;
  return ok(
    "demand",
    "Marketplace demand",
    `# Marketplace demand\n\n| Category | Fit with your skills | Live services | Completed contracts |\n| --- | --- | --- | --- |\n${scored.slice(0, 8).map((x) => `| ${x.category} | ${x.fit} | ${x.services} | ${x.completed} |`).join("\n")}\n\n**Best category for you: ${best.category}**\n\n${embed({ category: best.category })}`,
    `Best category for your skills: ${best.category}`,
  );
}

export async function serviceDraft(ctx: ToolContext): Promise<ToolOutcome> {
  const category = extract<{ category: string }>(ctx.inputs.demand)?.category ?? "Graphic design";
  const skills = ctx.brief.trim();
  const firstSkill = skills.split(/[,.\n]/)[0]!.trim().slice(0, 60) || category;
  const ai = await aiText(ctx, "You write clear freelance service listings. Be specific about deliverables and limits.", `Skills: ${skills}\nCategory: ${category}\n\nWrite a service title (max 90 chars) on the first line, then a description with 'What's included', 'What I need from you' and 'Not included'.`, 600);
  const title = (ai?.text.split("\n")[0]?.replace(/^#+\s*/, "").trim() || `I will deliver professional ${firstSkill.toLowerCase()}`).slice(0, 100);
  const description = ai ? ai.text.split("\n").slice(1).join("\n").trim() : `What's included:\n- ${firstSkill} tailored to your brief\n- Source files\n- One round of revisions\n\nWhat I need from you:\n- Your goals, examples you like and deadlines\n\nNot included:\n- Printing, paid stock assets or ad spend`;
  const draft = { title: title.length >= 5 ? title : `${category} service`, description: description.length >= 20 ? description : `${description}\n\nClear scope, honest timelines and one revision included.`, category, priceCents: ctx.priceCents, deliveryDays: 5, revisions: 1 };
  return ok("service_draft", `Service draft — ${draft.title}`, `# ${draft.title}\n\n${draft.description}\n\n**Category:** ${category} · **Price:** ${formatCents(draft.priceCents)} · **Delivery:** 5 days · **Revisions:** 1\n\n${embed(draft)}`, "Service offer drafted", ai?.costCents ?? 2);
}

export async function publishService(ctx: ToolContext): Promise<ToolOutcome> {
  const d = extract<{ title: string; description: string; category: string; priceCents: number; deliveryDays: number; revisions: number }>(ctx.inputs.draft);
  if (!d) return { ok: false, blocked: false, error: "No service draft found" };
  const [svc] = await ctx.db.query<{ id: string }>(
    `insert into services (seller_id, title, description, category, price_cents, delivery_days, revisions, ai_assisted) values ($1, $2, $3, $4, $5, $6, $7, true) returning id`,
    [ctx.ownerId, d.title.slice(0, 100), d.description.slice(0, 5000), d.category, Math.max(500, Math.min(1_000_000, d.priceCents)), d.deliveryDays, d.revisions],
  );
  return ok("publication", "Service live", `# Service live\n\nYour service is listed in the marketplace: /marketplace/${svc!.id}`, `Service live in the marketplace`);
}

export { findResults };
