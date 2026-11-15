import type { PortfolioView } from "@/server/live";
import { TimeAgo } from "./ui";

function money(cents: number, cls: "crypto" | "stocks") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: cls === "stocks" ? "USD" : "EUR" }).format(cents / 100);
}

export function PortfolioCard({ p }: { p: PortfolioView }) {
  const pnl = p.value_cents - p.start_cents;
  const pct = (pnl / p.start_cents) * 100;
  return (
    <div className="card p-5" data-portfolio={p.id}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{p.name}</p>
          <p className="text-xs text-muted">Paper portfolio · {p.asset_class} · virtual money, real prices</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pnl >= 0 ? "bg-mint/15 text-mint" : "bg-danger/15 text-danger"}`}>{pnl >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums">{money(p.value_cents, p.asset_class)}</p>
      <p className="text-xs text-muted">Started at {money(p.start_cents, p.asset_class)}</p>
      <ul className="mt-4 space-y-1.5 text-sm">
        {p.trades.length ? p.trades.map((t, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <span><span className={`font-semibold ${t.side === "buy" ? "text-mint" : "text-danger"}`}>{t.side.toUpperCase()}</span> {Number(t.qty).toPrecision(4)} {t.symbol} @ {Number(t.price).toLocaleString("en", { maximumFractionDigits: 4 })}</span>
            <span className="shrink-0 text-xs text-muted"><TimeAgo date={t.created_at} /></span>
          </li>
        )) : <li className="text-muted">No trades yet — the rules wait for a clear signal.</li>}
      </ul>
    </div>
  );
}

