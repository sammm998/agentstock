import "server-only";
import { q } from "./db";
import { runMission, startDueRecurringMissions } from "./agents";
import { publishDuePosts } from "./tools/growth";

/** One pass of background work: recurring missions, autonomous steps and scheduled posts. */
export async function runBackgroundWork() {
  const restarted = await startDueRecurringMissions();
  const posts = await publishDuePosts({ query: (sql, params) => q(sql, params) as never });
  const missions = await q<{ id: string; owner_id: string }>(`select id, owner_id from missions where status = 'active' and mode = 'autonomous' order by updated_at asc limit 25`);
  const results: Record<string, string> = {};
  for (const m of missions) {
    try {
      results[m.id] = await runMission(m.owner_id, m.id, 10);
    } catch (e) {
      results[m.id] = e instanceof Error ? `error: ${e.message}` : "error";
    }
  }
  return { restarted: restarted.length, posts, processed: missions.length, results };
}
