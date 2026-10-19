import "server-only";
import { extractMentions, extractTags } from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, rateLimit } from "./core";
import { awardSparks, reverseSparks } from "./sparks";
import { notify } from "./notifications";

/** Either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string, db: Queryable = { query: q }): Promise<boolean> {
  const rows = await db.query(
    `select 1 from blocks where (blocker_id = $1 and blocked_id = $2) or (blocker_id = $2 and blocked_id = $1)`,
    [a, b],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------- follows

export type FollowState = "none" | "pending" | "active";

export async function followState(viewerId: string, targetId: string): Promise<FollowState> {
  const row = await one<{ status: FollowState }>(`select status from follows where follower_id = $1 and followee_id = $2`, [viewerId, targetId]);
  return row?.status ?? "none";
}

export async function follow(viewerId: string, targetId: string): Promise<FollowState> {
  if (viewerId === targetId) throw new UserError("You can't follow yourself");
  return tx(async (db) => {
    if (await isBlockedBetween(viewerId, targetId, db)) throw new UserError("You can't follow this account");
    const [target] = await db.query<{ is_private: boolean }>(`select is_private from profiles where user_id = $1`, [targetId]);
    if (!target) throw new UserError("Account not found");
    const status: FollowState = target.is_private ? "pending" : "active";
    const inserted = await db.query(
      `insert into follows (follower_id, followee_id, status) values ($1, $2, $3) on conflict do nothing returning 1`,
      [viewerId, targetId, status],
    );
    if (inserted.length) await notify(db, { userId: targetId, actorId: viewerId, kind: status === "pending" ? "follow_request" : "follow" });
    const [row] = await db.query<{ status: FollowState }>(`select status from follows where follower_id = $1 and followee_id = $2`, [viewerId, targetId]);
    return row?.status ?? "none";
  });
}

export async function unfollow(viewerId: string, targetId: string) {
  await q(`delete from follows where follower_id = $1 and followee_id = $2`, [viewerId, targetId]);
}

export async function respondToFollowRequest(viewerId: string, followerId: string, approve: boolean) {
  if (approve) {
    const rows = await q(`update follows set status = 'active' where follower_id = $1 and followee_id = $2 and status = 'pending' returning 1`, [followerId, viewerId]);
    if (rows.length) await notify({ query: q }, { userId: followerId, actorId: viewerId, kind: "follow", body: "accepted your follow request" });
  } else {
    await q(`delete from follows where follower_id = $1 and followee_id = $2 and status = 'pending'`, [followerId, viewerId]);
  }
}

export async function removeFollower(viewerId: string, followerId: string) {
  await q(`delete from follows where follower_id = $1 and followee_id = $2`, [followerId, viewerId]);
}

export async function followCounts(userId: string) {
  const [row] = await q<{ followers: number; following: number; posts: number }>(
    `select (select count(*) from follows where followee_id = $1 and status = 'active')::int as followers,
            (select count(*) from follows where follower_id = $1 and status = 'active')::int as following,
            (select count(*) from posts where author_id = $1 and removed_at is null)::int as posts`,
    [userId],
  );
  return row!;
}

export async function pendingFollowRequests(userId: string) {
  return q<{ user_id: string; handle: string; display_name: string; created_at: Date }>(
    `select p.user_id, p.handle, p.display_name, f.created_at from follows f join profiles p on p.user_id = f.follower_id
      where f.followee_id = $1 and f.status = 'pending' order by f.created_at desc`,
    [userId],
  );
}

// ---------------------------------------------------------------- blocks

export async function block(viewerId: string, targetId: string) {
  if (viewerId === targetId) throw new UserError("You can't block yourself");
  await tx(async (db) => {
    await db.query(`insert into blocks (blocker_id, blocked_id) values ($1, $2) on conflict do nothing`, [viewerId, targetId]);
    await db.query(
      `delete from follows where (follower_id = $1 and followee_id = $2) or (follower_id = $2 and followee_id = $1)`,
      [viewerId, targetId],
    );
  });
}

export async function unblock(viewerId: string, targetId: string) {
  await q(`delete from blocks where blocker_id = $1 and blocked_id = $2`, [viewerId, targetId]);
}

export async function hasBlocked(viewerId: string, targetId: string) {
  return (await q(`select 1 from blocks where blocker_id = $1 and blocked_id = $2`, [viewerId, targetId])).length > 0;
}

export async function blockedAccounts(viewerId: string) {
  return q<{ user_id: string; handle: string; display_name: string }>(
    `select p.user_id, p.handle, p.display_name from blocks b join profiles p on p.user_id = b.blocked_id
      where b.blocker_id = $1 order by b.created_at desc`,
    [viewerId],
  );
}

// ---------------------------------------------------------------- posts

export interface PostView {
  id: string;
  body: string;
  visibility: "public" | "followers";
  created_at: Date;
  author_id: string;
  handle: string;
  display_name: string;
  kind: string;
  repost_of: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  original?: PostView | null;
}

/**
 * Visibility of post `p` (author profile `pr`) for viewer `$1` (may be null).
 * Hidden: removed posts, suspended authors, blocked relationships, private
 * accounts and followers-only posts the viewer doesn't follow.
 */
