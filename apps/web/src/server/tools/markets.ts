import "server-only";
import { PAPER_START_CENTS, planOrders, signalFor, type Risk, type Signal } from "@hustera/domain";
import { notify } from "../notifications";
import { aiText, embed, extract, ok, type ToolContext, type ToolOutcome } from "./shared";

export type AssetClass = "crypto" | "stocks";
export type PriceFetcher = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

let fetcher: PriceFetcher = (url) => fetch(url, { headers: { accept: "application/json, text/csv" }, signal: AbortSignal.timeout(10_000) });

/** Tests inject a fake price source; production uses public CoinGecko and Stooq endpoints. */
export function setPriceFetcher(f: PriceFetcher | null) {
  fetcher = f ?? ((url) => fetch(url, { signal: AbortSignal.timeout(10_000) }));
}

export const assetClassFor = (agentId: string): AssetClass => (agentId === "stocksense" ? "stocks" : "crypto");
export const currencyFor = (c: AssetClass) => (c === "stocks" ? "USD" : "EUR");

export function parseWatchlist(text: string, c: AssetClass): string[] {
  const items = text
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => (c === "stocks" ? x.toUpperCase().replace(/[^A-Z0-9.-]/g, "") : x.toLowerCase().replace(/[^a-z0-9-]/g, "")))
    .filter((x) => x.length >= 1 && x.length <= 40);
  return [...new Set(items)].slice(0, 10);
}

