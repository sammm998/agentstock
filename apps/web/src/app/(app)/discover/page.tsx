import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getViewer } from "@/server/session";
import { discoverFeed, searchPeople, trendingTags } from "@/server/social";
import { publicSpaces } from "@/server/spaces";
import { PostCard } from "@/components/post";
import { PersonCard } from "@/components/people";
import { SpaceCard } from "@/components/spaces";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Discover" };

type Tab = "posts" | "people" | "spaces";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; tab?: string }> }) {
  const viewer = await getViewer();
  const sp = await searchParams;
  const query = (sp.q ?? "").trim().slice(0, 80);
  const tag = (sp.tag ?? "").trim().toLowerCase().slice(0, 32) || undefined;
  const tab: Tab = sp.tab === "people" || sp.tab === "spaces" ? sp.tab : "posts";

  const [posts, people, spaces, tags] = await Promise.all([
    tab === "posts" ? discoverFeed(viewer?.id ?? null, { tag, query: query || undefined }) : [],
    tab === "people" ? searchPeople(viewer?.id ?? null, query) : [],
    tab === "spaces" ? publicSpaces(viewer?.id ?? null, query) : [],
    trendingTags(12),
  ]);

  const href = (t: Tab) => `/discover?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(tag && t === "posts" ? { tag } : {}), tab: t })}`;

  return (
    <>
      <PageHeader title={tag ? `#${tag}` : "Discover"} description="Find people, posts and Spaces. Results are ordered by recency — there are no paid placements." />
      <form action="/discover" role="search" className="relative mb-4 sm:hidden">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input name="q" defaultValue={query} placeholder="Search…" aria-label="Search" className="input pl-9" />
        <input type="hidden" name="tab" value={tab} />
      </form>
      <div role="tablist" aria-label="Result type" className="mb-5 flex gap-1 rounded-xl border border-line bg-slate/60 p-1 sm:w-fit">
        {(["posts", "people", "spaces"] as const).map((t) => (
          <Link key={t} role="tab" aria-selected={tab === t} href={href(t)} className={`flex-1 rounded-lg px-4 py-1.5 text-center text-sm font-medium capitalize ${tab === t ? "bg-indigo text-white" : "text-muted hover:text-cloud"}`}>
            {t}
          </Link>
        ))}
      </div>
      {query && <p className="mb-4 text-sm text-muted">Results for “{query}”</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          {tab === "posts" &&
            (posts.length ? posts.map((p) => <PostCard key={p.id} post={p} viewerId={viewer?.id ?? null} />) : <EmptyState title="No posts found">Try another search or topic.</EmptyState>)}
          {tab === "people" &&
            (people.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {people.map((p) => (
                  <PersonCard key={p.user_id} person={p} signedIn={!!viewer} />
                ))}
              </ul>
            ) : (
              <EmptyState title="No people found">Try a different name or handle.</EmptyState>
            ))}
          {tab === "spaces" &&
            (spaces.length ? (
              <ul className="grid gap-3 md:grid-cols-2">
                {spaces.map((s) => (
                  <SpaceCard key={s.id} space={s} signedIn={!!viewer} />
                ))}
              </ul>
            ) : (
              <EmptyState title="No public Spaces found" action={viewer ? <Link href="/communities/new" className="btn-primary">Create a Space</Link> : undefined}>
                Start one for your niche.
              </EmptyState>
            ))}
        </div>
        <aside className="card h-fit p-5" aria-label="Topics">
          <h2 className="font-semibold">Topics</h2>
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {tag && (
                <Link href="/discover" className="chip border-indigo/50 text-cloud">
                  Clear filter ×
                </Link>
              )}
              {tags.map((t) => (
                <Link key={t.tag} href={`/discover?tag=${t.tag}`} aria-current={tag === t.tag ? "true" : undefined} className={`chip hover:text-cloud ${tag === t.tag ? "border-mint/50 text-mint" : ""}`}>
                  #{t.tag} <span className="text-muted/70">{t.uses}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Topics appear here when people use #tags in posts.</p>
          )}
        </aside>
      </div>
    </>
  );
}