const VISIBLE = `
  p.removed_at is null and au.suspended_at is null
  and not exists (select 1 from blocks b where (b.blocker_id = $1 and b.blocked_id = p.author_id) or (b.blocker_id = p.author_id and b.blocked_id = $1))
  and (p.author_id = $1
       or (not pr.is_private and p.visibility = 'public')
       or exists (select 1 from follows f where f.follower_id = $1 and f.followee_id = p.author_id and f.status = 'active'))`;

const POST_SELECT = `
  select p.id, p.body, p.visibility, p.created_at, p.author_id, p.repost_of, pr.handle, pr.display_name, pr.kind,
    (select count(*) from likes l where l.post_id = p.id)::int as like_count,
    (select count(*) from comments c where c.post_id = p.id and c.removed_at is null)::int as comment_count,
    (select count(*) from posts r where r.repost_of = p.id and r.removed_at is null)::int as repost_count,
    coalesce((select true from likes l where l.post_id = p.id and l.user_id = $1), false) as liked,
    coalesce((select true from saves s where s.post_id = p.id and s.user_id = $1), false) as saved,
    coalesce((select true from posts r where r.repost_of = p.id and r.author_id = $1 and r.removed_at is null), false) as reposted
  from posts p join profiles pr on pr.user_id = p.author_id join users au on au.id = p.author_id`;

async function withOriginals(viewerId: string | null, posts: PostView[]): Promise<PostView[]> {
  const ids = [...new Set(posts.map((p) => p.repost_of).filter((x): x is string => !!x))];
  if (!ids.length) return posts;
  const originals = await q<PostView>(`${POST_SELECT} where p.id = any($2::uuid[]) and ${VISIBLE}`, [viewerId, ids]);
  const byId = new Map(originals.map((o) => [o.id, o]));
  return posts.map((p) => (p.repost_of ? { ...p, original: byId.get(p.repost_of) ?? null } : p));
}

export async function homeFeed(viewerId: string, limit = 50): Promise<PostView[]> {
  const rows = await q<PostView>(
    `${POST_SELECT}
      where ${VISIBLE}
        and (p.author_id = $1 or exists (select 1 from follows f where f.follower_id = $1 and f.followee_id = p.author_id and f.status = 'active'))
      order by p.created_at desc limit $2`,
    [viewerId, limit],
  );
  return withOriginals(viewerId, rows);
}

export async function discoverFeed(viewerId: string | null, opts: { tag?: string; query?: string; limit?: number } = {}): Promise<PostView[]> {
  const params: unknown[] = [viewerId, opts.limit ?? 50];
  let where = VISIBLE + ` and p.visibility = 'public' and not pr.is_private and p.repost_of is null`;
  if (opts.tag) {
    params.push(opts.tag.toLowerCase());
    where += ` and exists (select 1 from post_tags t where t.post_id = p.id and t.tag = $${params.length})`;
  }
  if (opts.query) {
    params.push(`%${opts.query.replace(/[%_\\]/g, (c) => "\\" + c)}%`);
    where += ` and p.body ilike $${params.length}`;
  }
  const rows = await q<PostView>(`${POST_SELECT} where ${where} order by p.created_at desc limit $2`, params);
  return rows;
}

