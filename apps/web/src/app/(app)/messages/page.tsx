import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { requireViewer } from "@/server/session";
import { listConversations } from "@/server/messages";
import { Avatar, EmptyState, PageHeader, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await requireViewer();
  const convos = await listConversations(viewer.id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" description="Private conversations. Start one from anyone's profile." />
      {convos.length ? (
        <ul className="card divide-y divide-line">
          {convos.map((c) => (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-2/60">
                <Avatar name={c.other_name} seed={c.other_handle} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.other_name}</span>
                    <span className="text-xs text-muted">@{c.other_handle}</span>
                    <span className="ml-auto text-xs text-muted"><TimeAgo date={c.last_message_at} /></span>
                  </div>
                  <p className={`truncate text-sm ${c.unread ? "font-medium text-cloud" : "text-muted"}`}>{c.last_body ?? "No messages yet"}</p>
                </div>
                {c.unread > 0 && <span className="rounded-full bg-mint px-2 text-xs font-bold text-midnight">{c.unread}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<MessageCircle size={26} />} title="No conversations yet" action={<Link href="/discover?tab=people" className="btn-primary">Find people</Link>}>
          Open someone&apos;s profile and press Message to start a conversation.
        </EmptyState>
      )}
    </div>
  );
}
