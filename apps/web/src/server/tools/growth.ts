import "server-only";
import { extractTags, findNiche, formatCents, parseAffiliateLines } from "@hustera/domain";
import type { Queryable } from "../db";
import { aiText, embed, extract, missionProduct, ok, productUrl, randomSuffix, slugify, type ToolContext, type ToolOutcome } from "./shared";

// ---------------------------------------------------------------- social campaigns

interface PlannedPost {
  day: number;
  channel: "hustera";
  body: string;
}

const HOOKS = [
  (t: string) => `Meet ${t}.`,
  (t: string) => `The problem ${t} solves:`,
  (t: string) => `3 ways to use ${t} this week:`,
  (t: string) => `Behind the scenes of ${t}.`,
  (t: string) => `Question for you — would ${t} help?`,
  (t: string) => `What's inside ${t}:`,
  (t: string) => `Last call this week: ${t}.`,
];

/** Plans seven posts for the mission's product (or the affiliate articles). */
export async function campaignPlan(ctx: ToolContext): Promise<ToolOutcome> {
  const product = await missionProduct(ctx);
  const affiliate = extract<{ links: { name: string; slug: string }[]; disclosure: string }>(ctx.inputs.links);
  const subject = product?.title ?? affiliate?.links[0]?.name ?? ctx.title;
  const link = product ? (product.stripe_payment_link_url ?? productUrl(product)) : affiliate ? `/go/${affiliate.links[0]!.slug}` : "";
  const tag = slugify(subject.split(" ")[0] ?? "launch", 20).replace(/-/g, "");
  const firstLine = (product?.description ?? ctx.brief).split(/(?<=[.!?])\s/)[0]!.slice(0, 160);
  let posts: PlannedPost[] = HOOKS.map((h, i) => {
    const target = affiliate ? affiliate.links[i % affiliate.links.length]! : null;
    const url = target ? `/go/${target.slug}` : link;
    const name = target?.name ?? subject;
    return { day: i + 1, channel: "hustera", body: `${h(name)} ${firstLine} ${url} #${tag || "launch"}${affiliate ? ` (${affiliate.disclosure})` : ""}`.slice(0, 900) };
  });
  let cost = 3;
  const ai = await aiText(
    ctx,
    "You write a 7-day social media campaign. Each post max 260 characters, honest, no fake scarcity, varied hooks. Return exactly seven posts separated by a line with only ---.",
    `Subject: ${subject}\nAbout: ${firstLine}\nTone: ${ctx.params.tone ?? "friendly"}\nLink to include in every post: ${link || "(use the per-post links)"}${affiliate ? `\nAffiliate disclosure to include: ${affiliate.disclosure}` : ""}`,
    900,
  );
  if (ai) {
    const parts = ai.text.split(/\n-{3,}\n/).map((x) => x.trim()).filter((x) => x.length > 20);
    if (parts.length >= 5) {
      posts = parts.slice(0, 7).map((body, i) => {
        const url = affiliate ? `/go/${affiliate.links[i % affiliate.links.length]!.slug}` : link;
        return { day: i + 1, channel: "hustera" as const, body: (body.includes(url) || !url ? body : `${body} ${url}`).slice(0, 900) };
      });
      cost = ai.costCents;
    }
  }
  return ok(
    "campaign",
    `7-day campaign — ${subject}`,
    `# 7-day social campaign\n\n${posts.map((p) => `## Day ${p.day}\n${p.body}`).join("\n\n")}\n\n_Posts go to your Hustera followers. TikTok, Instagram and X are added once connected._\n\n${embed(posts)}`,
    ai ? `7 posts written with ${ai.model}` : "7-day campaign planned",
    cost,
  );
}

