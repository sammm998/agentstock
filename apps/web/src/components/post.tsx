import Link from "next/link";
import { Bookmark, Flag, Heart, Lock, MessageSquare, Repeat2, Trash2 } from "lucide-react";
import { REPORT_REASONS, POST_MAX } from "@hustera/domain";
import type { PostView } from "@/server/social";
import { createPostAction, deletePostAction, likeAction, reportAction, repostAction, saveAction } from "@/app/actions";
import { ActionForm } from "./action-form";
import { Avatar, KindChip, RichText, TimeAgo } from "./ui";

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  hate: "Hateful conduct",
  scam_or_fraud: "Scam or fraud",
  impersonation: "Impersonation",
  ip_violation: "Copyright or trademark",
  illegal: "Illegal content",
  other: "Something else",
};

export function ReportMenu({ targetType, targetId, label = "Report" }: { targetType: string; targetId: string; label?: string }) {
  return (
    <details className="group relative">
      <summary className="btn-ghost btn-sm cursor-pointer list-none" aria-label={label}>
        <Flag size={15} aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{label}</span>
      </summary>
      <div className="card absolute right-0 z-20 mt-2 w-72 p-4">
        <ActionForm action={reportAction} showOk reset className="space-y-3">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <div>
            <label className="label" htmlFor={`reason-${targetId}`}>
              Why are you reporting this?
            </label>
            <select id={`reason-${targetId}`} name="reason" className="input" defaultValue="spam">
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REASON_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <textarea name="details" maxLength={1000} rows={2} placeholder="Add details (optional)" className="input" aria-label="Details" />
          <button className="btn-primary btn-sm w-full">Send report</button>
        </ActionForm>
      </div>
    </details>
  );
}

function Original({ post }: { post: PostView | null | undefined }) {
  if (!post) return <div className="mt-3 rounded-xl border border-line px-4 py-3 text-sm text-muted">This post is unavailable.</div>;
  return (
    <Link href={`/post/${post.id}`} className="mt-3 block rounded-xl border border-line bg-midnight/40 px-4 py-3 hover:border-indigo/40">
      <div className="flex items-center gap-2 text-sm">
        <Avatar name={post.display_name} seed={post.handle} size={22} />
        <span className="font-semibold">{post.display_name}</span>
        <span className="text-muted">@{post.handle}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{post.body}</p>
    </Link>
  );
}

export function PostCard({ post, viewerId, detail = false }: { post: PostView; viewerId: string | null; detail?: boolean }) {
  const isRepost = !!post.repost_of;
  const own = viewerId === post.author_id;
  return (
    <article className="card p-5" aria-labelledby={`post-${post.id}-author`}>
      {isRepost && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted">
          <Repeat2 size={14} aria-hidden="true" /> <Link href={`/u/${post.handle}`}>{post.display_name}</Link> reposted
        </p>
      )}
      {!isRepost && (
        <header className="flex items-start gap-3">
          <Link href={`/u/${post.handle}`} tabIndex={-1}>
            <Avatar name={post.display_name} seed={post.handle} size={42} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link id={`post-${post.id}-author`} href={`/u/${post.handle}`} className="font-semibold hover:underline">
                {post.display_name}
              </Link>
              <KindChip kind={post.kind} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>@{post.handle}</span>
              <span aria-hidden="true">·</span>
              <Link href={`/post/${post.id}`} className="hover:underline">
                <TimeAgo date={post.created_at} />
              </Link>
              {post.visibility === "followers" && (
                <span className="inline-flex items-center gap-1" title="Visible to followers only">
                  <Lock size={11} aria-hidden="true" /> Followers
                </span>
              )}
            </div>
          </div>
        </header>
      )}
      {isRepost ? (
        <Original post={post.original} />
      ) : (
        <p className={`mt-3 whitespace-pre-wrap break-words leading-relaxed ${detail ? "text-lg" : "text-[15px]"}`}>
          <RichText text={post.body} />
        </p>
      )}

      {!isRepost && (
        <footer className="mt-4 flex flex-wrap items-center gap-1 text-muted">
          {viewerId ? (
            <>
              <ActionForm action={likeAction}>
                <input type="hidden" name="postId" value={post.id} />
                <button className={`btn-ghost btn-sm ${post.liked ? "!text-danger" : ""}`} aria-pressed={post.liked} aria-label={post.liked ? "Unlike" : "Like"}>
                  <Heart size={16} fill={post.liked ? "currentColor" : "none"} aria-hidden="true" /> {post.like_count}
                </button>
              </ActionForm>
              <Link href={`/post/${post.id}`} className="btn-ghost btn-sm" aria-label={`${post.comment_count} comments`}>
                <MessageSquare size={16} aria-hidden="true" /> {post.comment_count}
              </Link>
              {post.visibility === "public" && (
                <ActionForm action={repostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button className={`btn-ghost btn-sm ${post.reposted ? "!text-mint" : ""}`} aria-pressed={post.reposted} aria-label={post.reposted ? "Undo repost" : "Repost"}>
                    <Repeat2 size={16} aria-hidden="true" /> {post.repost_count}
                  </button>
                </ActionForm>
              )}
              <ActionForm action={saveAction}>
                <input type="hidden" name="postId" value={post.id} />
                <button className={`btn-ghost btn-sm ${post.saved ? "!text-indigo-2" : ""}`} aria-pressed={post.saved} aria-label={post.saved ? "Unsave" : "Save"}>
                  <Bookmark size={16} fill={post.saved ? "currentColor" : "none"} aria-hidden="true" />
                </button>
              </ActionForm>
              <div className="ml-auto flex items-center">
                {own ? (
                  <ActionForm action={deletePostAction} confirm="Delete this post? This can't be undone.">
                    <input type="hidden" name="postId" value={post.id} />
                    <button className="btn-ghost btn-sm" aria-label="Delete post">
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </ActionForm>
                ) : (
                  <ReportMenu targetType="post" targetId={post.id} />
                )}
              </div>
            </>
          ) : (
            <span className="text-xs">
              <Heart size={14} className="mr-1 inline" aria-hidden="true" />
              {post.like_count} · {post.comment_count} comments
            </span>
          )}
        </footer>
      )}
      {isRepost && own && (
        <footer className="mt-3 flex justify-end">
          <ActionForm action={repostAction}>
            <input type="hidden" name="postId" value={post.repost_of!} />
            <button className="btn-ghost btn-sm">Undo repost</button>
          </ActionForm>
        </footer>
      )}
    </article>
  );
}

export function Composer({ name, handle, placeholder = "Share what you're building, learning or looking for…" }: { name: string; handle: string; placeholder?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <ActionForm action={createPostAction} reset className="flex gap-3" aria-label="Create a post">
        <Avatar name={name} seed={handle} size={42} />
        <div className="flex-1">
          <label htmlFor="composer" className="sr-only">
            Post
          </label>
          <textarea id="composer" name="body" required maxLength={POST_MAX} rows={3} placeholder={placeholder} className="input resize-y border-transparent bg-transparent px-0 text-[15px] focus:border-transparent" />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <label htmlFor="visibility" className="sr-only">
                Who can see this
              </label>
              <select id="visibility" name="visibility" className="input w-auto py-1.5 text-xs">
                <option value="public">Everyone</option>
                <option value="followers">Followers only</option>
              </select>
              <span className="hidden sm:inline">Use #tags and @mentions</span>
            </div>
            <button className="btn-primary">Post</button>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}
