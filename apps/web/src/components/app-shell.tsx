import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, MessageCircle, Search } from "lucide-react";
import { canOnPlatform } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { unreadCounts } from "@/server/notifications";
import { mySpaces } from "@/server/spaces";
import { sparksSummary } from "@/server/sparks";
import { Wordmark } from "./brand";
import { Avatar } from "./ui";
import { MobileNav, SideNav, SpaceLink } from "./nav";

export async function AppShell({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  const [counts, spaces, sparks] = viewer
    ? await Promise.all([unreadCounts(viewer.id), mySpaces(viewer.id), sparksSummary(viewer.id)])
    : [{ notifications: 0, messages: 0 }, [], null];

  const moderator = !!viewer && canOnPlatform(viewer.role, "view_reports");

  return (
    <div className="aurora min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo focus:px-4 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-midnight/80 backdrop-blur lg:flex">
        <div className="px-5 pb-4 pt-5">
          <Link href={viewer ? "/home" : "/"} aria-label="Hustera home">
            <Wordmark size={30} />
          </Link>
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
          <SideNav unreadMessages={counts.messages} moderator={moderator} />
          {viewer && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="eyebrow">Your Spaces</span>
                <Link href="/communities/new" className="text-xs text-muted hover:text-cloud" aria-label="Create a space">
                  + New
                </Link>
              </div>
              {spaces.length ? (
                <ul className="space-y-0.5">
                  {spaces.map((s) => (
                    <li key={s.id}>
                      <SpaceLink href={`/s/${s.slug}`} label={s.name} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 text-xs text-muted">Join or create a Space to collaborate with others.</p>
              )}
            </div>
          )}
        </nav>
        {sparks && (
          <Link href="/rewards" className="mx-3 mb-4 flex items-center justify-between rounded-xl border border-line bg-slate/70 px-3 py-2.5 text-sm hover:border-indigo/50">
            <span className="text-muted">Sparks</span>
            <span className="font-semibold text-mint">
              {sparks.balance} · {sparks.tier.name}
            </span>
          </Link>
        )}
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-midnight/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
            <Link href={viewer ? "/home" : "/"} className="lg:hidden" aria-label="Hustera home">
              <Wordmark size={26} />
            </Link>
            <form action="/discover" role="search" className="relative ml-auto hidden max-w-md flex-1 sm:block lg:ml-0">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
              <label htmlFor="global-search" className="sr-only">
                Search people, posts and spaces
              </label>
              <input id="global-search" name="q" placeholder="Search people, posts, spaces…" className="input pl-9" />
            </form>
            <div className="ml-auto flex items-center gap-1 sm:ml-4">
              {viewer ? (
                <>
                  <Link href="/notifications" className="btn-ghost relative !px-2.5" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
                    <Bell size={19} strokeWidth={1.8} />
                    {counts.notifications > 0 && (
                      <span className="absolute right-1 top-1 min-w-4 rounded-full bg-mint px-1 text-center text-[10px] font-bold leading-4 text-midnight">
                        {counts.notifications > 99 ? "99+" : counts.notifications}
                      </span>
                    )}
                  </Link>
                  <Link href="/messages" className="btn-ghost relative hidden !px-2.5 sm:inline-flex" aria-label="Messages">
                    <MessageCircle size={19} strokeWidth={1.8} />
                  </Link>
                  <Link href={`/u/${viewer.handle}`} className="ml-1" aria-label="Your profile">
                    <Avatar name={viewer.displayName} seed={viewer.handle} size={34} tier={sparks?.tier.id} />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signin" className="btn-ghost">
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn-primary">
                    Join Hustera
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
      {viewer && <MobileNav unreadMessages={counts.messages} />}
    </div>
  );
}