/** Publishes due scheduled posts for one owner (or everyone) to the Hustera feed. */
export async function publishDuePosts(db: Queryable, ownerId?: string): Promise<number> {
  const due = await db.query<{ id: string; owner_id: string; body: string }>(
    `select id, owner_id, body from scheduled_posts where status = 'scheduled' and publish_at <= now() and channel = 'hustera' ${ownerId ? "and owner_id = $1" : ""} order by publish_at limit 100`,
    ownerId ? [ownerId] : [],
  );
  for (const p of due) {
    const [post] = await db.query<{ id: string }>(`insert into posts (author_id, body, visibility) values ($1, $2, 'public') returning id`, [p.owner_id, p.body]);
    for (const tag of extractTags(p.body)) await db.query(`insert into post_tags (post_id, tag) values ($1, $2) on conflict do nothing`, [post!.id, tag]);
    await db.query(`update scheduled_posts set status = 'published', post_id = $2 where id = $1`, [p.id, post!.id]);
    await db.query(`insert into notifications (user_id, kind, body) values ($1, 'agent', $2)`, [p.owner_id, `ContentFlow posted: ${p.body.slice(0, 80)}`]);
  }
  return due.length;
}

export async function schedulePosts(ctx: ToolContext): Promise<ToolOutcome> {
  const posts = extract<PlannedPost[]>(ctx.inputs.campaign);
  if (!posts?.length) return { ok: false, blocked: false, error: "No campaign to schedule" };
  for (const p of posts) {
    // Day 1 goes out now; the rest at 09:00 UTC on the following days.
    await ctx.db.query(
      `insert into scheduled_posts (owner_id, mission_id, body, publish_at) values ($1, $2, $3, case when $4::int = 1 then now() else date_trunc('day', now()) + make_interval(days => $4::int - 1, hours => 9) end)`,
      [ctx.ownerId, ctx.missionId, p.body, p.day],
    );
  }
  const published = await publishDuePosts(ctx.db, ctx.ownerId);
  return ok("schedule", "Campaign scheduled", `# Campaign scheduled\n\n${posts.map((p) => `- Day ${p.day}: ${p.day === 1 ? "posted now" : `scheduled`}`).join("\n")}\n\nThe background worker publishes the rest at 09:00 UTC each day.`, `Scheduled ${posts.length} posts — ${published} published now`);
}

// ---------------------------------------------------------------- TubeEngine

const IDEA_PATTERNS = [
  (n: string) => `${n} for complete beginners (step by step)`,
  (n: string) => `7 ${n} mistakes everyone makes`,
  (n: string) => `${n} on a budget: what actually works`,
  (n: string) => `I tried ${n} for 30 days — honest results`,
  (n: string) => `The ${n} tools I'd buy again (and skip)`,
  (n: string) => `${n} explained in 10 minutes`,
  (n: string) => `Beginner vs pro: ${n} compared`,
  (n: string) => `A week of ${n} routines that stick`,
  (n: string) => `${n} myths you can stop believing`,
  (n: string) => `How I'd start ${n} again in ${new Date().getFullYear()}`,
];

export async function ytIdeas(ctx: ToolContext): Promise<ToolOutcome> {
  const niche = ctx.params.niche ?? ctx.title;
  let ideas = IDEA_PATTERNS.map((f) => f(niche));
  let cost = 2;
  const ai = await aiText(ctx, "You are a YouTube strategist. Return exactly 10 video ideas, one per line, no numbering.", `Niche: ${niche}\nFormat: ${ctx.params.format ?? "faceless"}\nResearch notes:\n${(ctx.inputs.research ?? "").slice(0, 1500)}`, 500);
  if (ai) {
    const lines = ai.text.split("\n").map((l) => l.replace(/^[-*\d.)\s]+/, "").trim()).filter((l) => l.length > 10);
    if (lines.length >= 5) {
      ideas = lines.slice(0, 10);
      cost = ai.costCents;
    }
  }
  return ok("yt_ideas", `Video ideas — ${niche}`, `# 10 video ideas\n\n${ideas.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n${embed(ideas)}`, ai ? `10 ideas with ${ai.model}` : "10 video ideas found", cost);
}