async function history(symbol: string, c: AssetClass): Promise<number[]> {
  if (c === "crypto") {
    const r = await fetcher(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(symbol)}/market_chart?vs_currency=eur&days=30&interval=daily`);
    if (!r.ok) throw new Error(`CoinGecko returned ${r.status} for ${symbol}`);
    const j = JSON.parse(await r.text()) as { prices?: [number, number][] };
    return (j.prices ?? []).map((p) => p[1]).filter((x) => Number.isFinite(x) && x > 0);
  }
  const ticker = symbol.includes(".") ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
  const r = await fetcher(`https://stooq.com/q/d/l/?s=${encodeURIComponent(ticker)}&i=d`);
  if (!r.ok) throw new Error(`Stooq returned ${r.status} for ${symbol}`);
  const rows = (await r.text()).trim().split("\n").slice(1);
  return rows.slice(-60).map((l) => Number(l.split(",")[4])).filter((x) => Number.isFinite(x) && x > 0);
}

const fmt = (n: number, cur: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency: cur, maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);

export async function marketPrices(ctx: ToolContext): Promise<ToolOutcome> {
  const c = assetClassFor(ctx.kind);
  const symbols = parseWatchlist(ctx.params.watchlist ?? "", c);
  if (!symbols.length) return { ok: false, blocked: false, error: "Watchlist is empty" };
  const series: Record<string, number[]> = {};
  const failed: string[] = [];
  for (const s of symbols) {
    try {
      const closes = await history(s, c);
      if (closes.length >= 2) series[s] = closes;
      else failed.push(s);
    } catch {
      failed.push(s);
    }
  }
  if (!Object.keys(series).length) return { ok: false, blocked: false, error: `No price data for ${symbols.join(", ")} — the market data source may be unreachable` };
  const cur = currencyFor(c);
  const rows = Object.entries(series).map(([s, v]) => {
    const last = v[v.length - 1]!;
    const first = v[0]!;
    return `| ${s} | ${fmt(last, cur)} | ${(((last - first) / first) * 100).toFixed(1)}% | ${v.length} |`;
  });
  return ok(
    "prices",
    "Live prices",
    `# Live prices\n\n| Asset | Last | Period change | Data points |\n| --- | --- | --- | --- |\n${rows.join("\n")}${failed.length ? `\n\n_No data for: ${failed.join(", ")}_` : ""}\n\nSource: ${c === "crypto" ? "CoinGecko" : "Stooq"} public market data.\n\n${embed(series)}`,
    `Fetched prices for ${Object.keys(series).length} ${c === "crypto" ? "coins" : "tickers"}`,
    1,
  );
}

export async function marketAnalyze(ctx: ToolContext): Promise<ToolOutcome> {
  const series = extract<Record<string, number[]>>(ctx.inputs.prices);
  if (!series) return { ok: false, blocked: false, error: "No prices to analyse" };
  const c = assetClassFor(ctx.kind);
  const signals = Object.entries(series).map(([s, v]) => signalFor(s, v));
  const table = signals.map((s) => `| ${s.symbol} | ${fmt(s.price, currencyFor(c))} | ${s.rsi?.toFixed(0) ?? "–"} | ${s.volatility?.toFixed(1) ?? "–"}% | **${s.action.toUpperCase()}** | ${s.reason} |`);
  const ai = await aiText(
    ctx,
    "You are a cautious market analyst. Write a short market note (max 120 words) explaining the signals. No predictions of guaranteed returns, no financial advice.",
    signals.map((s) => `${s.symbol}: price ${s.price}, SMA7 ${s.smaFast}, SMA21 ${s.smaSlow}, RSI ${s.rsi}, volatility ${s.volatility}%, signal ${s.action}`).join("\n"),
    300,
  );
  const note = ai?.text ?? `Rules engine: ${signals.filter((s) => s.action === "buy").length} buy, ${signals.filter((s) => s.action === "sell").length} sell and ${signals.filter((s) => s.action === "hold").length} hold signals.`;
  return ok(
    "analysis",
    "Market analysis",
    `# Market analysis\n\n| Asset | Price | RSI 14 | Volatility | Signal | Why |\n| --- | --- | --- | --- | --- | --- |\n${table.join("\n")}\n\n## Note\n${note}\n\n_Not financial advice. Signals come from fixed rules (SMA 7/21 and RSI 14); the AI only writes the note._\n\n${embed({ signals, note: note.slice(0, 600) })}`,
    `${signals.filter((s) => s.action !== "hold").length} actionable signals`,
    ai?.costCents ?? 0,
  );
}

/** Where orders go. Only paper execution exists; live venues refuse until the platform is licensed. */
export interface ExecutionAdapter {
  name: string;
  live: boolean;
}

export function executionAdapter(): ExecutionAdapter {
  if (process.env.HUSTERA_LIVE_TRADING === "true") {
    // Deliberately not implemented: real-money execution and profit sharing require authorisation
    // (investment firm / AIF manager). The flag alone never enables it.
    throw new Error("Live trading is disabled until Hustera holds the required licences");
  }
  return { name: "paper", live: false };
}

export async function marketTrade(ctx: ToolContext): Promise<ToolOutcome> {
  const data = extract<{ signals: Signal[]; note: string }>(ctx.inputs.analyze);
  if (!data) return { ok: false, blocked: false, error: "No analysis to trade on" };
  let adapter: ExecutionAdapter;
  try {
    adapter = executionAdapter();
  } catch (e) {
    return { ok: false, blocked: true, reason: e instanceof Error ? e.message : "Live trading disabled" };
  }
  const c = assetClassFor(ctx.kind);
  const cur = currencyFor(c);
  const risk: Risk = (["low", "medium", "high"] as const).includes(ctx.params.risk as Risk) ? (ctx.params.risk as Risk) : "medium";
  const name = ctx.kind === "hustera-fund" ? "Hustera Fund" : ctx.title;
  await ctx.db.query(
    `insert into paper_portfolios (owner_id, mission_id, name, asset_class, cash_cents, start_cents, is_public) values ($1, $2, $3, $4, $5, $5, $6) on conflict (mission_id) do nothing`,
    [ctx.ownerId, ctx.missionId, name, c, PAPER_START_CENTS, ctx.kind === "hustera-fund"],
  );
  const [pf] = await ctx.db.query<{ id: string; cash_cents: string | number; start_cents: string | number }>(`select id, cash_cents, start_cents from paper_portfolios where mission_id = $1`, [ctx.missionId]);
  const positions = (await ctx.db.query<{ symbol: string; qty: number; avg_price: number }>(`select symbol, qty, avg_price from paper_positions where portfolio_id = $1 and qty > 0`, [pf!.id])).map((p) => ({ symbol: p.symbol, qty: Number(p.qty), avgPrice: Number(p.avg_price) }));
  const cash = Number(pf!.cash_cents) / 100;
  const start = Number(pf!.start_cents) / 100;
  const orders = planOrders({ cash, positions, signals: data.signals, risk, startValue: start });
  let newCash = cash;
  for (const o of orders) {
    const pos = positions.find((p) => p.symbol === o.symbol);
    if (o.side === "buy") {
      newCash -= o.qty * o.price;
      const qty = (pos?.qty ?? 0) + o.qty;
      const avg = pos ? (pos.qty * pos.avgPrice + o.qty * o.price) / qty : o.price;
      await ctx.db.query(
        `insert into paper_positions (portfolio_id, symbol, qty, avg_price, last_price) values ($1, $2, $3, $4, $5)
           on conflict (portfolio_id, symbol) do update set qty = excluded.qty, avg_price = excluded.avg_price, last_price = excluded.last_price`,
        [pf!.id, o.symbol, qty, avg, o.price],
      );
      if (pos) {
        pos.qty = qty;
        pos.avgPrice = avg;
      } else positions.push({ symbol: o.symbol, qty, avgPrice: avg });
    } else {
      newCash += o.qty * o.price;
      await ctx.db.query(`update paper_positions set qty = 0, last_price = $3 where portfolio_id = $1 and symbol = $2`, [pf!.id, o.symbol, o.price]);
      if (pos) pos.qty = 0;
    }
    await ctx.db.query(`insert into paper_trades (portfolio_id, symbol, side, qty, price, reason, ai_note) values ($1, $2, $3, $4, $5, $6, $7)`, [pf!.id, o.symbol, o.side, o.qty, o.price, o.reason, data.note.slice(0, 600)]);
  }
  for (const s of data.signals) await ctx.db.query(`update paper_positions set last_price = $3 where portfolio_id = $1 and symbol = $2`, [pf!.id, s.symbol, s.price]);
  const priceOf = new Map(data.signals.map((s) => [s.symbol, s.price]));
  const held = positions.filter((p) => p.qty > 0);
  const value = newCash + held.reduce((a, p) => a + p.qty * (priceOf.get(p.symbol) ?? p.avgPrice), 0);
  await ctx.db.query(`update paper_portfolios set cash_cents = $2, last_value_cents = $3 where id = $1`, [pf!.id, Math.round(newCash * 100), Math.round(value * 100)]);
  const pnl = value - start;
  const pnlPct = (pnl / start) * 100;
  if (orders.length) {
    await notify(ctx.db, { userId: ctx.ownerId, kind: "trade", body: `${name}: ${orders.map((o) => `${o.side} ${o.symbol}`).join(", ")} · portfolio ${fmt(value, cur)} (${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%)` });
  }
  return ok(
    "trades",
    `${name} — ${orders.length ? `${orders.length} trades` : "no trades"}`,
    `# Paper portfolio (${adapter.name})\n\n**Value:** ${fmt(value, cur)} · **Cash:** ${fmt(newCash, cur)} · **P&L:** ${pnl >= 0 ? "+" : ""}${fmt(pnl, cur)} (${pnlPct.toFixed(2)}%) · **Risk:** ${risk}\n\n## Trades this run\n${orders.length ? orders.map((o) => `- **${o.side.toUpperCase()}** ${o.qty} ${o.symbol} @ ${fmt(o.price, cur)} — ${o.reason}`).join("\n") : "- No trades: the rules found no edge or limits were reached."}\n\n## Positions\n${held.length ? held.map((p) => `- ${p.symbol}: ${p.qty} @ avg ${fmt(p.avgPrice, cur)}`).join("\n") : "- All cash"}\n\n_Simulated with virtual money and real prices. Real-money trading and profit sharing are disabled until Hustera is licensed._`,
    `${orders.length} paper trades · P&L ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`,
  );
}
