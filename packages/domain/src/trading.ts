/**
 * Trading strategy for the paper portfolios. Pure functions, so every decision
 * is deterministic, explainable and testable. AI only writes commentary.
 */

export type Risk = "low" | "medium" | "high";

export const RISK_LIMITS: Record<Risk, { maxPositionPct: number; stopLossPct: number; maxDrawdownPct: number }> = {
  low: { maxPositionPct: 10, stopLossPct: 6, maxDrawdownPct: 10 },
  medium: { maxPositionPct: 20, stopLossPct: 10, maxDrawdownPct: 18 },
  high: { maxPositionPct: 35, stopLossPct: 15, maxDrawdownPct: 25 },
};

export const PAPER_START_CENTS = 1_000_000;

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  const rs = gains / period / (losses / period);
  return 100 - 100 / (1 + rs);
}

/** Standard deviation of daily returns, in percent. */
export function volatility(values: number[], period = 14): number | null {
  if (values.length <= period) return null;
  const rets: number[] = [];
  for (let i = values.length - period; i < values.length; i++) rets.push((values[i]! - values[i - 1]!) / values[i - 1]!);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length) * 100;
}

export interface Signal {
  symbol: string;
  price: number;
  smaFast: number | null;
  smaSlow: number | null;
  rsi: number | null;
  volatility: number | null;
  action: "buy" | "sell" | "hold";
  reason: string;
}

/** SMA 7/21 trend with RSI 14 filter: buy uptrends that aren't overbought, sell downtrends or overbought. */
export function signalFor(symbol: string, closes: number[]): Signal {
  const price = closes[closes.length - 1] ?? 0;
  const f = sma(closes, 7);
  const sl = sma(closes, 21);
  const r = rsi(closes, 14);
  const v = volatility(closes, 14);
  let action: Signal["action"] = "hold";
  let reason = "Not enough history yet";
  if (f !== null && sl !== null && r !== null) {
    if (f > sl && r < 70) {
      action = "buy";
      reason = `Uptrend: SMA7 ${f.toFixed(2)} above SMA21 ${sl.toFixed(2)}, RSI ${r.toFixed(0)} not overbought`;
    } else if (f < sl) {
      action = "sell";
      reason = `Downtrend: SMA7 ${f.toFixed(2)} below SMA21 ${sl.toFixed(2)}`;
    } else if (r >= 75) {
      action = "sell";
      reason = `Overbought: RSI ${r.toFixed(0)}`;
    } else {
      reason = `No clear edge: RSI ${r.toFixed(0)}`;
    }
  }
  return { symbol, price, smaFast: f, smaSlow: sl, rsi: r, volatility: v, action, reason };
}

export interface Position {
  symbol: string;
  qty: number;
  avgPrice: number;
}

export interface Order {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
  reason: string;
}

/**
 * Turns signals into orders for a portfolio, respecting position size limits,
 * stop losses and a portfolio drawdown stop (which only allows selling).
 */
export function planOrders(input: { cash: number; positions: Position[]; signals: Signal[]; risk: Risk; startValue: number }): Order[] {
  const limits = RISK_LIMITS[input.risk];
  const priceOf = new Map(input.signals.map((s) => [s.symbol, s.price]));
  const equity = input.cash + input.positions.reduce((a, p) => a + p.qty * (priceOf.get(p.symbol) ?? p.avgPrice), 0);
  const drawdown = ((input.startValue - equity) / input.startValue) * 100;
  const halted = drawdown >= limits.maxDrawdownPct;
  const orders: Order[] = [];
  let cash = input.cash;
  for (const s of input.signals) {
    const pos = input.positions.find((p) => p.symbol === s.symbol);
    if (pos && pos.qty > 0) {
      const loss = ((pos.avgPrice - s.price) / pos.avgPrice) * 100;
      if (loss >= limits.stopLossPct) {
        orders.push({ symbol: s.symbol, side: "sell", qty: pos.qty, price: s.price, reason: `Stop loss: down ${loss.toFixed(1)}% from entry` });
        continue;
      }
      if (s.action === "sell") {
        orders.push({ symbol: s.symbol, side: "sell", qty: pos.qty, price: s.price, reason: s.reason });
        continue;
      }
    }
    if (halted || s.action !== "buy" || s.price <= 0) continue;
    const target = (equity * limits.maxPositionPct) / 100;
    const held = (pos?.qty ?? 0) * s.price;
    const budget = Math.min(target - held, cash);
    if (budget < equity * 0.01) continue;
    const qty = Math.floor((budget / s.price) * 1e6) / 1e6;
    if (qty <= 0) continue;
    cash -= qty * s.price;
    orders.push({ symbol: s.symbol, side: "buy", qty, price: s.price, reason: s.reason });
  }
  return orders;
}
