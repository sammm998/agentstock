import "server-only";
import type { Queryable } from "./db";
import { q } from "./db";

export type NotificationKind = "follow" | "follow_request" | "like" | "comment" | "mention" | "repost" | "space_invite" | "dm" | "moderation" | "sparks";

export async function notify(
  db: Queryable,
  n: { userId: string; actorId?: string | null; kind: NotificationKind; postId?: string | null; spaceId?: string | null; body?: string },
) {
  await db.query(
    `insert into notifications (user_id, actor_id, kind, post_id, space_id, body) values ($1, $2, $3, $4, $5, $6)`,
    [n.userId, n.actorId ?? null, n.kind, n.postId ?? null, n.spaceId ?? null, n.body ?? ""],
  );
}

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  post_id: string | null;
  space_id: string | null;
  body: string;
  read_at: Date | null;
  created_at: Date;
  actor_handle: string | null;
  actor_name: string | null;
}

export async function listNotifications(userId: string, limit = 100): Promise<NotificationView[]> {
  return q<NotificationView>(
    `select n.id, n.kind, n.post_id, n.space_id, n.body, n.read_at, n.created_at, p.handle as actor_handle, p.display_name as actor_name
       from notifications n left join profiles p on p.user_id = n.actor_id
      where n.user_id = $1
        and not exists (select 1 from blocks b where b.blocker_id = $1 and b.blocked_id = n.actor_id)
      order by n.created_at desc limit $2`,
    [userId, limit],
  );
}

export async function unreadCounts(userId: string) {
  const [row] = await q<{ notifications: number; messages: number }>(
    `select (select count(*) from notifications where user_id = $1 and read_at is null)::int as notifications,
            (select count(*) from conversation_members cm join direct_messages dm on dm.conversation_id = cm.conversation_id
              where cm.user_id = $1 and dm.sender_id <> $1 and dm.created_at > cm.last_read_at)::int as messages`,
    [userId],
  );
  return row ?? { notifications: 0, messages: 0 };
}

export async function markAllRead(userId: string) {
  await q(`update notifications set read_at = now() where user_id = $1 and read_at is null`, [userId]);
}
