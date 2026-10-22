import "server-only";
import type { PlatformRole, ProfileKind } from "@hustera/domain";
import { q, one, tx } from "./db";
import { UserError, audit, hashPassword, newToken, sha256, verifyPassword } from "./core";
import { awardSparks } from "./sparks";

export const SESSION_TTL_DAYS = 30;

export interface Viewer {
  id: string;
  email: string;
  role: PlatformRole;
  handle: string;
  displayName: string;
  kind: ProfileKind;
}

export interface Profile {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  location: string;
  website: string | null;
  kind: ProfileKind;
  is_private: boolean;
  created_at: Date;
}

function adminEmails(): Set<string> {
  return new Set((process.env.HUSTERA_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export async function registerUser(input: { email: string; password: string; handle: string; displayName: string }): Promise<string> {
  const passwordHash = await hashPassword(input.password);
  const role: PlatformRole = adminEmails().has(input.email) ? "admin" : "user";
  return tx(async (db) => {
    const [emailTaken] = await db.query(`select 1 from users where lower(email) = $1`, [input.email]);
    if (emailTaken) throw new UserError("An account with that email already exists");
    const [handleTaken] = await db.query(`select 1 from profiles where handle = $1`, [input.handle]);
    if (handleTaken) throw new UserError("That handle is already taken");
    const [user] = await db.query<{ id: string }>(
      `insert into users (email, password_hash, platform_role) values ($1, $2, $3) returning id`,
      [input.email, passwordHash, role],
    );
    await db.query(`insert into profiles (user_id, handle, display_name) values ($1, $2, $3)`, [user!.id, input.handle, input.displayName]);
    await audit(db, user!.id, "account.created");
    return user!.id;
  });
}

/** Returns the user id for valid credentials, or null. Always spends hashing time. */
export async function authenticate(email: string, password: string): Promise<string | null> {
  const user = await one<{ id: string; password_hash: string; suspended_at: Date | null }>(
    `select id, password_hash, suspended_at from users where lower(email) = $1`,
    [email],
  );
  const ok = await verifyPassword(password, user?.password_hash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!user || !ok) return null;
  if (user.suspended_at) throw new UserError("This account is suspended. Contact support to appeal the decision.");
  return user.id;
}

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86400_000);
  await q(`insert into sessions (user_id, token_hash, expires_at) values ($1, $2, $3)`, [userId, sha256(token), expires]);
  return { token, expires };
}

export async function deleteSession(token: string) {
  await q(`delete from sessions where token_hash = $1`, [sha256(token)]);
}

export async function viewerForToken(token: string): Promise<Viewer | null> {
  const row = await one<{ id: string; email: string; platform_role: PlatformRole; handle: string; display_name: string; kind: ProfileKind }>(
    `select u.id, u.email, u.platform_role, p.handle, p.display_name, p.kind
       from sessions s join users u on u.id = s.user_id join profiles p on p.user_id = u.id
      where s.token_hash = $1 and s.expires_at > now() and u.suspended_at is null`,
    [sha256(token)],
  );
  if (!row) return null;
  return { id: row.id, email: row.email, role: row.platform_role, handle: row.handle, displayName: row.display_name, kind: row.kind };
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  return one<Profile>(
    `select p.* from profiles p join users u on u.id = p.user_id where p.handle = $1 and u.suspended_at is null`,
    [handle.toLowerCase()],
  );
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return one<Profile>(`select * from profiles where user_id = $1`, [userId]);
}

export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string; location: string; website: string | null; kind: ProfileKind; isPrivate: boolean },
) {
  await tx(async (db) => {
    const [before] = await db.query<{ is_private: boolean }>(`select is_private from profiles where user_id = $1`, [userId]);
    await db.query(
      `update profiles set display_name = $2, bio = $3, location = $4, website = $5, kind = $6, is_private = $7, updated_at = now()
        where user_id = $1`,
      [userId, input.displayName, input.bio, input.location, input.website, input.kind, input.isPrivate],
    );
    // Going public approves anyone who was waiting.
    if (before?.is_private && !input.isPrivate) {
      await db.query(`update follows set status = 'active' where followee_id = $1 and status = 'pending'`, [userId]);
    }
    if (input.bio.length > 0) await awardSparks(db, userId, "complete_profile", "complete_profile");
  });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await one<{ password_hash: string }>(`select password_hash from users where id = $1`, [userId]);
  if (!user || !(await verifyPassword(current, user.password_hash))) throw new UserError("Current password is incorrect");
  await q(`update users set password_hash = $2 where id = $1`, [userId, await hashPassword(next)]);
  await q(`delete from sessions where user_id = $1`, [userId]);
}

