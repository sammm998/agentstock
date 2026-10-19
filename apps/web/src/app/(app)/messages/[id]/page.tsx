import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/server/session";
import { conversationMessages } from "@/server/messages";
import { isUuid } from "@/server/core";
import { sendMessageAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { AutoRefresh, ScrollToEnd } from "@/components/live";
import { Avatar, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await conversationMessages(viewer.id, id);
  if (!data) notFound();
  const { convo, messages } = data;

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-2xl flex-col lg:h-[calc(100dvh-7rem)]">
      <AutoRefresh seconds={5} />
      <header className="card flex items-center gap-3 rounded-b-none px-4 py-3">
        <Link href="/messages" className="btn-ghost btn-sm" aria-label="Back to messages"><ArrowLeft size={16} /></Link>
        <Avatar name={convo.other_name} seed={convo.other_handle} size={36} />
        <Link href={`/u/${convo.other_handle}`} className="min-w-0">
          <h1 className="truncate font-semibold">{convo.other_name}</h1>
          <p className="text-xs text-muted">@{convo.other_handle}</p>
        </Link>
      </header>
      <ol className="flex-1 space-y-2 overflow-y-auto border-x border-line bg-slate/40 p-4" aria-label="Messages" aria-live="polite">
        {messages.length === 0 && <li className="py-10 text-center text-sm text-muted">Say hello 👋 Be kind and respectful.</li>}
        {messages.map((m) => {
          const mine = m.sender_id === viewer.id;
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "rounded-br-sm bg-indigo text-white" : "rounded-bl-sm bg-slate-3"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}><TimeAgo date={m.created_at} /></p>
              </div>
            </li>
          );
        })}
        <ScrollToEnd dep={messages.length} />
      </ol>
      <ActionForm action={sendMessageAction} reset className="card flex flex-wrap gap-2 rounded-t-none p-3">
        <input type="hidden" name="conversationId" value={convo.id} />
        <label htmlFor="dm" className="sr-only">Message</label>
        <input id="dm" name="body" required maxLength={2000} autoComplete="off" placeholder={`Message @${convo.other_handle}`} className="input flex-1" />
        <button className="btn-primary">Send</button>
      </ActionForm>
    </div>
  );
}
