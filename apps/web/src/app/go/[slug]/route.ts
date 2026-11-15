import { NextResponse } from "next/server";
import { q } from "@/server/db";

/** Tracked affiliate redirect: counts the click, then sends the visitor on with a sponsored-link header. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{4,40}$/.test(slug)) return new NextResponse("Not found", { status: 404 });
  const [link] = await q<{ id: string; destination: string }>(`select id, destination from affiliate_links where slug = $1`, [slug]);
  if (!link || !link.destination.startsWith("https://")) return new NextResponse("Not found", { status: 404 });
  const referrer = (req.headers.get("referer") ?? "").slice(0, 300);
  await q(`insert into affiliate_clicks (link_id, referrer) values ($1, $2)`, [link.id, referrer]);
  const res = NextResponse.redirect(link.destination, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