export async function profilePosts(viewerId: string | null, authorId: string, limit = 50): Promise<PostView[]> {
  const rows = await q<PostView>(`${POST_SELECT} where ${VISIBLE} and p.author_id = $2 order by p.created_at desc limit $3`, [viewerId, authorId, limit]);
  return withOriginals(viewerId, rows);
}

export async function savedPosts(viewerId: string): Promise<PostView[]> {
  const rows = await q<PostView>(
    `${POST_SELECT} join saves sv on sv.post_id = p.id and sv.user_id = $1 where ${VISIBLE} order by sv.created_at desc limit 100`,
    [viewerId],
  );
  return withOriginals(viewerId, rows);
}

export async function getPost(viewerId: string | null, postId: string): Promise<PostView | null> {
  const rows = await q<PostView>(`${POST_SELECT} where p.id = $2 and ${VISIBLE}`, [viewerId, postId]);
  if (!rows.length) return null;
  return (await withOriginals(viewerId, rows))[0]!;
}

export async function trendingTags(limit = 8) {
  return q<{ tag: string; uses: number }>(
    `select t.tag, count(*)::int as uses from post_tags t join posts p on p.id = t.post_id
       join profiles pr on pr.user_id = p.author_id
      where p.removed_at is null and p.visibility = 'public' and not pr.is_private and p.created_at > now() - interval '30 days'
      group by t.tag order by uses desc, t.tag limit $1`,
    [limit],
  );
}

async function notifyMentions(db: Queryable, authorId: string, body: string, postId: string) {
  const handles = extractMentions(body);
  if (!handles.length) return;
  const users = await db.query<{ user_id: string }>(`select user_id from profiles where handle = any($1::text[]) and user_id <> $2`, [handles, authorId]);
  for (const u of users) {
    if (await isBlockedBetween(authorId, u.user_id, db)) continue;
    await notify(db, { userId: u.user_id, actorId: authorId, kind: "mention", postId });
  }
}

export async function createPost(authorId: string, body: string, visibility: "public" | "followers"): Promise<string> {
  await rateLimit("post", authorId);
  return tx(async (db) => {
    const [post] = await db.query<{ id: string }>(`insert into posts (author_id, body, visibility) values ($1, $2, $3) returning id`, [authorId, body, visibility]);
    const id = post!.id;
    for (const tag of extractTags(body)) await db.query(`insert into post_tags (post_id, tag) values ($1, $2) on conflict do nothing`, [id, tag]);
    await notifyMentions(db, authorId, body, id);
    await awardSparks(db, authorId, "first_post", "first_post");
    await awardSparks(db, authorId, "post", `post:${id}`);
    return id;
  });
}

export async function repost(viewerId: string, postId: string): Promise<void> {
  const original = await getPost(viewerId, postId);
  if (!original) throw new UserError("Post not found");
  if (original.repost_of) throw new UserError("Repost the original post instead");
  if (original.visibility !== "public") throw new UserError("Followers-only posts can't be reposted");
  await tx(async (db) => {
    const [existing] = await db.query<{ id: string }>(`select id from posts where author_id = $1 and repost_of = $2 and removed_at is null`, [viewerId, postId]);
    if (existing) {
      await db.query(`delete from posts where id = $1`, [existing.id]);
      return;
    }
    await db.query(`insert into posts (author_id, body, visibility, repost_of) values ($1, '', 'public', $2)`, [viewerId, postId]);
    if (original.author_id !== viewerId) await notify(db, { userId: original.author_id, actorId: viewerId, kind: "repost", postId });
  });
}

export async function deleteOwnPost(viewerId: string, postId: string) {
  await tx(async (db) => {
    const rows = await db.query(`delete from posts where id = $1 and author_id = $2 returning 1`, [postId, viewerId]);
    if (!rows.length) throw new UserError("Post not found");
    await reverseSparks(db, viewerId, `post:${postId}`, "Post deleted");
  });
}

