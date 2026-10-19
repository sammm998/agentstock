import "server-only";
import { canInSpace, canRemoveMember, type SpaceAction, type SpaceRole } from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, audit, newToken, rateLimit } from "./core";
import { awardSparks } from "./sparks";
import { notify } from "./notifications";

export interface SpaceView {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  owner_id: string | null;
  created_at: Date;
  member_count: number;
  role: SpaceRole | null;
}

export interface ChannelView {
  id: string;
  space_id: string;
  name: string;
  topic: string;
  kind: "text" | "announcements";
  position: number;
}

const SPACE_SELECT = `
  select s.*, (select count(*) from space_members m where m.space_id = s.id)::int as member_count,
         (select m.role from space_members m where m.space_id = s.id and m.user_id = $1) as role
    from spaces s`;

export async function getSpace(viewerId: string | null, slug: string): Promise<SpaceView | null> {
  const space = await one<SpaceView>(`${SPACE_SELECT} where s.slug = $2`, [viewerId, slug]);
  // Private spaces are invisible to non-members.
  if (!space || (space.visibility === "private" && !space.role)) return null;
  return space;
}

export async function mySpaces(viewerId: string): Promise<SpaceView[]> {
  return q<SpaceView>(`${SPACE_SELECT} where exists (select 1 from space_members m where m.space_id = s.id and m.user_id = $1) order by s.name`, [viewerId]);
}

export async function publicSpaces(viewerId: string | null, query = ""): Promise<SpaceView[]> {
  const like = `%${query.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
  return q<SpaceView>(
    `${SPACE_SELECT} where s.visibility = 'public' and (s.name ilike $2 or s.description ilike $2)
      order by (select count(*) from space_members m where m.space_id = s.id) desc, s.created_at desc limit 50`,
    [viewerId, like],
  );
}

async function roleIn(db: Queryable, spaceId: string, userId: string): Promise<SpaceRole | null> {
  const [row] = await db.query<{ role: SpaceRole }>(`select role from space_members where space_id = $1 and user_id = $2`, [spaceId, userId]);
  return row?.role ?? null;
}

async function requireRole(db: Queryable, spaceId: string, userId: string, action: SpaceAction): Promise<SpaceRole> {
  const role = await roleIn(db, spaceId, userId);
  if (!canInSpace(role, action)) throw new UserError("You don't have permission to do that in this space");
  return role!;
}

async function logSpaceAction(db: Queryable, a: { actorId: string; spaceId: string; action: string; targetType: string; targetId: string; subjectUserId?: string | null; note?: string }) {
  await db.query(
    `insert into moderation_actions (actor_id, subject_user_id, scope, space_id, action, target_type, target_id, note)
     values ($1, $2, 'space', $3, $4, $5, $6, $7)`,
    [a.actorId, a.subjectUserId ?? null, a.spaceId, a.action, a.targetType, a.targetId, a.note ?? ""],
  );
}

export async function createSpace(ownerId: string, input: { name: string; slug: string; description: string; visibility: "public" | "private" }): Promise<string> {
  await rateLimit("space", ownerId);
  return tx(async (db) => {
    const [taken] = await db.query(`select 1 from spaces where slug = $1`, [input.slug]);
    if (taken) throw new UserError("That address is already taken");
    const [space] = await db.query<{ id: string }>(
      `insert into spaces (slug, name, description, visibility, owner_id) values ($1, $2, $3, $4, $5) returning id`,
      [input.slug, input.name, input.description, input.visibility, ownerId],
    );
    const id = space!.id;
    await db.query(`insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')`, [id, ownerId]);
    await db.query(
      `insert into channels (space_id, name, topic, kind, position) values
        ($1, 'announcements', 'Updates from the space team', 'announcements', 0),
        ($1, 'general', 'Say hello and share what you are building', 'text', 1)`,
      [id],
    );
    await awardSparks(db, ownerId, "create_space", `space:${id}`);
    await audit(db, ownerId, "space.created", id);
    return id;
  });
}