export async function ytScripts(ctx: ToolContext): Promise<ToolOutcome> {
  const ideas = extract<string[]>(ctx.inputs.ideas) ?? [];
  const niche = ctx.params.niche ?? ctx.title;
  const top = ideas.slice(0, 3);
  let cost = 0;
  const parts: string[] = [];
  for (const idea of top) {
    const ai = await aiText(ctx, "You write YouTube scripts: hook (first 10 seconds), intro, 3 sections, call to action. Then 'Title:', 'Description:' and 'Tags:' lines.", `Video: ${idea}\nNiche: ${niche}\nFormat: ${ctx.params.format ?? "faceless"}`, 1200);
    if (ai) {
      cost += ai.costCents;
      parts.push(`## ${idea}\n\n${ai.text}`);
    } else {
      parts.push(
        `## ${idea}\n\n- **Hook (0–10s):** Show the end result or the biggest mistake first.\n- **Intro:** Who this is for and what they'll be able to do after watching.\n- **Section 1:** The basics of ${niche} in plain words.\n- **Section 2:** A worked example on screen.\n- **Section 3:** Common mistakes and how to avoid them.\n- **CTA:** Ask one question for the comments; link your free resource.\n\n**Title:** ${idea}\n\n**Description:** Everything you need to know about ${niche.toLowerCase()} — ${idea.toLowerCase()}. Chapters below.\n\n**Tags:** ${niche.toLowerCase()}, ${niche.toLowerCase()} tutorial, beginner, how to`,
      );
    }
  }
  return ok("yt_scripts", "Scripts & metadata", `# Scripts & metadata\n\n${parts.join("\n\n")}\n\n${embed(top)}`, cost ? `Wrote ${top.length} scripts with AI` : `Outlined ${top.length} scripts — add an AI model for full scripts`, cost);
}

export function ytThumbnails(ctx: ToolContext): ToolOutcome {
  const vids = extract<string[]>(ctx.inputs.scripts) ?? [];
  return ok(
    "yt_thumbnails",
    "Thumbnail concepts",
    `# Thumbnail concepts\n\n${vids.map((v, i) => `## ${v}\n- **Text (3–4 words):** ${v.split(" ").slice(0, 4).join(" ").toUpperCase()}\n- **Visual:** ${["before/after split", "one bold object on a clean background", "face-free close-up of the result"][i % 3]}\n- **Image prompt:** high-contrast YouTube thumbnail, ${v.toLowerCase()}, no text, bright, 16:9`).join("\n\n")}`,
    "Thumbnail concepts ready",
  );
}

export function ytPublishPlan(ctx: ToolContext): ToolOutcome {
  const vids = extract<string[]>(ctx.inputs.scripts) ?? [];
  const start = new Date();
  const rows = vids.map((v, i) => {
    const d = new Date(start.getTime() + (i + 1) * 7 * 86400_000);
    return `| ${d.toISOString().slice(0, 10)} | ${v} | Script ✓ · Thumbnail ✓ · Upload: connect YouTube |`;
  });
  return ok("yt_plan", "Upload schedule", `# Weekly upload schedule\n\n| Date | Video | Status |\n| --- | --- | --- |\n${rows.join("\n")}\n\nTubeEngine runs again every week with fresh ideas.`, `Upload schedule for the next ${rows.length} weeks`);
}

// ---------------------------------------------------------------- LinkLoom (affiliate)

export function affKeywordPlan(ctx: ToolContext): ToolOutcome {
  const found = findNiche(ctx.params.network ?? "");
  if (!found) return { ok: false, blocked: false, error: "Choose an affiliate network and niche" };
  const { network, niche } = found;
  const modifiers = ["best", "review", "vs", "for beginners", "under €100", "alternatives"];
  const rows = niche.keywords.flatMap((k) => [k, ...modifiers.slice(0, 2).map((m) => (k.startsWith("best") ? `${k} ${m === "best" ? "2026" : m}` : `${m} ${k}`))]);
  return ok("aff_keywords", `Keyword plan — ${niche.name}`, `# Keyword plan: ${niche.name} (${network.name})\n\n| Keyword | Intent |\n| --- | --- |\n${rows.map((k) => `| ${k} | ${/best|vs|review|alternatives/.test(k) ? "Buy / compare" : "Learn"} |`).join("\n")}\n\n**Content angles:** ${niche.angles.join(" · ")}`, `Planned ${rows.length} buyer-intent keywords`);
}

