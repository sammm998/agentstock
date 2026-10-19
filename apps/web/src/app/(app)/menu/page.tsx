import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { canOnPlatform } from "@hustera/domain";
import { signOutAction } from "@/app/actions";
import { SideNav } from "@/components/nav";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const viewer = await requireViewer();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <nav aria-label="All sections" className="card p-3">
        <SideNav moderator={canOnPlatform(viewer.role, "view_reports")} />
      </nav>
      <form action={signOutAction}>
        <button className="btn-secondary w-full">Sign out</button>
      </form>
    </div>
  );
}
