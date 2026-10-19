import Link from "next/link";
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { SPARK_RULES, SPARK_TIERS } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { sparksLedger, sparksSummary } from "@/server/sparks";
import { ReportMenu } from "@/components/post";
import { LogoMark } from "@/components/brand";
import { PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const viewer = await requireViewer();
  const [summary, ledger] = await Promise.all([sparksSummary(viewer.id), sparksLedger(viewer.id)]);
  const net = Math.max(0, summary.balance);
  const progress = summary.next ? Math.min(100, Math.round(((net - summary.tier.threshold) / (summary.next.threshold - summary.tier.threshold)) * 100)) : 100;

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" description={<>Sparks are loyalty points for genuine contributions. They have <strong className="text-cloud">no cash value</strong> and can&apos;t be bought, sold, transferred or redeemed. <Link href="/legal/sparks" className="underline">Read the terms</Link>.</>} />

      <section className="relative overflow-hidden rounded-[20px] border border-mint/20 p-6 sm:p-8" style={{ background: "radial-gradient(500px 260px at 0% 50%, rgb(78 242 194 / 0.18), transparent 70%), #111c31" }}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-mint/60 bg-midnight shadow-[0_0_40px_rgb(78_242_194/0.35)]">
            <LogoMark size={56} />
          </div>
          <div className="flex-1">
            <p className="eyebrow text-mint">Your Sparks</p>
            <p className="text-5xl font-extrabold">{summary.balance}</p>
            <p className="mt-1 text-sm text-muted">{summary.tier.name} tier · {summary.tier.perk}</p>
          </div>
          {summary.next && (
            <div className="w-full sm:w-64">
              <div className="flex justify-between text-xs text-muted"><span>{summary.tier.name}</span><span>{summary.next.name} at {summary.next.threshold}</span></div>
              <div className="mt-2 h-2 rounded-full bg-midnight" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress to ${summary.next.name}`}>
                <div className="h-2 rounded-full bg-gradient-to-r from-indigo to-mint" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="earn">
          <h2 id="earn" className="font-semibold">How to earn</h2>
          <ul className="mt-4 space-y-3">
            {Object.values(SPARK_RULES).map((r) => (
              <li key={r.id} className="flex items-start gap-3 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-muted">{r.description}{r.dailyLimit ? ` Up to ${r.dailyLimit}× per day.` : ""}{r.lifetimeLimit === 1 ? " Once." : ""}</p>
                </div>
                <span className="font-semibold text-mint">+{r.amount}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6" aria-labelledby="tiers">
          <h2 id="tiers" className="font-semibold">Recognition tiers</h2>
          <p className="mt-1 text-sm text-muted">Tiers unlock automatically. Nothing is ever spent.</p>
          <ul className="mt-4 space-y-2">
            {SPARK_TIERS.map((t) => (
              <li key={t.id} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${t.id === summary.tier.id ? "border-mint/50 bg-mint/5" : "border-line"}`}>
                <span><span className="font-semibold">{t.name}</span> <span className="text-muted">· {t.perk}</span></span>
                <span className="text-muted">{t.threshold}+</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-6" aria-labelledby="ledger">
        <h2 id="ledger" className="font-semibold">Ledger</h2>
        <p className="mt-1 text-sm text-muted">Every award and reversal. Question any entry and a moderator will review it.</p>
        {ledger.length ? (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="py-2 font-medium">Activity</th><th className="py-2 font-medium">When</th><th className="py-2 text-right font-medium">Sparks</th><th className="py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-line">
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td className="py-2.5">{e.reverses_id ? `Reversal: ${e.reason}` : e.reason}</td>
                  <td className="py-2.5 text-muted"><TimeAgo date={e.created_at} /></td>
                  <td className={`py-2.5 text-right font-semibold ${e.amount > 0 ? "text-mint" : "text-danger"}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</td>
                  <td className="py-2.5 text-right"><ReportMenu targetType="rewards_entry" targetId={e.id} label="Question" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-muted">No Sparks yet. Complete your profile or share your first post to get started.</p>
        )}
      </section>
    </div>
  );
}
