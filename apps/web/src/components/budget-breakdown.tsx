import { COST_KIND_LABEL, budgetBreakdown, formatCents, type AgentDef, type CostKind } from "@hustera/domain";

const KIND_COLOR: Record<CostKind, string> = { data: "#2FA8FF", ai: "#8F7CFF", free: "#4EF2C2", stripe: "#635BFF", market: "#F7931A", partner: "#FFC861" };

/** Where an agent's budget goes, per step and per cost type. */
export function BudgetBreakdown({ agent, external }: { agent: AgentDef; external: string[] }) {
  const b = budgetBreakdown(agent);
  const runsPerMonth = agent.repeat ? Math.round(720 / agent.repeat[0]!) : 0;
  const paid = b.byKind.filter((k) => k.cents > 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-muted">Max per run</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatCents(b.totalMaxCents)}</p>
          <p className="text-[11px] text-muted">Upper bound — usually less</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-muted">{runsPerMonth ? `Max per month (${runsPerMonth} runs)` : "Runs"}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{runsPerMonth ? formatCents(b.totalMaxCents * runsPerMonth) : "Once"}</p>
          <p className="text-[11px] text-muted">{runsPerMonth ? "At the default schedule" : "Run again anytime"}</p>
        </div>
        <div className="rounded-2xl border border-mint/25 bg-mint/5 p-4">
          <p className="text-xs text-muted">Your hard limit</p>
          <p className="mt-1 text-2xl font-bold text-mint">You decide</p>
          <p className="text-[11px] text-muted">Total, per day and per step — checked before every step</p>
        </div>
      </div>

      {b.totalMaxCents > 0 && (
        <div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/5" role="img" aria-label="Budget split by cost type">
            {paid.map((k) => <span key={k.kind} style={{ width: `${(k.cents / b.totalMaxCents) * 100}%`, background: KIND_COLOR[k.kind] }} />)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {b.byKind.map((k) => (
              <li key={k.kind} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: KIND_COLOR[k.kind] }} />{COST_KIND_LABEL[k.kind]} · {k.cents ? `up to ${formatCents(k.cents)}` : "free"} · {k.steps} {k.steps === 1 ? "step" : "steps"}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs text-muted"><tr><th className="px-4 py-2 font-medium">Step</th><th className="px-4 py-2 font-medium">Paid to</th><th className="px-4 py-2 text-right font-medium">Max</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {b.lines.map((l, i) => (
              <tr key={l.key}>
                <td className="px-4 py-2"><span className="mr-2 text-xs tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>{l.title}</td>
                <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5 text-xs text-muted"><span className="size-2 rounded-full" style={{ background: KIND_COLOR[l.kind] }} />{COST_KIND_LABEL[l.kind]}</span></td>
                <td className="px-4 py-2 text-right tabular-nums">{l.maxCents ? formatCents(l.maxCents) : <span className="text-mint">Free</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-semibold">How your budget is used</p>
          <ul className="mt-2 space-y-1 text-muted">
            <li>Each step reserves its maximum before it runs and settles the real cost after.</li>
            <li>Unused reservations are released back to you.</li>
            <li>Hustera takes no cut of your agent budget — it pays for data and AI calls only.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-semibold">Costs outside Hustera</p>
          {external.length ? <ul className="mt-2 space-y-1 text-muted">{external.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-2 text-muted">None — everything this agent does is inside your budget.</p>}
        </div>
      </div>
    </div>
  );
}