export async function toggleLike(viewerId: string, postId: string): Promise<boolean> {
  const post = await getPost(viewerId, postId);
  if (!post) throw new UserError("Post not found");
  return tx(async (db) => {
    const removed = await db.query(`delete from likes where post_id = $1 and user_id = $2 returning 1`, [postId, viewerId]);
    const recognitionKey = `like:${postId}:${viewerId}`;
    if (removed.length) {
      if (post.author_id !== viewerId) await reverseSparks(db, post.author_id, recognitionKey, "Like removed");
      return false;
    }
    await db.query(`insert into likes (post_id, user_id) values ($1, $2)`, [postId, viewerId]);
    if (post.author_id !== viewerId) {
      await awardSparks(db, post.author_id, "peer_recognition", recognitionKey);
      await notify(db, { userId: post.author_id, actorId: viewerId, kind: "like", postId });
    }
    return true;
  });
}

export async function toggleSave(viewerId: string, postId: string): Promise<boolean> {
  const removed = await q(`delete from saves where post_id = $1 and user_id = $2 returning 1`, [postId, viewerId]);
  if (removed.length) return false;
  if (!(await getPost(viewerId, postId))) throw new UserError("Post not found");
  await q(`insert into saves (post_id, user_id) values ($1, $2)`, [postId, viewerId]);
  return true;
}

export interface CommentView {
  id: string;
  body: string;
  created_at: Date;
  author_id: string;
  handle: string;
  display_name: string;
}

export async function postComments(viewerId: string | null, postId: string): Promise<CommentView[]> {
  return q<CommentView>(
    `select c.id, c.body, c.created_at, c.author_id, pr.handle, pr.display_name
       from comments c join profiles pr on pr.user_id = c.author_id join users u on u.id = c.author_id
      where c.post_id = $2 and c.removed_at is null and u.suspended_at is null
        and not exists (select 1 from blocks b where (b.blocker_id = $1 and b.blocked_id = c.author_id) or (b.blocker_id = c.author_id and b.blocked_id = $1))
      order by c.created_at asc`,
    [viewerId, postId],
  );
}

export async function addComment(viewerId: string, postId: string, body: string): Promise<string> {
  const post = await getPost(viewerId, postId);
  if (!post) throw new UserError("Post not found");
  await rateLimit("comment", viewerId);
  return tx(async (db) => {
    const [c] = await db.query<{ id: string }>(`insert into comments (post_id, author_id, body) values ($1, $2, $3) returning id`, [postId, viewerId, body]);
    if (post.author_id !== viewerId) await notify(db, { userId: post.author_id, actorId: viewerId, kind: "comment", postId });
    await notifyMentions(db, viewerId, body, postId);
    return c!.id;
  });
}

export async function deleteOwnComment(viewerId: string, commentId: string) {
  // Authors of a comment, and authors of the post it's on, may delete it.
  const rows = await q(
    `delete from comments c using posts p where c.id = $1 and p.id = c.post_id and (c.author_id = $2 or p.author_id = $2) returning 1`,
    [commentId, viewerId],
  );
  if (!rows.length) throw new UserError("Comment not found");
}

// ---------------------------------------------------------------- people

export interface PersonView {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  kind: string;
  followers: number;
  follow_state: FollowState | null;
}

export async function searchPeople(viewerId: string | null, query: string, limit = 30): Promise<PersonView[]> {
  const like = `%${query.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
  return q<PersonView>(
    `select p.user_id, p.handle, p.display_name, p.bio, p.kind,
            (select count(*) from follows f where f.followee_id = p.user_id and f.status = 'active')::int as followers,
            (select f.status from follows f where f.follower_id = $1 and f.followee_id = p.user_id) as follow_state
       from profiles p join users u on u.id = p.user_id
      where u.suspended_at is null and ($2 = '%%' or p.handle ilike $2 or p.display_name ilike $2)
        and p.user_id is distinct from $1
        and not exists (select 1 from blocks b where (b.blocker_id = $1 and b.blocked_id = p.user_id) or (b.blocker_id = p.user_id and b.blocked_id = $1))
      order by p.created_at desc limit $3`,
    [viewerId, like, limit],
  );
}
