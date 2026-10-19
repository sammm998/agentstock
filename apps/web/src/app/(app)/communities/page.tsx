import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import { requireViewer } from "@/server/session";
import { mySpaces, publicSpaces } from "@/server/spaces";
import { SpaceCard } from "@/components/spaces";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Communities" };

export default async function CommunitiesPage() {
  const viewer = await requireViewer();
  const [mine, discover] = await Promise.all([mySpaces(viewer.id), publicSpaces(viewer.id)]);
  const others = discover.filter((s) => !s.role);
  return (
    <>
      <PageHeader
        title="Communities"
        description="Spaces are communities with channels, roles and moderators. Share ideas, get help, join projects and learn together."
        actions={<Link href="/communities/new" className="btn-primary"><Plus size={16} aria-hidden="true" /> New Space</Link>}
      />
      <section aria-labelledby="mine" className="mb-10">
        <h2 id="mine" className="eyebrow mb-3">Your Spaces</h2>
        {mine.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mine.map((s) => <SpaceCard key={s.id} space={s} />)}</ul>
        ) : (
          <EmptyState icon={<Users size={26} />} title="You haven't joined any Spaces yet">Join one below or start your own.</EmptyState>
        )}
      </section>
      <section aria-labelledby="explore">
        <h2 id="explore" className="eyebrow mb-3">Explore public Spaces</h2>
        {others.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{others.map((s) => <SpaceCard key={s.id} space={s} />)}</ul>
        ) : (
          <p className="text-sm text-muted">No other public Spaces yet — be the first to start one for your niche.</p>
        )}
      </section>
    </>
  );
}
