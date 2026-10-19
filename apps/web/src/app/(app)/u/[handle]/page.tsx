import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Globe, Lock, MapPin, MessageCircle, Settings, Ban } from "lucide-react";
import { getViewer } from "@/server/session";
import { getProfileByHandle } from "@/server/accounts";
import { followCounts, followState, hasBlocked, isBlockedBetween, profilePosts, savedPosts } from "@/server/social";
import { sparksSummary } from "@/server/sparks";
import { blockAction, startConversationAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { FollowButton } from "@/components/people";
import { PostCard, ReportMenu } from "@/components/post";
import { Avatar, EmptyState, KindChip } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const profile = await getProfileByHandle((await params).handle);
  return { title: profile ? `${profile.display_name} (@${profile.handle})` : "Profile" };
}

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ handle }, { tab }, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();
  const own = viewer?.id === profile.user_id;
  if (viewer && !own && (await isBlockedBetween(viewer.id, profile.user_id)) && !(await hasBlocked(viewer.id, profile.user_id))) notFound();

  const [counts, state, blocked, sparks] = await Promise.all([
    followCounts(profile.user_id),
    viewer && !own ? followState(viewer.id, profile.user_id) : Promise.resolve(null),
    viewer && !own ? hasBlocked(viewer.id, profile.user_id) : Promise.resolve(false),
    sparksSummary(profile.user_id),
  ]);
  const locked = profile.is_private && !own && state !== "active";
  const showSaved = own && tab === "saved";
  const posts = blocked || locked ? [] : showSaved ? await savedPosts(viewer!.id) : await profilePosts(viewer?.id ?? null, profile.user_id);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card overflow-hidden">
        <div className="h-28 sm:h-36" style={{ background: "linear-gradient(120deg, #2a2178, #111c31 55%, #0f3a3a)" }} aria-hidden="true" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <Avatar name={profile.display_name} seed={profile.handle} size={92} tier={sparks.tier.id} />
            <div className="flex flex-wrap items-center gap-2">
              {own ? (
                <Link href="/settings" className="btn-secondary">
                  <Settings size={16} aria-hidden="true" /> Edit profile
                </Link>
              ) : viewer ? (
                <>
                  {!blocked && <FollowButton userId={profile.user_id} state={state} />}
                  {!blocked && (
                    <ActionForm action={startConversationAction}>
                      <input type="hidden" name="userId" value={profile.user_id} />
                      <button className="btn-secondary" aria-label={`Message ${profile.display_name}`}>
                        <MessageCircle size={16} aria-hidden="true" /> <span className="hidden sm:inline">Message</span>
                      </button>
                    </ActionForm>
                  )}
                  <ActionForm action={blockAction} confirm={blocked ? undefined : `Block @${profile.handle}? They won't be able to follow, message or see your posts.`}>
                    <input type="hidden" name="userId" value={profile.user_id} />
                    <input type="hidden" name="op" value={blocked ? "unblock" : "block"} />
                    <button className="btn-ghost" aria-label={blocked ? "Unblock" : "Block"}>
                      <Ban size={16} aria-hidden="true" /> <span className="hidden sm:inline">{blocked ? "Unblock" : "Block"}</span>
                    </button>
                  </ActionForm>
                  <ReportMenu targetType="user" targetId={profile.user_id} />
                </>
              ) : (
                <Link href="/signup" className="btn-primary">
                  Join to follow
                </Link>
              )}
            </div>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <KindChip kind={profile.kind} />
              {sparks.tier.id !== "spark" && <span className="chip border-mint/30 text-mint">{sparks.tier.name}</span>}
              {profile.is_private && <Lock size={15} className="text-muted" aria-label="Private account" />}
            </div>
            <p className="text-sm text-muted">@{profile.handle}</p>
            {profile.bio && <p className="mt-3 whitespace-pre-wrap">{profile.bio}</p>}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {profile.location && (
                <li className="flex items-center gap-1.5">
                  <MapPin size={14} aria-hidden="true" /> {profile.location}
                </li>
              )}
              {profile.website && (
                <li className="flex items-center gap-1.5">
                  <Globe size={14} aria-hidden="true" />
                  <a href={profile.website} rel="nofollow noopener noreferrer ugc" target="_blank" className="text-[#b8b0ff] hover:underline">
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
              <li className="flex items-center gap-1.5">
                <CalendarDays size={14} aria-hidden="true" /> Joined {new Date(profile.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </li>
            </ul>
            <dl className="mt-4 flex gap-5 text-sm">
              <div><dt className="sr-only">Posts</dt><dd><strong>{counts.posts}</strong> <span className="text-muted">posts</span></dd></div>
              <div><dt className="sr-only">Followers</dt><dd><strong>{counts.followers}</strong> <span className="text-muted">followers</span></dd></div>
              <div><dt className="sr-only">Following</dt><dd><strong>{counts.following}</strong> <span className="text-muted">following</span></dd></div>
            </dl>
          </div>
        </div>
      </section>

      {own && (
        <div role="tablist" className="flex gap-1 rounded-xl border border-line bg-slate/60 p-1 sm:w-fit">
          <Link role="tab" aria-selected={!showSaved} href={`/u/${profile.handle}`} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${!showSaved ? "bg-indigo text-white" : "text-muted"}`}>Posts</Link>
          <Link role="tab" aria-selected={showSaved} href={`/u/${profile.handle}?tab=saved`} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${showSaved ? "bg-indigo text-white" : "text-muted"}`}>Saved</Link>
        </div>
      )}

      {blocked ? (
        <EmptyState title="You blocked this account">Unblock to see their posts again.</EmptyState>
      ) : locked ? (
        <EmptyState icon={<Lock size={26} />} title="This account is private">
          Follow @{profile.handle} and wait for approval to see their posts.
        </EmptyState>
      ) : posts.length ? (
        posts.map((p) => <PostCard key={p.id} post={p} viewerId={viewer?.id ?? null} />)
      ) : (
        <EmptyState title={showSaved ? "Nothing saved yet" : "No posts yet"}>{showSaved ? "Save posts to read them later." : own ? "Share your first post from Home." : null}</EmptyState>
      )}
    </div>
  );
}