export async function updateSpace(viewerId: string, spaceId: string, input: { name: string; description: string; visibility: "public" | "private" }) {
  await tx(async (db) => {
    await requireRole(db, spaceId, viewerId, "edit_space");
    await db.query(`update spaces set name = $2, description = $3, visibility = $4 where id = $1`, [spaceId, input.name, input.description, input.visibility]);
  });
}

export async function deleteSpace(viewerId: string, spaceId: string) {
  await tx(async (db) => {
    await requireRole(db, spaceId, viewerId, "delete_space");
    await db.query(`delete from spaces where id = $1`, [spaceId]);
    await audit(db, viewerId, "space.deleted", spaceId);
  });
}

export async function joinPublicSpace(viewerId: string, spaceId: string) {
  const space = await one<{ visibility: string }>(`select visibility from spaces where id = $1`, [spaceId]);
  if (!space) throw new UserError("Space not found");
  if (space.visibility !== "public") throw new UserError("This space is invite-only");
  await q(`insert into space_members (space_id, user_id) values ($1, $2) on conflict do nothing`, [spaceId, viewerId]);
}

export async function leaveSpace(viewerId: string, spaceId: string) {
  const role = await roleIn({ query: q }, spaceId, viewerId);
  if (role === "owner") throw new UserError("Owners can't leave their space. Delete it or transfer ownership first.");
  await q(`delete from space_members where space_id = $1 and user_id = $2`, [spaceId, viewerId]);
}

export async function listChannels(spaceId: string): Promise<ChannelView[]> {
  return q<ChannelView>(`select id, space_id, name, topic, kind, position from channels where space_id = $1 order by position, name`, [spaceId]);
}

export async function createChannel(viewerId: string, spaceId: string, input: { name: string; topic: string; kind: "text" | "announcements" }) {
  await tx(async (db) => {
    await requireRole(db, spaceId, viewerId, "manage_channels");
    const [exists] = await db.query(`select 1 from channels where space_id = $1 and name = $2`, [spaceId, input.name]);
    if (exists) throw new UserError("A channel with that name already exists");
    const [count] = await db.query<{ n: number }>(`select count(*)::int as n from channels where space_id = $1`, [spaceId]);
    if ((count?.n ?? 0) >= 50) throw new UserError("Spaces can have at most 50 channels");
    await db.query(
      `insert into channels (space_id, name, topic, kind, position) values ($1, $2, $3, $4, (select coalesce(max(position), 0) + 1 from channels where space_id = $1))`,
      [spaceId, input.name, input.topic, input.kind],
    );
  });
}

export async function deleteChannel(viewerId: string, channelId: string) {
  await tx(async (db) => {
    const [ch] = await db.query<{ space_id: string; name: string }>(`select space_id, name from channels where id = $1`, [channelId]);
    if (!ch) throw new UserError("Channel not found");
    await requireRole(db, ch.space_id, viewerId, "manage_channels");
    const [count] = await db.query<{ n: number }>(`select count(*)::int as n from channels where space_id = $1`, [ch.space_id]);
    if ((count?.n ?? 0) <= 1) throw new UserError("A space needs at least one channel");
    await db.query(`delete from channels where id = $1`, [channelId]);
    await logSpaceAction(db, { actorId: viewerId, spaceId: ch.space_id, action: "channel.deleted", targetType: "channel", targetId: channelId, note: `#${ch.name}` });
  });
}

export interface ChannelMessageView {
  id: string;
  body: string;
  pinned: boolean;
  created_at: Date;
  author_id: string | null;
  handle: string | null;
  display_name: string | null;
  role: SpaceRole | null;
}

