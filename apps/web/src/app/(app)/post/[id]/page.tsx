import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getViewer } from "@/server/session";
import { getPost, postComments } from "@/server/social";
import { isUuid } from "@/server/core";
import { commentAction, deleteCommentAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { PostCard, ReportMenu } from "@/components/post";
import { Avatar, RichText, TimeAgo } from "@/components/ui";

export const metadata: Metadata = { title: "Post" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const viewer = await getViewer();
  const post = await getPost(viewer?.id ?? null, id);
  if (!post) notFound();
  const comments = await postComments(viewer?.id ?? null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/home" className="btn-ghost btn-sm -ml-2">
        <ArrowLeft size={15} aria-hidden="true" /> Back
      </Link>
      <PostCard post={post} viewerId={viewer?.id ?? null} detail />
      <section className="card p-5" aria-labelledby="comments-heading">
        <h2 id="comments-heading" className="font-semibold">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </h2>
        {viewer ? (
          <ActionForm action={commentAction} reset className="mt-4 flex gap-3">
            <input type="hidden" name="postId" value={post.id} />
            <label htmlFor="comment" className="sr-only">Add a comment</label>
            <input id="comment" name="body" required maxLength={500} placeholder="Add a thoughtful comment…" className="input" />
            <button className="btn-primary">Reply</button>
          </ActionForm>
        ) : (
          <p className="mt-3 text-sm text-muted">
            <Link href="/signin" className="text-cloud underline">Sign in</Link> to join the conversation.
          </p>
        )}
        <ul className="mt-5 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.display_name} seed={c.handle} size={34} />
              <div className="min-w-0 flex-1 rounded-xl bg-midnight/40 px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <Link href={`/u/${c.handle}`} className="font-semibold hover:underline">{c.display_name}</Link>
                  <span className="text-xs text-muted">@{c.handle} · <TimeAgo date={c.created_at} /></span>
                  <div className="ml-auto flex">
                    {viewer && (viewer.id === c.author_id || viewer.id === post.author_id) && (
                      <ActionForm action={deleteCommentAction} confirm="Delete this comment?">
                        <input type="hidden" name="commentId" value={c.id} />
                        <button className="btn-ghost btn-sm" aria-label="Delete comment"><Trash2 size={14} aria-hidden="true" /></button>
                      </ActionForm>
                    )}
                    {viewer && viewer.id !== c.author_id && <ReportMenu targetType="comment" targetId={c.id} />}
                  </div>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm"><RichText text={c.body} /></p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
