import { runBackgroundWork } from "@/server/worker";

/**
 * Background worker entry point for external schedulers
 * (`Authorization: Bearer $CRON_SECRET`). The server also runs it in-process; see instrumentation.ts.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runBackgroundWork());
}
