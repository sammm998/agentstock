import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Check } from "lucide-react";
import { INSTANT_CATALOG, OPPORTUNITY_TEMPLATES, getAgent } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { getMyStore, myProducts } from "@/server/commerce";
import { llmConfig } from "@/server/llm";
import { instantConfigured } from "@/server/instant";
import { stripeConfigured } from "@/server/stripe-api";
import { agentUsage } from "@/server/agents";
import { createMissionAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { AgentIcon } from "@/components/visuals";
import { StatusBadge } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: getAgent((await params).id)?.name ?? "Agent" };
}

function Budget() {
  return (
    <fieldset>
      <legend className="label">Agent budget (test mode)</legend>
      <p className="mb-2 text-xs text-muted">Limits are enforced before every step. Costs are simulated until real tool costs are connected.</p>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-xs text-muted">Total (€)<input name="total" type="number" min={0} max={100} step="0.01" defaultValue="2.00" required className="input mt-1" /></label>
        <label className="text-xs text-muted">Per day (€)<input name="perDay" type="number" min={0} max={100} step="0.01" defaultValue="1.00" required className="input mt-1" /></label>
        <label className="text-xs text-muted">Per step (€)<input name="perTask" type="number" min={0} max={100} step="0.01" defaultValue="0.50" required className="input mt-1" /></label>
      </div>
    </fieldset>
  );
}

function Autonomy() {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
      <input type="checkbox" name="mode" value="autonomous" defaultChecked className="mt-1 accent-indigo" />
      <span><span className="block font-semibold">Run drafting steps automatically</span><span className="text-xs text-muted">Publishing, posting and anything public still waits for your approval. Untick to approve every step.</span></span>
    </label>
  );
}

