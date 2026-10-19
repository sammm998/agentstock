import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Trash2 } from "lucide-react";
import { canInSpace, canRemoveMember } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { activeInvites, getSpace, listChannels, spaceMembers, spaceModLog } from "@/server/spaces";
import { createChannelAction, createInviteAction, deleteChannelAction, deleteSpaceAction, memberRoleAction, updateSpaceAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Avatar, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Manage Space" };

export default async function ManageSpacePage({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = await requireViewer();
  const { slug } = await params;
  const space = await getSpace(viewer.id, slug);
  if (!space) notFound();
  if (!canInSpace(space.role, "manage_channels")) redirect(`/s/${slug}`);
  const isOwner = space.role === "owner";
  const [channels, members, invites, log] = await Promise.all([listChannels(space.id), spaceMembers(space.id), activeInvites(space.id), spaceModLog(viewer.id, space.id)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/s/${slug}`} className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> Back to {space.name}</Link>
      <PageHeader title={`Manage ${space.name}`} description={`You are ${space.role === "owner" ? "the owner" : "a moderator"} of this Space.`} />

      {isOwner && (
        <section className="card p-6" aria-labelledby="details">
          <h2 id="details" className="font-semibold">Details</h2>
          <ActionForm action={updateSpaceAction} showOk className="mt-4 space-y-4">
            <input type="hidden" name="spaceId" value={space.id} />
            <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={space.name} required minLength={3} maxLength={48} className="input" /></div>
            <div><label className="label" htmlFor="description">Description</label><textarea id="description" name="description" defaultValue={space.description} maxLength={280} rows={3} className="input" /></div>
            <div>
              <label className="label" htmlFor="visibility">Visibility</label>
              <select id="visibility" name="visibility" defaultValue={space.visibility} className="input">
                <option value="public">Public — anyone can find and join</option>
                <option value="private">Private — invite only</option>
              </select>
            </div>
            <button className="btn-primary">Save changes</button>
          </ActionForm>
        </section>
      )}

      <section className="card p-6" aria-labelledby="channels">
        <h2 id="channels" className="font-semibold">Channels</h2>
        <ul className="mt-3 divide-y divide-line">
          {channels.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-sm">#{c.name} <span className="text-muted">{c.kind === "announcements" ? "· announcements" : ""} {c.topic && `· ${c.topic}`}</span></span>
              <ActionForm action={deleteChannelAction} confirm={`Delete #${c.name} and all its messages?`}>
                <input type="hidden" name="channelId" value={c.id} />
                <button className="btn-ghost btn-sm" aria-label={`Delete #${c.name}`}><Trash2 size={14} /></button>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={createChannelAction} reset showOk className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input type="hidden" name="spaceId" value={space.id} />
          <input name="name" required placeholder="channel-name" pattern="[a-z0-9-]+" aria-label="Channel name" className="input" />
          <input name="topic" placeholder="Topic (optional)" maxLength={120} aria-label="Topic" className="input" />
          <select name="kind" aria-label="Channel type" className="input"><option value="text">Text</option><option value="announcements">Announcements</option></select>
          <button className="btn-primary">Add</button>
        </ActionForm>
      </section>

      <section className="card p-6" aria-labelledby="invites">
        <h2 id="invites" className="font-semibold">Invites</h2>
        <p className="mt-1 text-sm text-muted">Invite links work for 7 days or 25 uses.</p>
        <ul className="mt-3 space-y-2">
          {invites.map((i) => (
            <li key={i.code} className="flex flex-wrap items-center gap-2 rounded-lg bg-midnight/50 px-3 py-2 text-sm">
              <code className="flex-1 break-all text-mint">/invite/{i.code}</code>
              <span className="text-xs text-muted">{i.uses}/{i.max_uses} used · expires <TimeAgo date={i.expires_at} /></span>
            </li>
          ))}
        </ul>
        <ActionForm action={createInviteAction} showOk className="mt-3">
          <input type="hidden" name="spaceId" value={space.id} />
          <button className="btn-secondary btn-sm">Create invite link</button>
        </ActionForm>
      </section>

      <section className="card p-6" aria-labelledby="members">
        <h2 id="members" className="font-semibold">Members ({members.length})</h2>
        <ul className="mt-3 divide-y divide-line">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-2.5">
              <Avatar name={m.display_name} seed={m.handle} size={32} />
              <Link href={`/u/${m.handle}`} className="min-w-0 flex-1 text-sm"><span className="font-semibold">{m.display_name}</span> <span className="text-muted">@{m.handle}</span></Link>
              <span className="chip capitalize">{m.role}</span>
              {m.user_id !== viewer.id && (
                <ActionForm action={memberRoleAction} className="flex gap-1">
                  <input type="hidden" name="spaceId" value={space.id} />
                  <input type="hidden" name="userId" value={m.user_id} />
                  {isOwner && m.role === "member" && <button name="op" value="promote" className="btn-ghost btn-sm">Make moderator</button>}
                  {isOwner && m.role === "moderator" && <button name="op" value="demote" className="btn-ghost btn-sm">Remove moderator</button>}
                  {canRemoveMember(space.role, m.role) && <button name="op" value="remove" className="btn-ghost btn-sm text-danger">Remove</button>}
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6" aria-labelledby="modlog">
        <h2 id="modlog" className="font-semibold">Moderation log</h2>
        {log.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {log.map((l) => (
              <li key={l.id} className="flex flex-wrap gap-x-2 text-muted">
                <span className="text-cloud">@{l.actor ?? "deleted"}</span> {l.action.replace(".", " ")} {l.subject && <span>· @{l.subject}</span>} {l.note && <span>· {l.note}</span>} <span className="ml-auto text-xs"><TimeAgo date={l.created_at} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No moderation actions yet.</p>
        )}
      </section>

      {isOwner && (
        <section className="card border-danger/30 p-6" aria-labelledby="danger">
          <h2 id="danger" className="font-semibold text-danger">Delete Space</h2>
          <p className="mt-1 text-sm text-muted">Permanently deletes all channels and messages.</p>
          <ActionForm action={deleteSpaceAction} confirm={`Permanently delete ${space.name}?`} className="mt-3">
            <input type="hidden" name="spaceId" value={space.id} />
            <button className="btn-danger">Delete Space</button>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