export async function affCreateLinks(ctx: ToolContext): Promise<ToolOutcome> {
  const found = findNiche(ctx.params.network ?? "");
  const lines = parseAffiliateLines(ctx.params.links ?? "");
  if (!found || !lines.length) return { ok: false, blocked: false, error: "Add at least one affiliate link (name | https://…)" };
  const links: { name: string; slug: string }[] = [];
  for (const l of lines) {
    const slug = `${slugify(l.name, 30)}-${randomSuffix()}`;
    await ctx.db.query(`insert into affiliate_links (owner_id, mission_id, network, niche, name, destination, slug, disclosure) values ($1, $2, $3, $4, $5, $6, $7, $8)`, [
      ctx.ownerId, ctx.missionId, found.network.id, found.niche.id, l.name, l.url, slug, found.network.disclosure,
    ]);
    links.push({ name: l.name, slug });
  }
  return ok("aff_links", "Tracked links", `# Tracked links\n\n${links.map((l) => `- **${l.name}** → /go/${l.slug}`).join("\n")}\n\nEvery click is counted and visitors see the disclosure: _${found.network.disclosure}_\n\n${embed({ links, disclosure: found.network.disclosure })}`, `Created ${links.length} tracked links`);
}

export async function affArticles(ctx: ToolContext): Promise<ToolOutcome> {
  const data = extract<{ links: { name: string; slug: string }[]; disclosure: string }>(ctx.inputs.links);
  const found = findNiche(ctx.params.network ?? "");
  if (!data || !found) return { ok: false, blocked: false, error: "No links to write about" };
  const parts: string[] = [];
  let cost = 0;
  const names = data.links.map((l) => l.name);
  const ai = await aiText(ctx, "You write honest affiliate comparison articles in Markdown. Mention real trade-offs; never claim you tested something unless stated.", `Niche: ${found.niche.name}\nProducts: ${names.join(", ")}\nKeywords: ${found.niche.keywords.join(", ")}\nWrite one 'Best ${found.niche.name}' comparison article (600–900 words) with a section per product.`, 1500);
  if (ai) {
    cost += ai.costCents;
    parts.push(ai.text);
  } else {
    parts.push(
      `# Best ${found.niche.name.toLowerCase()}: an honest comparison\n\n_Outline — add an AI model to write the full article._\n\n## How we compare\nPrice, quality, who it's for, and the trade-offs.\n\n${data.links.map((l) => `## ${l.name}\n- **Best for:** …\n- **Pros:** …\n- **Cons:** …\n- **Check price:** /go/${l.slug}`).join("\n\n")}\n\n## Verdict\nWhich one to pick for which kind of buyer.`,
    );
  }
  parts.push(`_${data.disclosure}_`);
  const text = parts.join("\n\n");
  const withLinks = data.links.reduce((acc, l) => (acc.includes(`/go/${l.slug}`) ? acc : `${acc}\n\n[${l.name}](/go/${l.slug})`), text);
  return ok("aff_articles", `Article — best ${found.niche.name.toLowerCase()}`, withLinks, ai ? `Article written with ${ai.model}` : "Article outline with tracked links", cost || 2);
}