/** Everything Hustera stores about a user, for GDPR data portability. */
export async function exportAccount(userId: string) {
  const [user] = await q(`select id, email, platform_role, created_at from users where id = $1`, [userId]);
  return {
    exported_at: new Date().toISOString(),
    user,
    profile: await getProfile(userId),
    posts: await q(`select id, body, visibility, repost_of, removed_at, created_at from posts where author_id = $1 order by created_at`, [userId]),
    comments: await q(`select id, post_id, body, created_at from comments where author_id = $1 order by created_at`, [userId]),
    likes: await q(`select post_id, created_at from likes where user_id = $1`, [userId]),
    saves: await q(`select post_id, created_at from saves where user_id = $1`, [userId]),
    following: await q(`select p.handle, f.status, f.created_at from follows f join profiles p on p.user_id = f.followee_id where f.follower_id = $1`, [userId]),
    followers: await q(`select p.handle, f.status, f.created_at from follows f join profiles p on p.user_id = f.follower_id where f.followee_id = $1`, [userId]),
    blocked: await q(`select p.handle, b.created_at from blocks b join profiles p on p.user_id = b.blocked_id where b.blocker_id = $1`, [userId]),
    spaces: await q(`select s.slug, m.role, m.joined_at from space_members m join spaces s on s.id = m.space_id where m.user_id = $1`, [userId]),
    channel_messages: await q(`select channel_id, body, created_at from channel_messages where author_id = $1`, [userId]),
    direct_messages_sent: await q(`select conversation_id, body, created_at from direct_messages where sender_id = $1`, [userId]),
    reports_filed: await q(`select target_type, target_id, reason, details, status, created_at from reports where reporter_id = $1`, [userId]),
    sparks_ledger: await q(`select rule_id, amount, reason, created_at from rewards_ledger where user_id = $1 order by created_at`, [userId]),
    store: await q(`select slug, name, seller_legal_name, seller_country, support_email, created_at from stores where owner_id = $1`, [userId]),
    products: await q(`select p.id, p.title, p.kind, p.price_cents, p.status, p.created_at from products p join stores s on s.id = p.store_id where s.owner_id = $1`, [userId]),
    orders_sold: await q(`select id, title, amount_cents, status, simulated, created_at from orders where seller_id = $1`, [userId]),
    orders_bought: await q(`select id, title, amount_cents, status, simulated, created_at from orders where buyer_id = $1`, [userId]),
    ledger: await q(`select account, amount_cents, memo, simulated, created_at from ledger_entries where owner_id = $1 order by id`, [userId]),
    services: await q(`select id, title, category, price_cents, status, created_at from services where seller_id = $1`, [userId]),
    contracts: await q(`select id, title, price_cents, status, created_at from contracts where buyer_id = $1 or seller_id = $1`, [userId]),
    reviews_written: await q(`select contract_id, rating, body, created_at from reviews where author_id = $1`, [userId]),
    missions: await q(`select id, kind, title, brief, region, mode, status, created_at from missions where owner_id = $1 order by created_at`, [userId]),
    mission_artifacts: await q(`select a.mission_id, a.title, a.content, a.simulated, a.created_at from artifacts a join missions m on m.id = a.mission_id where m.owner_id = $1 order by a.created_at`, [userId]),
  };
}

/**
 * Permanently deletes the account and personal content. Spaces the user owned
 * are handed to the longest-serving moderator, or the earliest member.
 */
export async function deleteAccount(userId: string, password: string) {
  const user = await one<{ password_hash: string }>(`select password_hash from users where id = $1`, [userId]);
  if (!user || !(await verifyPassword(password, user.password_hash))) throw new UserError("Password is incorrect");
  await tx(async (db) => {
    const owned = await db.query<{ id: string }>(`select id from spaces where owner_id = $1`, [userId]);
    for (const s of owned) {
      const [heir] = await db.query<{ user_id: string }>(
        `select user_id from space_members where space_id = $1 and user_id <> $2
          order by (role = 'moderator') desc, joined_at asc limit 1`,
        [s.id, userId],
      );
      if (heir) {
        await db.query(`update spaces set owner_id = $2 where id = $1`, [s.id, heir.user_id]);
        await db.query(`update space_members set role = 'owner' where space_id = $1 and user_id = $2`, [s.id, heir.user_id]);
      } else {
        await db.query(`delete from spaces where id = $1`, [s.id]);
      }
    }
    // Channel messages are kept for conversation context but anonymised.
    await db.query(`update channel_messages set body = '[deleted]', removed_at = now() where author_id = $1`, [userId]);
    await db.query(`delete from users where id = $1`, [userId]);
    await audit(db, null, "account.deleted");
  });
}
