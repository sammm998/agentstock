import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Check, Cpu, Package, ShieldCheck, Target, Wallet } from "lucide-react";
import { AGENTS, AGENT_DETAILS, INSTANT_CATALOG, OPPORTUNITY_TEMPLATES, agentDisplayName, getAgent } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { myProducts } from "@/server/commerce";
import { agentUsage, listMissions } from "@/server/agents";
import { readiness, stepNeeds } from "@/server/agent-catalog";
import { AgentIcon } from "@/components/visuals";
import { StatusBadge, TimeAgo } from "@/components/ui";
import { WorkflowDiagram } from "@/components/workflow-diagram";
import { AgentLaunchForm } from "@/components/agent-launch-form";
import { AgentPreview } from "@/components/agent-preview";
import { BudgetBreakdown } from "@/components/budget-breakdown";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: getAgent((await params).id)?.name ?? "Agent" };
}

export function generateStaticParams() {
  return AGENTS.map((a) => ({ id: a.id }));
}

export default async function AgentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ template?: string; activation?: string }> }) {
  const { id } = await params;
  const { template: templateId, activation } = await searchParams;
  const agent = getAgent(id);
  if (!agent) notFound();
  const viewer = await getViewer();
  if (agent.adminOnly && viewer?.role !== "admin") notFound();
  const template = OPPORTUNITY_TEMPLATES.find((t) => t.id === templateId);
  const [products, usage, missions] = viewer ? await Promise.all([myProducts(viewer.id), agentUsage(), listMissions(viewer.id)]) : [[], await agentUsage(), []];
  const live = products.filter((p) => p.status === "active").map((p) => ({ id: p.id, title: p.title }));
  const mine = missions.filter((m) => m.agent_id === agent.id).slice(0, 5);
  const u = usage.find((x) => x.agent_id === agent.id);
  const r = readiness(agent);
  const needs = stepNeeds(agent);
  const helpers = [...new Set(agent.steps.map((s) => s.agentId).filter((a) => a !== agent.id))];
  const names = Object.fromEntries([agent.id, ...helpers].map((a) => [a, agentDisplayName(a)]));
  const detail = AGENT_DETAILS[agent.id];
  const instantToolkits = INSTANT_CATALOG.filter((t) => t.usedBy.includes(agent.id));

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Link href="/agents" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> AI Agents</Link>
        <header className="card glow-border relative overflow-hidden p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full blur-3xl" style={{ background: `${agent.accent}33` }} />
          {detail && <div className="relative mb-6 sm:float-right sm:mb-2 sm:ml-6 sm:w-[46%]"><AgentPreview kind={detail.preview} accent={agent.accent} className="window-3d" compact /></div>}
          <div className="relative flex items-start gap-4">
            <AgentIcon icon={agent.icon} accent={agent.accent} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-bold">{agent.name}</h1><StatusBadge status={agent.status} /></div>
              <p className="text-sm text-muted">{agent.role} · {agent.category}</p>
            </div>
          </div>
          <p className="relative mt-4 text-lg">{agent.tagline}</p>
          <p className="relative mt-2 text-sm text-muted">{agent.summary}</p>
          {template && <p className="relative mt-3 rounded-xl bg-indigo/10 px-4 py-2 text-sm">Opportunity: <strong>{template.name}</strong> — {template.summary}</p>}
          <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full border px-2.5 py-1 font-semibold ${r.ready ? "border-mint/30 bg-mint/10 text-mint" : "border-warning/30 bg-warning/10 text-warning"}`}>{r.label}</span>
            <span className="chip">{agent.steps.length} steps</span>
            {agent.repeat && <span className="chip">Recurring</span>}
            {helpers.length > 0 && <span className="chip">Works with {helpers.map((h) => names[h]).join(", ")}</span>}
            <span className="chip">{u ? `${u.missions} missions run` : "No missions yet"}</span>
          </div>
          {agent.needs && <p className="relative mt-4 text-sm text-warning">{agent.needs}</p>}
          {detail && <p className="relative mt-4 flex gap-2 text-sm"><Target size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" /><span><span className="font-semibold">Ideal for: </span><span className="text-muted">{detail.idealFor}</span></span></p>}
          <div className="clear-both" />
        </header>

        {detail && (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="card p-6" aria-labelledby="get-h">
              <h2 id="get-h" className="flex items-center gap-2 text-lg font-semibold"><span className="icon-tile size-8 rounded-lg text-mint"><Package size={16} /></span> What you get</h2>
              <ul className="mt-4 space-y-2.5 text-sm">{detail.deliverables.map((d) => <li key={d} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{d}</li>)}</ul>
            </section>
            <section className="card p-6" aria-labelledby="engine-h">
              <h2 id="engine-h" className="flex items-center gap-2 text-lg font-semibold"><span className="icon-tile size-8 rounded-lg text-[#b8b0ff]"><Cpu size={16} /></span> How it works under the hood</h2>
              <ol className="mt-4 space-y-3 text-sm">{detail.engine.map((e, i) => <li key={e} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] font-bold">{i + 1}</span><span className="text-muted">{e}</span></li>)}</ol>
            </section>
          </div>
        )}

        {detail && (
          <section className="card p-6" aria-labelledby="preview-h">
            <h2 id="preview-h" className="text-lg font-semibold">What it looks like</h2>
            <p className="mb-5 mt-1 text-sm text-muted">An illustrated example of the output {agent.name} produces.</p>
            <AgentPreview kind={detail.preview} accent={agent.accent} className="mx-auto max-w-2xl" />
          </section>
        )}

        <section className="card p-6" aria-labelledby="wf-h">
          <h2 id="wf-h" className="text-lg font-semibold">The workflow</h2>
          <p className="mb-6 mt-1 text-sm text-muted">{agent.partner ? `How ${agent.name} works once activated.` : "Exactly what happens, step by step. Steps with a shield wait for your approval; you watch every step live on the mission page."}</p>
          <WorkflowDiagram steps={agent.steps} accent={agent.accent} needs={needs} agentNames={names} />
        </section>

        {detail && (
          <section className="card p-6" aria-labelledby="budget-h">
            <h2 id="budget-h" className="flex items-center gap-2 text-lg font-semibold"><span className="icon-tile size-8 rounded-lg text-mint"><Wallet size={16} /></span> Where your investment goes</h2>
            <p className="mb-5 mt-1 text-sm text-muted">Every step, what it can cost at most and who gets paid. You set the hard limits when you start.</p>
            <BudgetBreakdown agent={agent} external={detail.external} />
          </section>
        )}

        {agent.partner && (
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Why members use {agent.name}</h2>
            <ul className="mt-3 space-y-2 text-sm">{agent.partner.highlights.map((h) => <li key={h} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />{h}</li>)}</ul>
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        {agent.partner ? (
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Activate {agent.name}</h2>
            {activation === "unavailable" && <p role="status" className="mt-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">Activation isn&apos;t open yet — the partner link hasn&apos;t been configured. Try again soon.</p>}
            <p className="mt-2 text-sm text-muted">{agent.name} runs in our partner&apos;s own product. Activation takes you there with your Hustera partner access.</p>
            {viewer ? (
              <a href={`/agents/${agent.id}/activate`} className="btn-primary mt-4 w-full" rel="nofollow">Activate {agent.name} <ArrowUpRight size={16} aria-hidden="true" /></a>
            ) : (
              <Link href={`/signin?next=/agents/${agent.id}`} className="btn-primary mt-4 w-full">Sign in to activate</Link>
            )}
            <p className="mt-3 text-xs text-muted">Partner product by Scoutr. Hustera may receive a referral commission.</p>
          </section>
        ) : viewer ? (
          <section className="card p-6" aria-labelledby="use-h">
            <h2 id="use-h" className="mb-4 text-lg font-semibold">Start {agent.name}</h2>
            <AgentLaunchForm agent={agent} products={live} templateId={template?.id} />
          </section>
        ) : (
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Use {agent.name}</h2>
            <p className="mt-2 text-sm text-muted">Create a free account to launch this agent with your own budget and approvals.</p>
            <Link href={`/signin?next=/agents/${agent.id}`} className="btn-primary mt-4 w-full">Sign in to use {agent.name}</Link>
          </section>
        )}
        <section className="card p-5 text-sm">
          <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-mint" aria-hidden="true" /> Guardrails</h2>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li>Budget checked before every step</li>
            <li>Public actions wait for your approval</li>
            <li>Pause or stop at any time</li>
            <li>No guaranteed results or income</li>
            {agent.category === "Markets" && <li className="text-warning">Paper trading with real prices. Real-money trading and profit sharing are disabled until Hustera is licensed.</li>}
          </ul>
        </section>
        {mine.length > 0 && (
          <section className="card p-5 text-sm">
            <h2 className="font-semibold">Your {agent.name} missions</h2>
            <ul className="mt-2 divide-y divide-line">{mine.map((m) => <li key={m.id} className="flex items-center justify-between gap-2 py-2"><Link href={`/projects/${m.id}`} className="truncate hover:underline">{m.title}</Link><span className="shrink-0 text-xs text-muted">{m.done}/{m.total} · <TimeAgo date={m.created_at} /></span></li>)}</ul>
          </section>
        )}
        {instantToolkits.length > 0 && (
          <section className="card p-5 text-sm">
            <h2 className="font-semibold">Data sources</h2>
            <ul className="mt-3 flex flex-wrap gap-2">{instantToolkits.map((t) => <li key={t.slug} className="chip">{t.name}</li>)}</ul>
          </section>
        )}
      </aside>
    </div>
  );
}