export async function affReport(ctx: ToolContext): Promise<ToolOutcome> {
  const rows = await ctx.db.query<{ name: string; slug: string; week: number; total: number }>(
    `select l.name, l.slug,
            count(c.id) filter (where c.created_at > now() - interval '7 days')::int as week,
            count(c.id)::int as total
       from affiliate_links l left join affiliate_clicks c on c.link_id = l.id where l.owner_id = $1 group by l.id order by total desc`,
    [ctx.ownerId],
  );
  const week = rows.reduce((a, r) => a + r.week, 0);
  return ok("aff_report", "Click report", `# Affiliate click report\n\n| Link | Last 7 days | All time |\n| --- | --- | --- |\n${rows.map((r) => `| ${r.name} (/go/${r.slug}) | ${r.week} | ${r.total} |`).join("\n") || "| – | 0 | 0 |"}\n\nCommissions are paid by the network — record them in your Wallet as revenue when they arrive.`, `${week} clicks in the last 7 days`);
}

// ---------------------------------------------------------------- RankRiver (SEO)

export function seoKeywordMap(ctx: ToolContext): ToolOutcome {
  const fromResearch = [...(ctx.inputs.seo ?? "").matchAll(/^\| ([^|]+?) \| [\d–-]+ \|$/gm)].map((m) => m[1]!.trim()).filter((k) => k !== "Keyword");
  const base = ctx.title.toLowerCase();
  const keywords = fromResearch.length ? fromResearch : [base, `best ${base}`, `${base} for beginners`, `how to choose ${base}`, `${base} vs alternatives`, `${base} price`, `${base} review`];
  const intent = (k: string) => (/best|vs|review|price|buy|cheap/.test(k) ? "Buy / compare" : /how|what|why|guide/.test(k) ? "Learn" : "Explore");
  return ok("seo_map", "Keyword map", `# Keyword map\n\n| Keyword | Intent | Page type |\n| --- | --- | --- |\n${keywords.map((k) => `| ${k} | ${intent(k)} | ${intent(k) === "Buy / compare" ? "Product or comparison page" : "Guide / blog post"} |`).join("\n")}\n\n${embed(keywords)}`, `Mapped ${keywords.length} keywords by intent`);
}

export async function seoBriefs(ctx: ToolContext): Promise<ToolOutcome> {
  const keywords = (extract<string[]>(ctx.inputs.map) ?? [ctx.title]).slice(0, 4);
  const ai = await aiText(ctx, "You write SEO content briefs: title, H2 outline, questions to answer, internal links.", `Topic: ${ctx.title}\nAbout: ${ctx.brief}\nKeywords: ${keywords.join(", ")}`, 1000);
  const template = keywords.map((k) => `## ${k}\n- **Title:** ${k.charAt(0).toUpperCase() + k.slice(1)} — a practical guide\n- **Outline:** What it is · How to choose · Mistakes · FAQ\n- **Answer:** the 3 questions buyers ask most about "${k}"\n- **Internal link:** your product page`).join("\n\n");
  return ok("seo_briefs", "Content briefs", `# Content briefs\n\n${ai?.text ?? template}`, ai ? `Briefs with ${ai.model}` : `${keywords.length} content briefs`, ai?.costCents ?? 2);
}

export function seoOnpage(ctx: ToolContext): ToolOutcome {
  return ok(
    "checklist",
    "On-page checklist",
    `# On-page SEO checklist\n\n- [ ] One clear H1 with the main keyword ("${ctx.title}")\n- [ ] Title tag under 60 characters, meta description under 155\n- [ ] Descriptive image file names and alt text\n- [ ] Answer the main question in the first 100 words\n- [ ] Internal links to your product and related guides\n- [ ] Page loads in under 2.5 s on mobile\n- [ ] Product schema (price, availability) on product pages\n- [ ] No duplicate or thin pages`,
    "On-page checklist ready",
  );
}

// ---------------------------------------------------------------- MailMint

