import "server-only";
import { q } from "./db";

export async function myLiveMissions(ownerId: string) {
  return q<{ id: string; title: string; agent_id: string; status: string; repeat_hours: number | null; next_run_at: Date | null; done: number; total: number; current: string | null; current_status: string | null }>(
    `select m.id, m.title, m.agent_id, m.status, m.repeat_hours, m.next_run_at,
            (select count(*) from tasks t where t.mission_id = m.id and t.status = 'succeeded')::int as done,
            (select count(*) from tasks t where t.mission_id = m.id)::int as total,
            (select t.title from tasks t where t.mission_id = m.id and t.status <> 'succeeded' order by t.seq limit 1) as current,
            (select t.status from tasks t where t.mission_id = m.id and t.status <> 'succeeded' order by t.seq limit 1) as current_status
       from missions m where m.owner_id = $1 and (m.status in ('active','paused','blocked') or m.repeat_hours is not null)
      order by m.updated_at desc limit 24`,
    [ownerId],
  );
}

export async function myEventStream(ownerId: string, limit = 40) {
  return q<{ id: number; mission_id: string; title: string; from_agent: string | null; kind: string; message: string; created_at: Date }>(
    `select te.id, te.mission_id, m.title, te.from_agent, te.kind, te.message, te.created_at
       from task_events te join missions m on m.id = te.mission_id where m.owner_id = $1 order by te.id desc limit $2`,
    [ownerId, limit],
  );
}

export async function todayCounters(ownerId: string) {
  const [r] = await q<{ sales: number; revenue_cents: number; clicks: number; trades: number; posts: number }>(
    `select
       (select count(*) from orders o where o.seller_id = $1 and o.status = 'paid' and o.created_at > now() - interval '24 hours')::int as sales,
       (select coalesce(sum(o.amount_cents), 0) from orders o where o.seller_id = $1 and o.status = 'paid' and o.created_at > now() - interval '24 hours')::int as revenue_cents,
       (select count(*) from affiliate_clicks c join affiliate_links l on l.id = c.link_id where l.owner_id = $1 and c.created_at > now() - interval '24 hours')::int as clicks,
       (select count(*) from paper_trades t join paper_portfolios p on p.id = t.portfolio_id where p.owner_id = $1 and t.created_at > now() - interval '24 hours')::int as trades,
       (select count(*) from scheduled_posts where owner_id = $1 and status = 'published' and publish_at > now() - interval '24 hours')::int as posts`,
    [ownerId],
  );
  return r ?? { sales: 0, revenue_cents: 0, clicks: 0, trades: 0, posts: 0 };
}

export interface PortfolioView {
  id: string;
  name: string;
  asset_class: "crypto" | "stocks";
  start_cents: number;
  value_cents: number;
  is_public: boolean;
  mission_id: string | null;
  trades: { symbol: string; side: string; qty: number; price: number; reason: string; created_at: Date }[];
}

async function withTrades(rows: Omit<PortfolioView, "trades">[]): Promise<PortfolioView[]> {
  const out: PortfolioView[] = [];
  for (const p of rows) {
    const trades = await q<PortfolioView["trades"][number]>(`select symbol, side, qty, price, reason, created_at from paper_trades where portfolio_id = $1 order by id desc limit 8`, [p.id]);
    out.push({ ...p, start_cents: Number(p.start_cents), value_cents: Number(p.value_cents), trades });
  }
  return out;
}

export async function myPortfolios(ownerId: string) {
  return withTrades(await q(`select id, name, asset_class, start_cents, coalesce(last_value_cents, cash_cents) as value_cents, is_public, mission_id from paper_portfolios where owner_id = $1 order by created_at desc`, [ownerId]));
}

export async function publicFund() {
  return withTrades(await q(`select id, name, asset_class, start_cents, coalesce(last_value_cents, cash_cents) as value_cents, is_public, mission_id from paper_portfolios where is_public order by created_at limit 3`));
}
