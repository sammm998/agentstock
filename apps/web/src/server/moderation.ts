import "server-only";
import { canOnPlatform, type PlatformRole } from "@hustera/domain";
import type { Queryable } from "./db";
import { q, one, tx } from "./db";
import { UserError, audit, rateLimit } from "./core";
import { reverseSparks } from "./sparks";
import { notify } from "./notifications";

export type ReportTarget = "post" | "comment" | "user" | "channel_message" | "space" | "rewards_entry";

const TARGET_OWNER: Record<ReportTarget, string> = {
  post: `select author_id as owner from posts where id = $1`,
  comment: `select author_id as owner from comments where id = $1`,
  user: `select id as owner from users where id = $1`,
  channel_message: `select author_id as owner from channel_messages where id = $1`,
  space: `select owner_id as owner from spaces where id = $1`,
  rewards_entry: `select user_id as owner from rewards_ledger where id = $1`,
};

async function targetOwner(db: Queryable, type: ReportTarget, id: string): Promise<string | null | undefined> {
  const [row] = await db.query<{ owner: string | null }>(TARGET_OWNER[type], [id]);
  return row ? row.owner : undefined;
}

export async function fileReport(reporterId: string, input: { targetType: ReportTarget; targetId: string; reason: string; details: string }) {
  await rateLimit("report", reporterId);
  const owner = await targetOwner({ query: q }, input.targetType, input.targetId);
  if (owner === undefined) throw new UserError("That content no longer exists");
  // Rewards entries can only be questioned by their owner.
  if (input.targetType === "rewards_entry" && owner !== reporterId) throw new UserError("Not found");
  const dup = await one(`select 1 from reports where reporter_id = $1 and target_type = $2 and target_id = $3 and status = 'open'`, [reporterId, input.targetType, input.targetId]);
  if (dup) return;
  await q(`insert into reports (reporter_id, target_type, target_id, reason, details) values ($1, $2, $3, $4, $5)`, [
    reporterId, input.targetType, input.targetId, input.reason, input.details,
  ]);
}

export interface ReportView {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: Date;
  reporter: string | null;
  preview: string | null;
  owner_handle: string | null;
}

export async function reportQueue(role: PlatformRole, status: "open" | "closed" = "open"): Promise<ReportView[]> {
  if (!canOnPlatform(role, "view_reports")) throw new UserError("Not allowed");
  return q<ReportView>(
    `select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, rp.handle as reporter,
            case r.target_type
              when 'post' then (select body from posts where id = r.target_id)
              when 'comment' then (select body from comments where id = r.target_id)
              when 'channel_message' then (select body from channel_messages where id = r.target_id)
              when 'space' then (select name || ' — ' || description from spaces where id = r.target_id)
              when 'user' then (select display_name || ' (@' || handle || ') ' || bio from profiles where user_id = r.target_id)
              when 'rewards_entry' then (select reason || ' (' || amount || ')' from rewards_ledger where id = r.target_id)
            end as preview,
            (select handle from profiles where user_id = case r.target_type
              when 'post' then (select author_id from posts where id = r.target_id)
              when 'comment' then (select author_id from comments where id = r.target_id)
              when 'channel_message' then (select author_id from channel_messages where id = r.target_id)
              when 'space' then (select owner_id from spaces where id = r.target_id)
              when 'user' then r.target_id
              when 'rewards_entry' then (select user_id from rewards_ledger where id = r.target_id)
            end) as owner_handle
       from reports r left join profiles rp on rp.user_id = r.reporter_id
      where ${status === "open" ? "r.status = 'open'" : "r.status <> 'open'"}
      order by r.created_at ${status === "open" ? "asc" : "desc"} limit 200`,
  );
}

async function recordAction(db: Queryable, a: { actorId: string; subjectUserId: string | null; action: string; targetType: string; targetId: string; note: string }) {
  const [row] = await db.query<{ id: string }>(
    `insert into moderation_actions (actor_id, subject_user_id, scope, action, target_type, target_id, note)
     values ($1, $2, 'platform', $3, $4, $5, $6) returning id`,
    [a.actorId, a.subjectUserId, a.action, a.targetType, a.targetId, a.note],
  );
  if (a.subjectUserId) {
    await notify(db, { userId: a.subjectUserId, kind: "moderation", body: `A moderator took action: ${a.action}. You can appeal from Settings → Moderation.` });
  }
  return row!.id;
}

/**
 * Resolves a report. "action" removes the reported content (or suspends a
 * reported user / reverses a questioned Sparks entry); "dismiss" closes it.
 */
