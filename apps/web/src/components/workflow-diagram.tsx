import { Briefcase, ChartLine, Check, CreditCard, FileText, Handshake, LayoutTemplate, Link2, Loader2, Mail, Megaphone, Plug, Radar, Search, ShieldCheck, Shirt, Sparkles, Store, TrendingUp, Truck, Video, type LucideIcon } from "lucide-react";
import { getTool, type WorkflowStep } from "@hustera/domain";

const PREFIX_ICON: Record<string, LucideIcon> = {
  social: Megaphone,
  ads: Megaphone,
  yt: Video,
  aff: Link2,
  seo: TrendingUp,
  mail: Mail,
  pages: LayoutTemplate,
  drop: Truck,
  pod: Shirt,
  price: Radar,
  gigs: Briefcase,
  markets: ChartLine,
  stripe: CreditCard,
  hustera: Store,
  ai: Sparkles,
  instant: Search,
  sandbox: FileText,
  composio: Plug,
  partner: Handshake,
};

export const stepIcon = (toolId: string): LucideIcon => PREFIX_ICON[toolId.split(".")[0]!] ?? FileText;

export type StepState = "queued" | "running" | "awaiting_approval" | "succeeded" | "failed" | "blocked" | "cancelled" | "skipped";

interface Props {
  steps: WorkflowStep[];
  accent: string;
  /** Step key → what is needed to unlock it (shown dimmed). */
  needs?: Record<string, string>;
  /** Live state per step key, when rendering a running mission. */
  states?: Record<string, StepState>;
  agentNames?: Record<string, string>;
}

/** Full, explained workflow: one node per step with data flowing between them. */
export function WorkflowDiagram({ steps, accent, needs = {}, states, agentNames = {} }: Props) {
  return (
    <ol className="relative" style={{ ["--edge" as string]: `${accent}aa`, ["--node" as string]: `${accent}66` }}>
      {steps.map((st, i) => {
        const Icon = stepIcon(st.toolId);
        const tool = getTool(st.toolId);
        const need = needs[st.key];
        const state = states?.[st.key];
        const done = state === "succeeded";
        const live = state === "running" || state === "awaiting_approval";
        const last = i === steps.length - 1;
        return (
          <li key={st.key} className={`relative flex gap-4 pb-6 ${need && !state ? "opacity-60" : ""}`} data-step={st.key}>
            {!last && <span aria-hidden="true" className={`absolute left-[21px] top-12 bottom-0 w-0.5 ${done || !states ? "wf-edge-v" : "bg-line"}`} />}
            <span
              className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-2xl border ${live ? "wf-node-live" : ""}`}
              style={{ borderColor: `${accent}66`, background: done ? accent : `linear-gradient(135deg, ${accent}33, ${accent}11)`, color: done ? "#0b0b1a" : accent }}
              aria-hidden="true"
            >
              {done ? <Check size={20} strokeWidth={2.6} /> : state === "running" ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-semibold">{st.title}</h3>
                {tool?.requiresApproval && <span className="inline-flex items-center gap-1 rounded-full border border-indigo/40 bg-indigo/10 px-2 py-0.5 text-[11px] font-semibold text-[#b8b0ff]"><ShieldCheck size={11} aria-hidden="true" /> Your approval</span>}
                {st.when && <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">Optional</span>}
                {tool?.simulated && <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">Simulated</span>}
                {need && <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">Unlocks with {need}</span>}
                {state && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${done ? "bg-mint/15 text-mint" : live ? "bg-indigo/15 text-[#b8b0ff]" : state === "failed" || state === "blocked" ? "bg-danger/15 text-danger" : "bg-slate-2 text-muted"}`}>{state.replace("_", " ")}</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{st.explain}</p>
              {agentNames[st.agentId] && <p className="mt-1 text-[11px] uppercase tracking-wider text-muted/80">{agentNames[st.agentId]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact chain of step icons for cards. */
export function WorkflowMini({ steps, accent, max = 7 }: { steps: WorkflowStep[]; accent: string; max?: number }) {
  const shown = steps.slice(0, max);
  return (
    <div className="flex items-center" style={{ ["--edge" as string]: `${accent}99` }} aria-label={`Workflow: ${steps.map((s) => s.title).join(", ")}`} role="img">
      {shown.map((st, i) => {
        const Icon = stepIcon(st.toolId);
        return (
          <span key={st.key} className="flex items-center">
            {i > 0 && <span aria-hidden="true" className="wf-edge-h h-0.5 w-3 sm:w-4" />}
            <span title={st.title} className="flex size-7 items-center justify-center rounded-lg border" style={{ borderColor: `${accent}55`, background: `${accent}1a`, color: accent }}>
              <Icon size={14} aria-hidden="true" />
            </span>
          </span>
        );
      })}
      {steps.length > max && <span className="ml-2 text-xs text-muted">+{steps.length - max}</span>}
    </div>
  );
}
