import Link from "next/link";
import type { Metadata } from "next";
import { Compass, Sparkles, Users } from "lucide-react";
import { requireViewer } from "@/server/session";
import { homeFeed, searchPeople, trendingTags } from "@/server/social";
import { publicSpaces } from "@/server/spaces";
import { sparksSummary } from "@/server/sparks";
import { Composer, PostCard } from "@/components/post";
import { FollowButton } from "@/components/people";
import { Avatar, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const viewer = await requireViewer();
  const { welcome } = await searchParams;
  const [feed, people, tags, spaces, sparks] = await Promise.all([
    homeFeed(viewer.id),
    searchPeople(viewer.id, "", 5),
    trendingTags(8),
    publicSpaces(viewer.id),
    sparksSummary(viewer.id),
  ]);
  const suggestions = people.filter((p) => !p.follow_state);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[20px] border border-line p-6 sm:p-8" style={{ background: "linear-gradient(120deg, #1a1650 0%, #111c31 55%, #0d2a33 100%)" }}>
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-indigo/40 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-mint/20 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <p className="eyebrow text-[#c9c4ff]">{welcome ? "Welcome to Hustera" : `Hi ${viewer.displayName.split(" ")[0]}`}</p>
            <h1 className="mt-2 max-w-lg text-2xl font-bold leading-tight sm:text-3xl">Turn ideas into real projects — together.</h1>
            <p className="mt-2 max-w-lg text-sm text-muted">Share what you&apos;re building, find collaborators and learn from people doing the work.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/discover" className="btn-primary">
                <Compass size={16} aria-hidden="true" /> Discover people
              </Link>
              <Link href="/communities" className="btn-secondary">
                <Users size={16} aria-hidden="true" /> Join a Space
              </Link>
            </div>
          </div>
        </section>

        <Composer name={viewer.displayName} handle={viewer.handle} />

        <h2 className="sr-only">Your feed</h2>
        {feed.length ? (
          feed.map((p) => <PostCard key={p.id} post={p} viewerId={viewer.id} />)
        ) : (
          <EmptyState icon={<Sparkles size={28} />} title="Your feed is quiet" action={<Link href="/discover" className="btn-primary">Find people to follow</Link>}>
            Follow creators and freelancers to see their posts here, or write your first post above.
          </EmptyState>
        )}
      </div>

      <aside className="space-y-5" aria-label="Suggestions">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your Sparks</h2>
            <Link href="/rewards" className="text-xs text-muted hover:text-cloud">Details →</Link>
          </div>
          <p className="mt-3 text-3xl font-bold text-mint">{sparks.balance}</p>
          <p className="text-sm text-muted">
            {sparks.tier.name} tier{sparks.next ? ` · ${sparks.next.threshold - Math.max(0, sparks.balance)} to ${sparks.next.name}` : ""}
          </p>
          <p className="mt-3 text-xs text-muted">Loyalty points for contributions. No cash value.</p>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">People to follow</h2>
          {suggestions.length ? (
            <ul className="mt-4 space-y-4">
              {suggestions.map((p) => (
                <li key={p.user_id} className="flex items-center gap-3">
                  <Avatar name={p.display_name} seed={p.handle} size={36} />
                  <Link href={`/u/${p.handle}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.display_name}</span>
                    <span className="block truncate text-xs text-muted">@{p.handle}</span>
                  </Link>
                  <FollowButton userId={p.user_id} state={p.follow_state} small />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">You&apos;re following everyone we could suggest. Invite friends to Hustera!</p>
          )}
        </section>

        {spaces.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold">Popular Spaces</h2>
            <ul className="mt-3 space-y-2">
              {spaces.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link href={`/s/${s.slug}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-2">
                    <span className="truncate">{s.name}</span>
                    <span className="text-xs text-muted">{s.member_count} {s.member_count === 1 ? "member" : "members"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tags.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold">Trending topics</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.tag} href={`/discover?tag=${t.tag}`} className="chip hover:border-indigo/50 hover:text-cloud">
                  #{t.tag}
                </Link>
              ))}
            </div>
          </section>
        )}
      </aside>
    </div>
  );
}
