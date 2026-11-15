import Link from "next/link";
import type { AgentDef, InputField } from "@hustera/domain";
import { createMissionAction } from "@/app/actions";
import { ActionForm } from "./action-form";

const REPEAT_LABEL: Record<number, string> = { 1: "Every hour", 4: "Every 4 hours", 24: "Every day", 168: "Every week" };

function Field({ f, products }: { f: InputField; products: { id: string; title: string }[] }) {
  const id = `f-${f.name}`;
  const help = f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>;
  switch (f.type) {
    case "checkbox":
      return (
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" name={f.name} required={f.required} className="mt-1 accent-indigo" />
          {f.label}
        </label>
      );
    case "textarea":
    case "lines":
      return (
        <div>
          <label className="label" htmlFor={id}>{f.label}</label>
          <textarea id={id} name={f.name} required={f.required} maxLength={f.maxLength ?? 4000} rows={f.type === "lines" ? 5 : 3} placeholder={f.placeholder} defaultValue={f.defaultValue} className={`input ${f.type === "lines" ? "font-mono text-xs" : ""}`} />
          {help}
        </div>
      );
    case "money":
      return (
        <div>
          <label className="label" htmlFor={id}>{f.label}</label>
          <input id={id} name={f.name} type="number" min={1} max={10000} step="0.01" required={f.required} defaultValue={f.defaultValue} className="input" />
          {help}
        </div>
      );
    case "select": {
      const groups = [...new Set((f.options ?? []).map((o) => o.group).filter(Boolean))] as string[];
      return (
        <div>
          <label className="label" htmlFor={id}>{f.label}</label>
          <select id={id} name={f.name} required={f.required} defaultValue={f.defaultValue} className="input">
            {groups.length
              ? groups.map((g) => <optgroup key={g} label={g}>{f.options!.filter((o) => o.group === g).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>)
              : f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {help}
        </div>
      );
    }
    case "product":
      return (
        <div>
          <label className="label" htmlFor={id}>{f.label}</label>
          <select id={id} name={f.name} required className="input">{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
          {help}
        </div>
      );
    default:
      return (
        <div>
          <label className="label" htmlFor={id}>{f.label}</label>
          <input id={id} name={f.name} required={f.required} maxLength={f.maxLength ?? 200} placeholder={f.placeholder} defaultValue={f.defaultValue} className="input" />
          {help}
        </div>
      );
  }
}

/** The launch form for any agent, generated from its declared inputs. */
export function AgentLaunchForm({ agent, products, templateId }: { agent: AgentDef; products: { id: string; title: string }[]; templateId?: string }) {
  const needsProduct = agent.inputs.some((f) => f.type === "product");
  if (needsProduct && !products.length) {
    return <p className="text-sm text-muted">{agent.name} works on one of your published products. <Link href="/agents/ecompro" className="underline">Let EcomPro publish one</Link> or add one in <Link href="/store" className="underline">your store</Link>.</p>;
  }
  return (
    <ActionForm action={createMissionAction} className="space-y-5">
      <input type="hidden" name="agentId" value={agent.id} />
      <input type="hidden" name="region" value="Sweden" />
      {templateId && <input type="hidden" name="templateId" value={templateId} />}
      {agent.inputs.map((f) => <Field key={f.name} f={f} products={products} />)}
      {agent.repeat ? (
        <div>
          <label className="label" htmlFor="repeatHours">Schedule</label>
          <select id="repeatHours" name="repeatHours" defaultValue={String(agent.repeat[0])} className="input">
            <option value="">Run once</option>
            {agent.repeat.map((h) => <option key={h} value={h}>{REPEAT_LABEL[h] ?? `Every ${h} hours`}</option>)}
          </select>
          <p className="mt-1 text-xs text-muted">Recurring runs start automatically through the background worker.</p>
        </div>
      ) : null}
      <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="checkbox" name="mode" value="autonomous" defaultChecked className="mt-1 accent-indigo" />
        <span><span className="block font-semibold">Run drafting steps automatically</span><span className="text-xs text-muted">Publishing, posting and anything public still waits for your approval. Untick to approve every step.</span></span>
      </label>
      <fieldset>
        <legend className="label">Agent budget</legend>
        <p className="mb-2 text-xs text-muted">Limits are checked before every step. AI and data calls are charged against it.</p>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-xs text-muted">Total (€)<input name="total" type="number" min={0} max={100} step="0.01" defaultValue="2.00" required className="input mt-1" /></label>
          <label className="text-xs text-muted">Per day (€)<input name="perDay" type="number" min={0} max={100} step="0.01" defaultValue="1.00" required className="input mt-1" /></label>
          <label className="text-xs text-muted">Per step (€)<input name="perTask" type="number" min={0} max={100} step="0.01" defaultValue="0.50" required className="input mt-1" /></label>
        </div>
      </fieldset>
      <button className="btn-primary w-full">Start {agent.name}</button>
    </ActionForm>
  );
}