export async function resolveReport(actor: { id: string; role: PlatformRole }, reportId: string, decision: "action" | "dismiss", note: string) {
  if (!canOnPlatform(actor.role, "resolve_reports")) throw new UserError("Not allowed");
  await tx(async (db) => {
    const [r] = await db.query<{ target_type: ReportTarget; target_id: string; status: string }>(`select target_type, target_id, status from reports where id = $1 for update`, [reportId]);
    if (!r || r.status !== "open") throw new UserError("Report is already resolved");
    if (decision === "action") {
      const owner = (await targetOwner(db, r.target_type, r.target_id)) ?? null;
      switch (r.target_type) {
        case "post":
          await db.query(`update posts set removed_at = now() where id = $1`, [r.target_id]);
          if (owner) await reverseSparks(db, owner, `post:${r.target_id}`, "Post removed by moderation");
          break;
        case "comment":
          await db.query(`update comments set removed_at = now() where id = $1`, [r.target_id]);
          break;
        case "channel_message":
          await db.query(`update channel_messages set removed_at = now(), removed_by = $2 where id = $1`, [r.target_id, actor.id]);
          break;
        case "user":
          if (!canOnPlatform(actor.role, "suspend_user")) throw new UserError("Only admins can suspend accounts");
          await db.query(`update users set suspended_at = now() where id = $1 and platform_role <> 'admin'`, [r.target_id]);
          await db.query(`delete from sessions where user_id = $1`, [r.target_id]);
          break;
        case "space":
          if (!canOnPlatform(actor.role, "suspend_user")) throw new UserError("Only admins can remove spaces");
          await db.query(`update spaces set visibility = 'private' where id = $1`, [r.target_id]);
          break;
        case "rewards_entry": {
          if (!canOnPlatform(actor.role, "adjust_sparks")) throw new UserError("Only admins can adjust Sparks");
          // A questioned negative entry (e.g. a reversal) is restored by reversing the reversal.
          const [entry] = await db.query<{ user_id: string; ref_key: string; amount: number; rule_id: string }>(
            `select user_id, ref_key, amount, rule_id from rewards_ledger where id = $1`, [r.target_id]);
          if (entry && entry.amount < 0) {
            await db.query(
              `insert into rewards_ledger (user_id, rule_id, amount, reason, ref_key, reverses_id) values ($1, $2, $3, 'Restored after review', $4, $5)
               on conflict (user_id, ref_key) do nothing`,
              [entry.user_id, entry.rule_id, -entry.amount, `restore:${r.target_id}`, r.target_id],
            );
          }
          break;
        }
      }
      // Rewards disputes are decided in the user's favour, so they aren't a sanction to appeal.
      if (r.target_type !== "rewards_entry") {
        await recordAction(db, { actorId: actor.id, subjectUserId: owner, action: `${r.target_type}.removed`, targetType: r.target_type, targetId: r.target_id, note });
      }
    }
    await db.query(`update reports set status = $2, resolved_by = $3, resolution_note = $4, resolved_at = now() where id = $1`, [
      reportId, decision === "action" ? "actioned" : "dismissed", actor.id, note,
    ]);
    // Close duplicate reports about the same target.
    await db.query(`update reports set status = $3, resolved_by = $4, resolution_note = 'Resolved with an earlier report', resolved_at = now()
                     where target_type = $1 and target_id = $2 and status = 'open'`, [r.target_type, r.target_id, decision === "action" ? "actioned" : "dismissed", actor.id]);
    await audit(db, actor.id, `report.${decision}`, reportId);
  });
}

export async function actionsAgainst(userId: string) {
  return q<{ id: string; action: string; note: string; scope: string; created_at: Date; appeal_status: string | null; space_name: string | null }>(
    `select a.id, a.action, a.note, a.scope, a.created_at, s.name as space_name,
            (select status from appeals ap where ap.moderation_action_id = a.id and ap.user_id = $1) as appeal_status
       from moderation_actions a left join spaces s on s.id = a.space_id
      where a.subject_user_id = $1 order by a.created_at desc limit 50`,
    [userId],
  );
}

export async function fileAppeal(userId: string, actionId: string, body: string) {
  const action = await one<{ scope: string }>(`select scope from moderation_actions where id = $1 and subject_user_id = $2`, [actionId, userId]);
  if (!action) throw new UserError("Not found");
  const rows = await q(`insert into appeals (moderation_action_id, user_id, body) values ($1, $2, $3) on conflict do nothing returning 1`, [actionId, userId, body]);
  if (!rows.length) throw new UserError("You've already appealed this decision");
}

export async function openAppeals(role: PlatformRole) {
  if (!canOnPlatform(role, "decide_appeals")) return [];
  return q<{ id: string; body: string; created_at: Date; action: string; target_type: string; note: string; handle: string }>(
    `select ap.id, ap.body, ap.created_at, a.action, a.target_type, a.note, p.handle
       from appeals ap join moderation_actions a on a.id = ap.moderation_action_id join profiles p on p.user_id = ap.user_id
      where ap.status = 'open' order by ap.created_at asc`,
  );
}

/** Overturning an appeal restores the removed content or lifts a suspension. */
export async function decideAppeal(actor: { id: string; role: PlatformRole }, appealId: string, overturn: boolean) {
  if (!canOnPlatform(actor.role, "decide_appeals")) throw new UserError("Not allowed");
  await tx(async (db) => {
    const [ap] = await db.query<{ user_id: string; target_type: string; target_id: string; status: string }>(
      `select ap.user_id, a.target_type, a.target_id, ap.status from appeals ap join moderation_actions a on a.id = ap.moderation_action_id where ap.id = $1 for update of ap`,
      [appealId],
    );
    if (!ap || ap.status !== "open") throw new UserError("Appeal already decided");
    if (overturn) {
      const table = { post: "posts", comment: "comments", channel_message: "channel_messages" }[ap.target_type];
      if (table) await db.query(`update ${table} set removed_at = null where id = $1`, [ap.target_id]);
      if (ap.target_type === "user") await db.query(`update users set suspended_at = null where id = $1`, [ap.target_id]);
    }
    await db.query(`update appeals set status = $2, decided_by = $3, decided_at = now() where id = $1`, [appealId, overturn ? "overturned" : "upheld", actor.id]);
    await notify(db, { userId: ap.user_id, kind: "moderation", body: overturn ? "Your appeal was successful and the decision was reversed." : "Your appeal was reviewed and the decision was upheld." });
    await audit(db, actor.id, `appeal.${overturn ? "overturned" : "upheld"}`, appealId);
  });
}
