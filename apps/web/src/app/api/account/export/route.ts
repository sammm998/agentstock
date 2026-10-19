import { getViewer } from "@/server/session";
import { exportAccount } from "@/server/accounts";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });
  const data = await exportAccount(viewer.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hustera-${viewer.handle}-export.json"`,
      "Cache-Control": "no-store",
    },
  });
}