export default async function AgentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ template?: string }> }) {
  const { id } = await params;
  const agent = getAgent(id);
  if (!agent) notFound();
  const viewer = await getViewer();
  const { template: templateId } = await searchParams;
  const template = OPPORTUNITY_TEMPLATES.find((t) => t.id === templateId);
  const [store, products, usage] = viewer ? await Promise.all([getMyStore(viewer.id), myProducts(viewer.id), agentUsage()]) : [null, [], await agentUsage()];
  const live = products.filter((p) => p.status === "active");
  const u = usage.find((x) => x.agent_id === agent.id);
  const llm = llmConfig();
  const instantOn = instantConfigured();
  const stripeOn = stripeConfigured();
  const instantToolkits = INSTANT_CATALOG.filter((t) => t.usedBy.includes(agent.id));

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Link href="/agents" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> AI Agents</Link>
        <header className="card p-6">
          <div className="flex items-start gap-4">
            <AgentIcon icon={agent.icon} accent={agent.accent} size={60} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{agent.name}</h1><StatusBadge status={agent.status} /></div>
              <p className="text-sm text-muted">{agent.role}</p>
            </div>
          </div>
          <p className="mt-4">{agent.summary}</p>
          {template && <p className="mt-3 rounded-xl bg-indigo/10 px-4 py-2 text-sm">Opportunity: <strong>{template.name}</strong> — {template.summary}</p>}
          <h2 className="eyebrow mt-6">What it does</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {agent.capabilities.map((c) => <li key={c} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{c}</li>)}
          </ul>
          {agent.needs && <p className="mt-4 text-sm text-warning">{agent.needs}</p>}
          <p className="mt-4 text-xs text-muted">{u ? `${u.missions} missions started · ${u.live_products} products live` : "No missions yet — you could be first."}</p>
        </header>

        {viewer && agent.launch && (
          <section className="card p-6" aria-labelledby="use-h">
            <h2 id="use-h" className="text-lg font-semibold">Use {agent.name}</h2>
            {!store && agent.launch !== "promote_product" && agent.launch !== "market_watch" && agent.launch !== "revenue_report" && (
              <p className="mt-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">You don&apos;t have a store yet. The agent will prepare everything and wait for you at the publishing step — or <Link href="/store" className="underline">create your store now</Link> (takes one minute).</p>
            )}
            {((agent.launch === "start_business" && !llm.provider) || (agent.launch === "market_watch" && !instantOn)) && (
              <p className="mt-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">{agent.launch === "market_watch" ? <>Market data comes from Composio Instant, which isn&apos;t configured yet (<code>COMPOSIO_API_KEY</code>). The mission will wait instead of showing made-up prices.</> : <>No AI model is connected, so the product-writing step will wait. Everything else runs. Add <code>COMPOSIO_API_KEY</code> (Gemini via Composio Instant) or your own model key to enable it.</>}</p>
            )}
            <ActionForm action={createMissionAction} className="mt-5 space-y-5">
              <input type="hidden" name="kind" value={agent.launch} />
              <input type="hidden" name="agentId" value={agent.id} />
              {template && <input type="hidden" name="templateId" value={template.id} />}
              <input type="hidden" name="region" value="Sweden" />
              {agent.launch === "revenue_report" ? (
                <>
                  <input type="hidden" name="title" value="Revenue report" />
                  <input type="hidden" name="brief" value="Report my verified revenue, costs and Stripe balance." />
                  <p className="text-sm text-muted">RevenueDesk reads your ledger{stripeOn ? " and your Stripe account" : ""} and writes a report. It only reads — it never moves money.</p>
                </>
              ) : agent.launch === "market_watch" ? (
                <>
                  <input type="hidden" name="title" value="Market snapshot" />
                  <div>
                    <label className="label" htmlFor="brief">Watchlist</label>
                    <textarea id="brief" name="brief" required minLength={10} maxLength={500} rows={2} defaultValue="bitcoin, ethereum, AAPL, MSFT" className="input" />
                    <p className="mt-1 text-xs text-muted">Crypto by name (bitcoin, ethereum, solana…) and stocks by ticker in capitals (AAPL, MSFT). Information only — Hustera never trades.</p>
                  </div>
                </>
              ) : agent.launch === "promote_product" ? (
                live.length ? (
                  <>
                    <div>
                      <label className="label" htmlFor="productId">Product to promote</label>
                      <select id="productId" name="productId" className="input">{live.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
                    </div>
                    <input type="hidden" name="title" value="Promotion" />
                    <input type="hidden" name="brief" value="Promote one of my published products to my followers." />
                  </>
                ) : (
                  <p className="text-sm text-muted">You need a published product first. <Link href="/agents/ecompro" className="underline">Let EcomPro publish one</Link> or add one in <Link href="/store" className="underline">your store</Link>.</p>
                )
              ) : (
                <>
                  <div>
                    <label className="label" htmlFor="title">{agent.launch === "sell_existing" ? "Product name" : "Product idea"}</label>
                    <input id="title" name="title" required minLength={3} maxLength={80} placeholder={agent.launch === "sell_existing" ? "Budget meal planner (PDF)" : "Study planner for university students"} className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="brief">{agent.launch === "sell_existing" ? "Describe the product for buyers" : "Who is it for and what should it include?"}</label>
                    <textarea id="brief" name="brief" required minLength={10} maxLength={2000} rows={4} defaultValue={template ? `${template.summary} ` : undefined} className="input" />
                    <p className="mt-1 text-xs text-muted">{agent.launch === "sell_existing" ? "Shown as the product description. Be accurate — no claims you can't back up." : "The AI uses this to write the product."}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="label" htmlFor="price">Price incl. VAT (€)</label><input id="price" name="price" type="number" min={1} max={10000} step="0.01" defaultValue="9.00" required className="input" /></div>
                    {agent.launch === "sell_existing" && (
                      <div>
                        <label className="label" htmlFor="productKind">Type</label>
                        <select id="productKind" name="productKind" className="input"><option value="digital">Digital (instant delivery)</option><option value="physical">Physical (you ship it)</option><option value="service">Service</option></select>
                      </div>
                    )}
                  </div>
                  {agent.launch === "sell_existing" && (
                    <>
                      <div>
                        <label className="label" htmlFor="deliveryContent">Delivery for digital products</label>
                        <textarea id="deliveryContent" name="deliveryContent" maxLength={5000} rows={2} placeholder="Download link or the content buyers get right after paying" className="input" />
                      </div>
                      <label className="flex items-start gap-2.5 text-sm text-muted">
                        <input type="checkbox" name="ownershipConfirmed" required className="mt-1 accent-indigo" />
                        I own this product or am authorised to sell it, and I&apos;m responsible for it as the seller.
                      </label>
                    </>
                  )}
                </>
              )}
              {(agent.launch === "revenue_report" || agent.launch === "market_watch") ? (
                <div>
                  <label className="label" htmlFor="repeatHours">Schedule</label>
                  <select id="repeatHours" name="repeatHours" defaultValue="24" className="input">
                    <option value="">Run once</option>
                    <option value="24">Every day</option>
                    <option value="168">Every week</option>
                  </select>
                  <p className="mt-1 text-xs text-muted">Recurring runs start automatically through the background worker.</p>
                  <input type="hidden" name="mode" value="autonomous" />
                </div>
              ) : (
                <Autonomy />
              )}
              <Budget />
              {(agent.launch !== "promote_product" || live.length > 0) && <button className="btn-primary w-full">Start {agent.name}</button>}
            </ActionForm>
          </section>
        )}
        {!viewer && agent.launch && <Link href={`/signin?next=/agents/${agent.id}`} className="btn-primary">Sign in to use {agent.name}</Link>}
      </div>

      <aside className="space-y-4">
        {(agent.launch === "sell_existing" || agent.launch === "start_business") && <section className="card p-5 text-sm">
          <h2 className="font-semibold">How {agent.name} earns with you</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted">
            <li>You describe the product and set a price and budget.</li>
            <li>The agent prepares research, offer, checklist and listing.</li>
            <li>You approve — it goes live in your store and is announced.</li>
            <li>{stripeOn ? "It creates a Stripe Payment Link you can share anywhere — buyers pay, money lands in your Stripe." : "Buyers pay through the checkout; with Stripe connected, the agent also creates a shareable Payment Link."}</li>
            <li>Every sale, refund and cost shows up in your wallet.</li>
          </ol>
          <p className="mt-3 text-xs text-muted">No guaranteed results. Real payments need Stripe connected; until then sales run through the labelled test checkout.</p>
        </section>}
        {instantToolkits.length > 0 && (
          <section className="card p-5 text-sm">
            <h2 className="font-semibold">Powered by Composio Instant</h2>
            <p className="mt-1 text-xs text-muted">Billed per call to Hustera&apos;s Composio wallet and capped by your mission budget.</p>
            <ul className="mt-3 flex flex-wrap gap-2">{instantToolkits.map((t) => <li key={t.slug} className="chip">{t.name}{t.active ? " · active" : ""}</li>)}</ul>
          </section>
        )}
      </aside>
    </div>
  );
}
