import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { confirmConnection } from "@/server/composio";

/** Composio redirects here after the hosted connection flow. */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin?next=/settings/connections");
  const url = new URL(req.url);
  const externalId = url.searchParams.get("connected_account_id") ?? url.searchParams.get("connectedAccountId");
  let status = "failed";
  if (externalId) {
    try {
      status = await confirmConnection(viewer.id, externalId);
    } catch {
      status = "failed";
    }
  }
  redirect(`/settings/connections?status=${status}`);
}