export async function channelMessages(viewerId: string, channelId: string, limit = 100): Promise<ChannelMessageView[]> {
  const rows = await q<ChannelMessageView>(
    `select * from (
       select m.id, m.body, m.pinned, m.created_at, m.author_id, p.handle, p.display_name, sm.role
         from channel_messages m join channels c on c.id = m.channel_id
         left join profiles p on p.user_id = m.author_id
         left join space_members sm on sm.space_id = c.space_id and sm.user_id = m.author_id
        where m.channel_id = $2 and m.removed_at is null
          and not exists (select 1 from blocks b where b.blocker_id = $1 and b.blocked_id = m.author_id)
        order by m.created_at desc limit $3) t
     order by created_at asc`,
    [viewerId, channelId, limit],
  );
  return rows;
}

export async function pinnedMessages(channelId: string) {
  return q<{ id: string; body: string; handle: string | null }>(
    `select m.id, m.body, p.handle from channel_messages m left join profiles p on p.user_id = m.author_id
      where m.channel_id = $1 and m.pinned and m.removed_at is null order by m.created_at desc limit 10`,
    [channelId],
  );
}

export async function postChannelMessage(viewerId: string, channelId: string, body: string) {
  await rateLimit("channel_message", viewerId);
  await tx(async (db) => {
    const [ch] = await db.query<{ space_id: string; kind: string }>(`select space_id, kind from channels where id = $1`, [channelId]);
    if (!ch) throw new UserError("Channel not found");
    await requireRole(db, ch.space_id, viewerId, ch.kind === "announcements" ? "post_announcement" : "post_message");
    await db.query(`insert into channel_messages (channel_id, author_id, body) values ($1, $2, $3)`, [channelId, viewerId, body]);
  });
}

async function messageContext(db: Queryable, messageId: string) {
  const [m] = await db.query<{ id: string; author_id: string | null; space_id: string; pinned: boolean }>(
    `select m.id, m.author_id, c.space_id, m.pinned from channel_messages m join channels c on c.id = m.channel_id where m.id = $1 and m.removed_at is null`,
    [messageId],
  );
  if (!m) throw new UserError("Message not found");
  return m;
}

export async function deleteChannelMessage(viewerId: string, messageId: string) {
  await tx(async (db) => {
    const m = await messageContext(db, messageId);
    if (m.author_id !== viewerId) {
      await requireRole(db, m.space_id, viewerId, "delete_any_message");
      await logSpaceAction(db, { actorId: viewerId, spaceId: m.space_id, action: "message.removed", targetType: "channel_message", targetId: messageId, subjectUserId: m.author_id });
    }
    await db.query(`update channel_messages set removed_at = now(), removed_by = $2 where id = $1`, [messageId, viewerId]);
  });
}

export async function togglePin(viewerId: string, messageId: string) {
  await tx(async (db) => {
    const m = await messageContext(db, messageId);
    await requireRole(db, m.space_id, viewerId, "pin_message");
    await db.query(`update channel_messages set pinned = not pinned where id = $1`, [messageId]);
    await logSpaceAction(db, { actorId: viewerId, spaceId: m.space_id, action: m.pinned ? "message.unpinned" : "message.pinned", targetType: "channel_message", targetId: messageId, subjectUserId: m.author_id });
  });
}

export interface MemberView {
  user_id: string;
  handle: string;
  display_name: string;
  role: SpaceRole;
  joined_at: Date;
}

export async function spaceMembers(spaceId: string): Promise<MemberView[]> {
  return q<MemberView>(
    `select m.user_id, p.handle, p.display_name, m.role, m.joined_at from space_members m join profiles p on p.user_id = m.user_id
      where m.space_id = $1 order by case m.role when 'owner' then 0 when 'moderator' then 1 else 2 end, m.joined_at`,
    [spaceId],
  );
}

