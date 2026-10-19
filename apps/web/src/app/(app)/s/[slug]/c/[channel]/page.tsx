import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Hash, Megaphone, Pin, Settings, Trash2 } from "lucide-react";
import { canInSpace } from "@hustera/domain";
import { requireViewer } from "@/server/session";
import { channelMessages, getSpace, listChannels, pinnedMessages } from "@/server/spaces";
import { deleteChannelMessageAction, leaveSpaceAction, pinMessageAction, postChannelMessageAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { AutoRefresh, ScrollToEnd } from "@/components/live";
import { ReportMenu } from "@/components/post";
import { SpaceIcon } from "@/components/spaces";
import { Avatar, RichText, TimeAgo } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; channel: string }> }): Promise<Metadata> {
  const { slug, channel } = await params;
  return { title: `#${channel} · ${slug}` };
}

export default async function ChannelPage({ params }: { params: Promise<{ slug: string; channel: string }> }) {
  const viewer = await requireViewer();
  const { slug, channel: channelName } = await params;
  const space = await getSpace(viewer.id, slug);
  if (!space) notFound();
  if (!space.role) redirect(`/s/${slug}`);
  const channels = await listChannels(space.id);
  const channel = channels.find((c) => c.name === channelName);
  if (!channel) notFound();
  const [messages, pinned] = await Promise.all([channelMessages(viewer.id, channel.id), pinnedMessages(channel.id)]);

  const canPost = canInSpace(space.role, channel.kind === "announcements" ? "post_announcement" : "post_message");
  const canModerate = canInSpace(space.role, "delete_any_message");
  const canManage = canInSpace(space.role, "manage_channels");

  const channelList = channels.map((c) => {
    const Icon = c.kind === "announcements" ? Megaphone : Hash;
    const active = c.id === channel.id;
    return (
      <li key={c.id}>
        <Link href={`/s/${slug}/c/${c.name}`} aria-current={active ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${active ? "bg-indigo/20 text-cloud" : "text-muted hover:bg-slate-2 hover:text-cloud"}`}>
          <Icon size={14} aria-hidden="true" /> {c.name}
        </Link>
      </li>
    );
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <AutoRefresh seconds={6} />
      <aside className="card h-fit p-3 lg:sticky lg:top-24" aria-label={`${space.name} channels`}>
        <div className="flex items-center gap-2 px-2 pb-3">
          <SpaceIcon name={space.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{space.name}</p>
            <p className="text-xs capitalize text-muted">{space.role} · {space.member_count} members</p>
          </div>
          {canManage && (
            <Link href={`/s/${slug}/manage`} className="btn-ghost btn-sm" aria-label="Manage Space"><Settings size={15} /></Link>
          )}
        </div>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col">{channelList}</ul>
        {space.role !== "owner" && (
          <ActionForm action={leaveSpaceAction} confirm={`Leave ${space.name}?`} className="mt-3 hidden lg:block">
            <input type="hidden" name="spaceId" value={space.id} />
            <button className="btn-ghost btn-sm w-full">Leave Space</button>
          </ActionForm>
        )}
      </aside>

      <section className="card flex h-[calc(100dvh-14rem)] flex-col lg:h-[calc(100dvh-8rem)]" aria-labelledby="channel-title">
        <header className="border-b border-line px-5 py-3">
          <h1 id="channel-title" className="flex items-center gap-2 font-semibold">
            {channel.kind === "announcements" ? <Megaphone size={16} aria-hidden="true" /> : <Hash size={16} aria-hidden="true" />} {channel.name}
          </h1>
          {channel.topic && <p className="text-xs text-muted">{channel.topic}</p>}
          {pinned.length > 0 && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-mint">
                <Pin size={12} className="mr-1 inline" aria-hidden="true" />{pinned.length} pinned
              </summary>
              <ul className="mt-2 space-y-1">
                {pinned.map((p) => <li key={p.id} className="truncate text-muted"><strong className="text-cloud">@{p.handle ?? "deleted"}</strong> {p.body}</li>)}
              </ul>
            </details>
          )}
        </header>
        <ol className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Messages">
          {messages.length === 0 && (
            <li className="py-12 text-center text-sm text-muted">
              This is the beginning of <strong className="text-cloud">#{channel.name}</strong>. {canPost ? "Say hello!" : "Only moderators can post here."}
            </li>
          )}
          {messages.map((m) => (
            <li key={m.id} className="group flex gap-3 rounded-xl px-2 py-2 hover:bg-slate-2/50">
              <Avatar name={m.display_name ?? "?"} seed={m.handle ?? m.id} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {m.handle ? <Link href={`/u/${m.handle}`} className="font-semibold hover:underline">{m.display_name}</Link> : <span className="text-muted">Former member</span>}
                  {m.role && m.role !== "member" && <span className="chip py-0 text-[10px] capitalize text-mint">{m.role}</span>}
                  <span className="text-xs text-muted"><TimeAgo date={m.created_at} /></span>
                  {m.pinned && <Pin size={12} className="text-mint" aria-label="Pinned" />}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm"><RichText text={m.body} /></p>
              </div>
              <div className="flex items-start opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                {canModerate && (
                  <ActionForm action={pinMessageAction}>
                    <input type="hidden" name="messageId" value={m.id} />
                    <button className="btn-ghost btn-sm" aria-label={m.pinned ? "Unpin" : "Pin"}><Pin size={14} /></button>
                  </ActionForm>
                )}
                {(canModerate || m.author_id === viewer.id) && (
                  <ActionForm action={deleteChannelMessageAction} confirm="Delete this message?">
                    <input type="hidden" name="messageId" value={m.id} />
                    <button className="btn-ghost btn-sm" aria-label="Delete message"><Trash2 size={14} /></button>
                  </ActionForm>
                )}
                {m.author_id !== viewer.id && <ReportMenu targetType="channel_message" targetId={m.id} label="Report" />}
              </div>
            </li>
          ))}
          <ScrollToEnd dep={messages.length} />
        </ol>
        {canPost ? (
          <ActionForm action={postChannelMessageAction} reset className="flex flex-wrap gap-2 border-t border-line p-3">
            <input type="hidden" name="channelId" value={channel.id} />
            <label htmlFor="msg" className="sr-only">Message #{channel.name}</label>
            <input id="msg" name="body" required maxLength={2000} autoComplete="off" placeholder={`Message #${channel.name}`} className="input flex-1" />
            <button className="btn-primary">Send</button>
          </ActionForm>
        ) : (
          <p className="border-t border-line p-4 text-center text-sm text-muted">Only owners and moderators can post in announcement channels.</p>
        )}
      </section>
    </div>
  );
}
