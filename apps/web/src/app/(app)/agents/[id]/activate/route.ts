import { NextResponse } from "next/server";
import { getAgent } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { q } from "@/server/db";

/**
 * Partner activation. The partner URL lives only in the SCOUTR_PARTNER_LINKS
 * env var (JSON: {"chattagent": "https://…"}) and is never rendered on a page.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = getAgent(id);
  const base = new URL(req.url);
  if (!agent?.partner) return NextResponse.redirect(new URL("/agents", base), 303);
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL(`/signin?next=/agents/${id}`, base), 303);
  let links: Record<string, string> = {};
  try {
    links = JSON.parse(process.env.SCOUTR_PARTNER_LINKS ?? "{}") as Record<string, string>;
  } catch {
    links = {};
  }
  const target = links[agent.partner.key];
  if (!target || !target.startsWith("https://")) return NextResponse.redirect(new URL(`/agents/${id}?activation=unavailable`, base), 303);
  await q(`insert into partner_activations (user_id, agent_id) values ($1, $2)`, [viewer.id, agent.id]);
  await q(`insert into notifications (user_id, kind, body) values ($1, 'agent', $2)`, [viewer.id, `${agent.name} activated — continue in the partner app.`]);
  return NextResponse.redirect(target, 303);
}