export async function setMemberRole(viewerId: string, spaceId: string, userId: string, role: "moderator" | "member") {
  await tx(async (db) => {
    await requireRole(db, spaceId, viewerId, "assign_moderator");
    const target = await roleIn(db, spaceId, userId);
    if (!target) throw new UserError("Not a member");
    if (target === "owner") throw new UserError("The owner's role can't be changed");
    await db.query(`update space_members set role = $3 where space_id = $1 and user_id = $2`, [spaceId, userId, role]);
    await logSpaceAction(db, { actorId: viewerId, spaceId, action: `role.${role}`, targetType: "user", targetId: userId, subjectUserId: userId });
  });
}

export async function removeMember(viewerId: string, spaceId: string, userId: string, note: string) {
  await tx(async (db) => {
    const actor = await roleIn(db, spaceId, viewerId);
    const target = await roleIn(db, spaceId, userId);
    if (!target) throw new UserError("Not a member");
    if (!canRemoveMember(actor, target)) throw new UserError("You don't have permission to remove this member");
    await db.query(`delete from space_members where space_id = $1 and user_id = $2`, [spaceId, userId]);
    await logSpaceAction(db, { actorId: viewerId, spaceId, action: "member.removed", targetType: "user", targetId: userId, subjectUserId: userId, note });
  });
}

export async function createInvite(viewerId: string, spaceId: string): Promise<string> {
  return tx(async (db) => {
    await requireRole(db, spaceId, viewerId, "create_invite");
    const code = newToken(9);
    await db.query(`insert into space_invites (code, space_id, created_by, expires_at) values ($1, $2, $3, now() + interval '7 days')`, [code, spaceId, viewerId]);
    return code;
  });
}

export async function activeInvites(spaceId: string) {
  return q<{ code: string; uses: number; max_uses: number; expires_at: Date; handle: string | null }>(
    `select i.code, i.uses, i.max_uses, i.expires_at, p.handle from space_invites i left join profiles p on p.user_id = i.created_by
      where i.space_id = $1 and i.expires_at > now() and i.uses < i.max_uses order by i.created_at desc`,
    [spaceId],
  );
}

export async function inviteDetails(code: string) {
  return one<{ space_id: string; slug: string; name: string; description: string }>(
    `select s.id as space_id, s.slug, s.name, s.description from space_invites i join spaces s on s.id = i.space_id
      where i.code = $1 and i.expires_at > now() and i.uses < i.max_uses`,
    [code],
  );
}

export async function acceptInvite(viewerId: string, code: string): Promise<string> {
  return tx(async (db) => {
    const [inv] = await db.query<{ space_id: string; slug: string; created_by: string | null }>(
      `select i.space_id, s.slug, i.created_by from space_invites i join spaces s on s.id = i.space_id
        where i.code = $1 and i.expires_at > now() and i.uses < i.max_uses for update of i`,
      [code],
    );
    if (!inv) throw new UserError("This invite is invalid or has expired");
    const joined = await db.query(`insert into space_members (space_id, user_id) values ($1, $2) on conflict do nothing returning 1`, [inv.space_id, viewerId]);
    if (joined.length) {
      await db.query(`update space_invites set uses = uses + 1 where code = $1`, [code]);
      if (inv.created_by) await notify(db, { userId: inv.created_by, actorId: viewerId, kind: "space_invite", spaceId: inv.space_id, body: "joined using your invite" });
    }
    return inv.slug;
  });
}

export async function spaceModLog(viewerId: string, spaceId: string) {
  await requireRole({ query: q }, spaceId, viewerId, "view_mod_log");
  return q<{ id: string; action: string; target_type: string; note: string; created_at: Date; actor: string | null; subject: string | null }>(
    `select a.id, a.action, a.target_type, a.note, a.created_at, ap.handle as actor, sp.handle as subject
       from moderation_actions a left join profiles ap on ap.user_id = a.actor_id left join profiles sp on sp.user_id = a.subject_user_id
      where a.space_id = $1 order by a.created_at desc limit 100`,
    [spaceId],
  );
}
