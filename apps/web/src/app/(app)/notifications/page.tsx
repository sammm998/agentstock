import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireViewer } from "@/server/session";
import { listNotifications } from "@/server/notifications";
import { pendingFollowRequests } from "@/server/social";
import { followRequestAction, markNotificationsReadAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { Avatar, EmptyState, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Notifications" };

const TEXT: Record<string, string> = {
  follow: "started following you",
  follow_request: "requested to follow you",
  like: "liked your post",
  comment: "commented on your post",
  mention: "mentioned you",
  repost: "reposted your post",
  space_invite: "joined your Space",
  dm: "sent you a message",
};

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const [items, requests] = await Promise.all([listNotifications(viewer.id), pendingFollowRequests(viewer.id)]);
  const unread = items.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        actions={
          unread ? (
            <ActionForm action={markNotificationsReadAction}>
              <button className="btn-secondary btn-sm">Mark all as read</button>
            </ActionForm>
          ) : null
        }
      />
      {requests.length > 0 && (
        <section className="card mb-5 p-5" aria-labelledby="requests">
          <h2 id="requests" className="font-semibold">Follow requests</h2>
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li key={r.user_id} className="flex items-center gap-3">
                <Avatar name={r.display_name} seed={r.handle} size={36} />
                <Link href={`/u/${r.handle}`} className="flex-1 text-sm">
                  <span className="font-semibold">{r.display_name}</span> <span className="text-muted">@{r.handle}</span>
                </Link>
                <ActionForm action={followRequestAction} className="flex gap-2">
                  <input type="hidden" name="userId" value={r.user_id} />
                  <button name="op" value="approve" className="btn-primary btn-sm">Approve</button>
                  <button name="op" value="reject" className="btn-ghost btn-sm">Decline</button>
                </ActionForm>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length ? (
        <ul className="card divide-y divide-line">
          {items.map((n) => {
            const href = n.post_id ? `/post/${n.post_id}` : n.kind === "moderation" ? "/settings#moderation" : n.actor_handle ? `/u/${n.actor_handle}` : "#";
            return (
              <li key={n.id}>
                <Link href={href} className={`flex items-start gap-3 px-5 py-4 hover:bg-slate-2/60 ${n.read_at ? "" : "bg-indigo/[0.06]"}`}>
                  {n.actor_handle ? <Avatar name={n.actor_name ?? "?"} seed={n.actor_handle} size={36} /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-2 text-indigo-2"><Bell size={16} aria-hidden="true" /></span>}
                  <div className="flex-1 text-sm">
                    {n.actor_handle && <span className="font-semibold">{n.actor_name} </span>}
                    <span className="text-muted">{n.body || TEXT[n.kind] || n.kind}</span>
                    <div className="mt-0.5 text-xs text-muted"><TimeAgo date={n.created_at} /></div>
                  </div>
                  {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-mint" aria-label="Unread" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Bell size={26} />} title="No notifications yet">When people follow you, like or comment on your posts, you&apos;ll see it here.</EmptyState>
      )}
    </div>
  );
}
