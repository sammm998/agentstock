import { q } from "@/server/db";
import { runMission } from "@/server/agents";

/**
 * Background worker entry point. Advances active autonomous missions. Call it
 * from a scheduler (e.g. Vercel Cron or Trigger.dev) with
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const missions = await q<{ id: string; owner_id: string }>(
    `select id, owner_id from missions where status = 'active' and mode = 'autonomous' order by updated_at asc limit 25`,
  );
  const results: Record<string, string> = {};
  for (const m of missions) {
    try {
      results[m.id] = await runMission(m.owner_id, m.id, 10);
    } catch (e) {
      results[m.id] = e instanceof Error ? `error: ${e.message}` : "error";
    }
  }
  return Response.json({ processed: missions.length, results });
}