export async function mailSequence(ctx: ToolContext): Promise<ToolOutcome> {
  const p = await missionProduct(ctx);
  const subject = p?.title ?? ctx.title;
  const link = p ? (p.stripe_payment_link_url ?? productUrl(p)) : "";
  const goal = ctx.params.goal ?? "launch";
  const ai = await aiText(ctx, "You write email sequences: 5 emails, each with 'Subject:', send timing and a short body with one call to action. Honest, no fake urgency.", `Product: ${subject}\nAbout: ${p?.description ?? ctx.brief}\nPrice: ${p ? formatCents(p.price_cents) : ""}\nGoal: ${goal}\nLink: ${link}`, 1300);
  const template = [
    ["Day 0", `Welcome — here's what to expect`, `Thanks for joining. Over the next days I'll share how ${subject} helps and what's inside.`],
    ["Day 2", `The problem ${subject} solves`, `Most people struggle with … Here's the simple way through it.`],
    ["Day 4", `What's inside ${subject}`, `A quick tour of everything you get. ${link}`],
    ["Day 6", `Questions people ask`, `Answers to the three most common questions, including refunds.`],
    ["Day 8", `${subject} is ready when you are`, `If it's a fit, here's the link: ${link}. If not, no hard feelings.`],
  ].map(([d, s, b]) => `## ${d} — Subject: ${s}\n${b}\n\n_Unsubscribe link and sender address in every email._`);
  return ok("mail_sequence", `Email sequence — ${subject}`, `# Email sequence (${goal})\n\n${ai?.text ?? template.join("\n\n")}`, ai ? `5 emails written with ${ai.model}` : "5-email sequence drafted", ai?.costCents ?? 2);
}

export function mailConsent(): ToolOutcome {
  return ok("checklist", "Consent checklist", `# Email consent checklist\n\n- [ ] Every subscriber opted in (no bought or scraped lists)\n- [ ] Clear unsubscribe link in every email, honoured immediately\n- [ ] Your name and a physical/contact address in the footer\n- [ ] Store consent date and source (GDPR)\n- [ ] Sending connected via RESEND_API_KEY — until then emails stay drafts`, "Consent checklist ready");
}

// ---------------------------------------------------------------- AdCraft

export async function adAngles(ctx: ToolContext): Promise<ToolOutcome> {
  const p = await missionProduct(ctx);
  const subject = p?.title ?? ctx.title;
  const ai = await aiText(ctx, "You find advertising angles: pain, desire, proof, offer, objection. Return Markdown bullets with one line each.", `Product: ${subject}\nAbout: ${p?.description ?? ctx.brief}`, 500);
  const template = [`**Pain:** the frustration ${subject} removes`, `**Desire:** the outcome buyers want`, `**Proof:** what's inside / how it works (no fake reviews)`, `**Offer:** ${p ? formatCents(p.price_cents) : "your price"} with instant access`, `**Objection:** "Is it worth it?" — answer honestly`];
  return ok("ad_angles", `Ad angles — ${subject}`, `# Ad angles\n\n${ai?.text ?? template.map((x) => `- ${x}`).join("\n")}`, "Ad angles found", ai?.costCents ?? 2);
}

export async function adCopy(ctx: ToolContext): Promise<ToolOutcome> {
  const p = await missionProduct(ctx);
  const subject = p?.title ?? ctx.title;
  const ai = await aiText(ctx, "You write ad copy variants for Meta, TikTok and Google Search within their ad policies. No guarantees, no before/after claims.", `Product: ${subject}\nAngles:\n${(ctx.inputs.angles ?? "").slice(0, 1500)}`, 900);
  const template = `## Meta\n- Headline: ${subject} — made simple\n- Primary text: Stop wasting time on … ${subject} gives you a clear way to … \n\n## TikTok\n- Hook: "I wish I had this when I started…"\n\n## Google Search\n- Headline 1: ${subject.slice(0, 30)}\n- Headline 2: Instant access\n- Description: Clear, practical and ready to use today.`;
  return ok("ad_copy", "Ad copy variants", `# Ad copy\n\n${ai?.text ?? template}\n\n_AdCraft never launches or pays for ads._`, "Ad copy variants written", ai?.costCents ?? 2);
}
