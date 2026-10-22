import Link from "next/link";
import type { Metadata } from "next";
import { formatCents, PLATFORM_FEE_BPS } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { buyerOrders, financials, ledgerEntries } from "@/server/commerce";
import { providerStatus } from "@/server/payments";
import { sparksSummary } from "@/server/sparks";
import { recordCostAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Illustrative, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Wallet" };

type Fin = Awaited<ReturnType<typeof financials>>;

function Statement({ fin, title, simulated }: { fin: Fin; title: string; simulated: boolean }) {
  const i = fin.inputs;
  const rows: [string, number][] = [
    ["Revenue", i.revenueCents],
    ["Refunds", -i.refundsCents],
    ["Payment fees", -i.paymentFeesCents],
    ["Cost of goods", -i.cogsCents],
    ["Shipping", -i.shippingCents],
    ["Advertising", -i.advertisingCents],
    ["Tools", -i.toolsCents],
    ["Other costs", -i.otherCents],
  ];
  return (
    <section className="card p-6" aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {simulated && <Illustrative>Test mode — not real money</Illustrative>}
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between"><dt className="text-muted">{label}</dt><dd className={v < 0 ? "text-danger" : ""}>{formatCents(v)}</dd></div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Net profit</dt><dd>{formatCents(fin.settlement.netProfitCents)}</dd></div>
      </dl>
      <div className="mt-4 rounded-xl bg-midnight/50 p-4 text-sm">
        <p className="font-medium">Platform fee preview ({PLATFORM_FEE_BPS / 100}% of positive profit)</p>
        <p className="mt-1 text-muted">Eligible profit {formatCents(fin.settlement.eligibleProfitCents)} → fee {formatCents(fin.settlement.platformFeeCents)}, you keep {formatCents(fin.settlement.userShareCents)}.{fin.settlement.lossCarryforwardCents > 0 && ` Loss carried forward: ${formatCents(fin.settlement.lossCarryforwardCents)}.`}</p>
        <p className="mt-2 text-xs text-muted">Preview only — nothing is collected. The fee applies only to agent-operated activity once the contractual definition is finalised with legal and accounting advisers.</p>
      </div>
    </section>
  );
}

export default async function WalletPage() {
  const viewer = await requireViewer();
  const [real, test, entries, purchases, sparks] = await Promise.all([financials(viewer.id, false), financials(viewer.id, true), ledgerEntries(viewer.id, 50), buyerOrders(viewer.id), sparksSummary(viewer.id)]);
  const payments = providerStatus();
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet" description="Your business money, from verified payments only. Kept separate from Sparks and from agent test budgets. Hustera never holds your funds — the payment provider pays you out." />
      <p className="text-sm text-muted">Payments: {payments.reason}.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Statement fin={real} title="Real business results" simulated={false} />
        {test.hasEntries ? <Statement fin={test} title="Test-mode results" simulated /> : (
          <section className="card p-6 text-sm text-muted"><h2 className="font-semibold text-cloud">Test-mode results</h2><p className="mt-2">Simulated test orders appear here, separate from real money.</p></section>
        )}
      </div>

      <section className="card p-6" aria-labelledby="cost-h">
        <h2 id="cost-h" className="font-semibold">Record a business cost</h2>
        <p className="mt-1 text-sm text-muted">Costs reduce your profit and any future platform fee. Keep receipts for your bookkeeping.</p>
        <ActionForm action={recordCostAction} reset showOk className="mt-4 grid gap-3 sm:grid-cols-[160px_120px_1fr_auto]">
          <select name="category" aria-label="Category" className="input"><option value="cogs">Cost of goods</option><option value="shipping">Shipping</option><option value="advertising">Advertising</option><option value="tools">Tools</option><option value="other">Other</option></select>
          <input name="amount" type="number" min={0.01} step="0.01" required placeholder="€" aria-label="Amount in euros" className="input" />
          <input name="memo" required minLength={2} maxLength={200} placeholder="What was it for?" aria-label="Description" className="input" />
          <button className="btn-secondary">Add</button>
        </ActionForm>
      </section>

      <section className="card p-6" aria-labelledby="ledger-h">
        <h2 id="ledger-h" className="font-semibold">Ledger</h2>
        {entries.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">When</th><th className="py-2 font-medium">Account</th><th className="py-2 font-medium">Memo</th><th className="py-2 text-right font-medium">Debit / credit</th></tr></thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 text-muted"><TimeAgo date={e.created_at} /></td>
                    <td className="py-2 font-mono text-xs">{e.account}{e.simulated && " · test"}</td>
                    <td className="py-2">{e.memo}</td>
                    <td className={`py-2 text-right ${e.amount_cents < 0 ? "text-muted" : ""}`}>{formatCents(e.amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-sm text-muted">No entries yet. Sales, refunds and costs are recorded here as balanced double entries.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="purchases-h">
          <h2 id="purchases-h" className="font-semibold">Your purchases</h2>
          {purchases.length ? (
            <ul className="mt-3 space-y-2 text-sm">{purchases.map((o) => <li key={o.id} className="flex justify-between gap-2"><Link href={`/orders/${o.access_token}`} className="underline">{o.title}</Link><span className="text-muted">{formatCents(o.amount_cents)} · {o.status}</span></li>)}</ul>
          ) : <p className="mt-2 text-sm text-muted">Nothing purchased yet.</p>}
        </section>
        <section className="card p-6 text-sm" aria-labelledby="sep-h">
          <h2 id="sep-h" className="font-semibold">Kept separate</h2>
          <ul className="mt-3 space-y-2 text-muted">
            <li><Link href="/rewards" className="text-cloud underline">Sparks</Link>: {sparks.balance} loyalty points — no cash value.</li>
            <li><Link href="/projects" className="text-cloud underline">Agent budgets</Link>: test-mode limits per mission, not funded with real money.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
