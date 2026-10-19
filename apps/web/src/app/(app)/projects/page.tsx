import type { Metadata } from "next";
import Link from "next/link";
import { RoadmapNotice } from "@/components/roadmap";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Missions, tasks and results for the businesses you build — alone, with a team, or with agents." />
      <RoadmapNotice milestone="B–C">
        Projects and agent missions are not built yet. For now, coordinate projects in a <Link href="/communities/new" className="underline">private Space</Link> with channels for each workstream.
      </RoadmapNotice>
    </>
  );
}
