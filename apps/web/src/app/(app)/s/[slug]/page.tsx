import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Hash, Lock, Users } from "lucide-react";
import { getViewer } from "@/server/session";
import { getSpace, listChannels } from "@/server/spaces";
import { joinSpaceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { SpaceIcon } from "@/components/spaces";
import { ReportMenu } from "@/components/post";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  const space = await getSpace(viewer?.id ?? null, (await params).slug);
  return { title: space?.name ?? "Space" };
}

export default async function SpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getViewer();
  const space = await getSpace(viewer?.id ?? null, slug);
  if (!space) notFound();
  const channels = await listChannels(space.id);
  if (space.role && channels[0]) redirect(`/s/${slug}/c/${channels.find((c) => c.kind === "text")?.name ?? channels[0].name}`);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="card overflow-hidden">
        <div className="h-28" style={{ background: "linear-gradient(120deg, #2a2178, #111c31 55%, #0f3a3a)" }} aria-hidden="true" />
        <div className="p-6">
          <div className="-mt-14 flex items-end justify-between">
            <SpaceIcon name={space.name} size={72} />
            {viewer && <ReportMenu targetType="space" targetId={space.id} />}
          </div>
          <h1 className="mt-4 text-2xl font-bold">{space.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            {space.visibility === "private" ? <Lock size={14} aria-hidden="true" /> : <Users size={14} aria-hidden="true" />}
            {space.member_count} {space.member_count === 1 ? "member" : "members"} · {space.visibility === "private" ? "Private" : "Public"} Space
          </p>
          {space.description && <p className="mt-4">{space.description}</p>}
          <h2 className="eyebrow mt-6">Channels</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {channels.map((c) => (
              <li key={c.id} className="chip"><Hash size={12} aria-hidden="true" />{c.name}</li>
            ))}
          </ul>
          <div className="mt-6">
            {viewer ? (
              <ActionForm action={joinSpaceAction}>
                <input type="hidden" name="spaceId" value={space.id} />
                <button className="btn-primary">Join {space.name}</button>
              </ActionForm>
            ) : (
              <Link href={`/signin?next=/s/${space.slug}`} className="btn-primary">Sign in to join</Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
