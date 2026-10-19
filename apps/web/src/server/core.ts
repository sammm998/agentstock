import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Queryable } from "./db";
import { q } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** An error whose message is safe to show to the user. */
export class UserError extends Error {}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !n || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { ...SCRYPT, N: Number(n) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const LIMITS = {
  post: { table: "posts", column: "author_id", windowSec: 60, max: 5 },
  comment: { table: "comments", column: "author_id", windowSec: 60, max: 10 },
  channel_message: { table: "channel_messages", column: "author_id", windowSec: 60, max: 20 },
  direct_message: { table: "direct_messages", column: "sender_id", windowSec: 60, max: 20 },
  report: { table: "reports", column: "reporter_id", windowSec: 3600, max: 20 },
  space: { table: "spaces", column: "owner_id", windowSec: 86400, max: 5 },
} as const;

/** Simple per-user write limits that slow down spam and runaway scripts. */
export async function rateLimit(kind: keyof typeof LIMITS, userId: string, db: Queryable = { query: q }) {
  const l = LIMITS[kind];
  const [row] = await db.query<{ n: number }>(
    `select count(*)::int as n from ${l.table} where ${l.column} = $1 and created_at > now() - make_interval(secs => $2)`,
    [userId, l.windowSec],
  );
  if ((row?.n ?? 0) >= l.max) throw new UserError("You're doing that a lot. Please wait a moment and try again.");
}

export async function audit(db: Queryable, actorId: string | null, action: string, target = "", meta: object = {}) {
  await db.query(`insert into audit_events (actor_id, action, target, meta) values ($1, $2, $3, $4)`, [actorId, action, target, JSON.stringify(meta)]);
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
