import "server-only";
import { q, one, tx } from "./db";
import { UserError, rateLimit } from "./core";
import { isBlockedBetween } from "./social";

export interface ConversationView {
  id: string;
  last_message_at: Date;
  other_id: string;
  other_handle: string;
  other_name: string;
  last_body: string | null;
  unread: number;
}

export async function listConversations(viewerId: string): Promise<ConversationView[]> {
  return q<ConversationView>(
    `select c.id, c.last_message_at, o.user_id as other_id, p.handle as other_handle, p.display_name as other_name,
            (select body from direct_messages d where d.conversation_id = c.id order by d.created_at desc limit 1) as last_body,
            (select count(*) from direct_messages d where d.conversation_id = c.id and d.sender_id <> $1 and d.created_at > me.last_read_at)::int as unread
       from conversations c
       join conversation_members me on me.conversation_id = c.id and me.user_id = $1
       join conversation_members o on o.conversation_id = c.id and o.user_id <> $1
       join profiles p on p.user_id = o.user_id
      order by c.last_message_at desc`,
    [viewerId],
  );
}

/** Finds or creates the 1:1 conversation between two users. */
export async function openConversation(viewerId: string, otherId: string): Promise<string> {
  if (viewerId === otherId) throw new UserError("You can't message yourself");
  if (await isBlockedBetween(viewerId, otherId)) throw new UserError("You can't message this account");
  return tx(async (db) => {
    const [existing] = await db.query<{ id: string }>(
      `select a.conversation_id as id from conversation_members a join conversation_members b on b.conversation_id = a.conversation_id
        where a.user_id = $1 and b.user_id = $2 limit 1`,
      [viewerId, otherId],
    );
    if (existing) return existing.id;
    const [other] = await db.query(`select 1 from users where id = $1 and suspended_at is null`, [otherId]);
    if (!other) throw new UserError("Account not found");
    const [c] = await db.query<{ id: string }>(`insert into conversations default values returning id`);
    await db.query(`insert into conversation_members (conversation_id, user_id) values ($1, $2), ($1, $3)`, [c!.id, viewerId, otherId]);
    return c!.id;
  });
}

export async function getConversation(viewerId: string, conversationId: string) {
  return one<{ id: string; other_id: string; other_handle: string; other_name: string }>(
    `select c.id, o.user_id as other_id, p.handle as other_handle, p.display_name as other_name
       from conversations c
       join conversation_members me on me.conversation_id = c.id and me.user_id = $1
       join conversation_members o on o.conversation_id = c.id and o.user_id <> $1
       join profiles p on p.user_id = o.user_id
      where c.id = $2`,
    [viewerId, conversationId],
  );
}

export async function conversationMessages(viewerId: string, conversationId: string) {
  const convo = await getConversation(viewerId, conversationId);
  if (!convo) return null;
  await q(`update conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [conversationId, viewerId]);
  const messages = await q<{ id: string; body: string; created_at: Date; sender_id: string }>(
    `select * from (select id, body, created_at, sender_id from direct_messages where conversation_id = $1 order by created_at desc limit 200) t order by created_at asc`,
    [conversationId],
  );
  return { convo, messages };
}

export async function sendDirectMessage(viewerId: string, conversationId: string, body: string) {
  const convo = await getConversation(viewerId, conversationId);
  if (!convo) throw new UserError("Conversation not found");
  if (await isBlockedBetween(viewerId, convo.other_id)) throw new UserError("You can't message this account");
  await rateLimit("direct_message", viewerId);
  await tx(async (db) => {
    await db.query(`insert into direct_messages (conversation_id, sender_id, body) values ($1, $2, $3)`, [conversationId, viewerId, body]);
    await db.query(`update conversations set last_message_at = now() where id = $1`, [conversationId]);
    await db.query(`update conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [conversationId, viewerId]);
  });
}
