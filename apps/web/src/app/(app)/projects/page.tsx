import Link from "next/link";
import type { Metadata } from "next";
import { FolderKanban, Plus } from "lucide-react";
import { MISSION_KIND_LABEL } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { listMissions } from "@/server/agents";
import { MissionStatusBadge } from "@/components/missions";
import { EmptyState, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const missions = await listMissions(viewer.id);
  return (
    <>
      <PageHeader
        title="Projects"
        description="Missions run by Hustera Core and its agents — within your budget, your approvals and your stop button."
        actions={<Link href="/projects/new" className="btn-primary"><Plus size={16} aria-hidden="true" /> New mission</Link>}
      />
      {missions.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {missions.map((m) => (
            <li key={m.id}>
              <Link href={`/projects/${m.id}`} className="card block p-5 hover:border-indigo/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{m.title}</h2>
                    <p className="text-xs text-muted">{MISSION_KIND_LABEL[m.kind]} · {m.region}</p>
                  </div>
                  <MissionStatusBadge status={m.status} />
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-midnight" aria-hidden="true">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo to-mint" style={{ width: `${m.total ? (m.done / m.total) * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">{m.done} of {m.total} tasks done · updated <TimeAgo date={m.updated_at} /></p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FolderKanban size={26} />} title="No missions yet" action={<Link href="/projects/new" className="btn-primary">Start a mission</Link>}>
          Tell Hustera Core about an idea or a product you already sell. Agents will draft a research plan, an offer, a launch checklist and a listing for your review.
        </EmptyState>
      )}
    </>
  );
}
