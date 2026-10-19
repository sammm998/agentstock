import "server-only";
import { SPARK_RULES, sparksToAward, tierFor, nextTier, type SparkRuleId } from "@hustera/domain";
import type { Queryable } from "./db";
import { q } from "./db";

const START_OF_UTC_DAY = `(date_trunc('day', now() at time zone 'UTC') at time zone 'UTC')`;

/**
 * Awards Sparks for a rule, respecting published limits. `refKey` makes the
 * award idempotent: the same contribution can never be rewarded twice.
 */
export async function awardSparks(db: Queryable, userId: string, ruleId: SparkRuleId, refKey: string): Promise<number> {
  const [history] = await db.query<{ lifetime: number; today: number }>(
    `select count(*)::int as lifetime,
            count(*) filter (where created_at >= ${START_OF_UTC_DAY})::int as today
       from rewards_ledger where user_id = $1 and rule_id = $2 and amount > 0`,
    [userId, ruleId],
  );
  const amount = sparksToAward(ruleId, { lifetimeCount: history?.lifetime ?? 0, todayCount: history?.today ?? 0 });
  if (amount === 0) return 0;
  const rows = await db.query(
    `insert into rewards_ledger (user_id, rule_id, amount, reason, ref_key)
     values ($1, $2, $3, $4, $5) on conflict (user_id, ref_key) do nothing returning id`,
    [userId, ruleId, amount, SPARK_RULES[ruleId].label, refKey],
  );
  return rows.length ? amount : 0;
}

/** Reverses a previous award identified by its refKey, at most once. */
export async function reverseSparks(db: Queryable, userId: string, refKey: string, reason: string): Promise<void> {
  const [original] = await db.query<{ id: string; amount: number; rule_id: string }>(
    `select id, amount, rule_id from rewards_ledger where user_id = $1 and ref_key = $2 and amount > 0`,
    [userId, refKey],
  );
  if (!original) return;
  await db.query(
    `insert into rewards_ledger (user_id, rule_id, amount, reason, ref_key, reverses_id)
     values ($1, $2, $3, $4, $5, $6) on conflict (user_id, ref_key) do nothing`,
    [userId, original.rule_id, -original.amount, reason, `reversal:${refKey}`, original.id],
  );
}

export interface SparksSummary {
  balance: number;
  lifetimeEarned: number;
  tier: ReturnType<typeof tierFor>;
  next: ReturnType<typeof nextTier>;
}

export async function sparksSummary(userId: string): Promise<SparksSummary> {
  const [row] = await q<{ balance: number; earned: number }>(
    `select coalesce(sum(amount), 0)::int as balance,
            coalesce(sum(amount) filter (where amount > 0), 0)::int as earned
       from rewards_ledger where user_id = $1`,
    [userId],
  );
  // Recognition is based on net Sparks so reversed awards do not count.
  const net = Math.max(0, row?.balance ?? 0);
  return { balance: row?.balance ?? 0, lifetimeEarned: row?.earned ?? 0, tier: tierFor(net), next: nextTier(net) };
}

export interface LedgerEntry {
  id: string;
  rule_id: string;
  amount: number;
  reason: string;
  reverses_id: string | null;
  created_at: Date;
}

export async function sparksLedger(userId: string, limit = 100): Promise<LedgerEntry[]> {
  return q<LedgerEntry>(
    `select id, rule_id, amount, reason, reverses_id, created_at from rewards_ledger
      where user_id = $1 order by created_at desc limit $2`,
    [userId, limit],
  );
}
