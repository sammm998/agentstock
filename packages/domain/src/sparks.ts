/**
 * Sparks — Hustera's loyalty points.
 *
 * Sparks are non-transferable, non-purchasable, non-redeemable and have no cash
 * value. They are not money, e-money, a cryptocurrency or an investment token.
 * They unlock recognition (badges and profile styles) based on lifetime earned
 * Sparks; nothing is ever "spent" or exchanged.
 */

export type SparkRuleId = "complete_profile" | "first_post" | "post" | "peer_recognition" | "create_space";

export interface SparkRule {
  id: SparkRuleId;
  label: string;
  description: string;
  amount: number;
  /** Maximum number of awards for this rule per user, ever. */
  lifetimeLimit?: number;
  /** Maximum number of awards for this rule per user per UTC day. */
  dailyLimit?: number;
}

export const SPARK_RULES: Record<SparkRuleId, SparkRule> = {
  complete_profile: {
    id: "complete_profile",
    label: "Complete your profile",
    description: "Add a bio to your profile.",
    amount: 20,
    lifetimeLimit: 1,
  },
  first_post: {
    id: "first_post",
    label: "First post",
    description: "Share your first post with the community.",
    amount: 10,
    lifetimeLimit: 1,
  },
  post: {
    id: "post",
    label: "Share a post",
    description: "Each post you share. Removed posts are reversed.",
    amount: 2,
    dailyLimit: 5,
  },
  peer_recognition: {
    id: "peer_recognition",
    label: "Peer recognition",
    description: "Another member likes your post. Reversed if the like is removed.",
    amount: 1,
    dailyLimit: 10,
  },
  create_space: {
    id: "create_space",
    label: "Start a community",
    description: "Create a new Space for people to collaborate in.",
    amount: 5,
    dailyLimit: 1,
  },
};

export interface AwardHistory {
  /** Awards for this rule (not counting reversals) the user has ever received. */
  lifetimeCount: number;
  /** Awards for this rule the user has received in the current UTC day. */
  todayCount: number;
}

/**
 * Decides how many Sparks to award for a rule given the user's history.
 * Returns 0 when a limit has been reached.
 */
export function sparksToAward(ruleId: SparkRuleId, history: AwardHistory): number {
  const rule = SPARK_RULES[ruleId];
  if (rule.lifetimeLimit !== undefined && history.lifetimeCount >= rule.lifetimeLimit) return 0;
  if (rule.dailyLimit !== undefined && history.todayCount >= rule.dailyLimit) return 0;
  return rule.amount;
}

export interface SparkTier {
  id: string;
  name: string;
  threshold: number;
  perk: string;
}

/** Recognition tiers unlocked by lifetime earned Sparks. Nothing is spent. */
export const SPARK_TIERS: readonly SparkTier[] = [
  { id: "spark", name: "Spark", threshold: 0, perk: "Default profile ring" },
  { id: "ember", name: "Ember", threshold: 25, perk: "Indigo profile ring and Ember badge" },
  { id: "flare", name: "Flare", threshold: 100, perk: "Mint profile ring and Flare badge" },
  { id: "nova", name: "Nova", threshold: 250, perk: "Aurora profile ring and Nova badge" },
];

export function tierFor(lifetimeEarned: number): SparkTier {
  let current = SPARK_TIERS[0]!;
  for (const t of SPARK_TIERS) if (lifetimeEarned >= t.threshold) current = t;
  return current;
}

export function nextTier(lifetimeEarned: number): SparkTier | null {
  return SPARK_TIERS.find((t) => t.threshold > lifetimeEarned) ?? null;
}

export const SPARKS_TERMS = [
  "Sparks are loyalty points for genuine contributions to Hustera communities.",
  "Sparks have no cash value. They cannot be bought, sold, transferred, gifted, exchanged or redeemed for money, goods or services.",
  "Sparks are not money, electronic money, a cryptocurrency, a security or an investment, and they do not appreciate in value.",
  "Sparks unlock recognition such as badges and profile styles based on lifetime earned Sparks. Nothing is spent.",
  "Earning rules and daily limits are published on the Rewards page. Hustera may reverse Sparks earned through spam, manipulation or content that is later removed.",
  "Every award and reversal is recorded in your ledger. You can question any entry and a moderator will review it.",
  "Sparks do not currently expire. Any future change to these terms will be announced in advance.",
] as const;
