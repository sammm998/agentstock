import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Bell, MessageCircle, Search } from "lucide-react";
import { canOnPlatform } from "@hustera/domain";
import { getViewer } from "@/server/session";
import { unreadCounts } from "@/server/notifications";
import { mySpaces } from "@/server/spaces";
import { sparksSummary } from "@/server/sparks";
import { LogoMark } from "./brand";
import { Avatar } from "./ui";
import { Dock, SideNav, SpaceLink } from "./nav";
import { MenuClock } from "./menu-clock";
import { LedBackground } from "./led-background";

const MENU = [
  { href: "/home", label: "Home" },
  { href: "/agents", label: "Agents" },
  { href: "/projects", label: "Projects" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/wallet", label: "Wallet" },
  { href: "/learn", label: "Help" },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  const [counts, spaces, sparks] = viewer
    ? await Promise.all([unreadCounts(viewer.id), mySpaces(viewer.id), sparksSummary(viewer.id)])
    : [{ notifications: 0, messages: 0 }, [], null];

  const moderator = !!viewer && canOnPlatform(viewer.role, "view_reports");

  return (
    <div className="desktop min-h-dvh">
      <LedBackground />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* Menu bar */}
      <header className="glass-bar fixed inset-x-0 top-0 z-30 h-10 text-[13px] font-medium text-white">
        <div className="flex h-full items-center gap-1 px-3 sm:px-4">
          <Link href={viewer ? "/home" : "/"} aria-label="Hustera home" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/15">
            <LogoMark size={18} />
            <span className="font-bold">Hustera</span>
          </Link>
          <nav aria-label="Menu bar" className="hidden md:block">
            <ul className="flex items-center">
              {MENU.map((m) => (
                <li key={m.href}><Link href={m.href} className="rounded-md px-2.5 py-1 text-white/90 hover:bg-white/15">{m.label}</Link></li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-0.5">
            <form action="/discover" role="search" className="relative hidden sm:block">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/70" aria-hidden="true" />
              <label htmlFor="global-search" className="sr-only">Search people, posts and spaces</label>
              <input id="global-search" name="q" placeholder="Search" className="h-7 w-44 rounded-md border border-white/15 bg-white/10 pl-8 pr-2 text-[13px] text-white placeholder:text-white/60 focus:w-64 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all" />
            </form>
            {viewer ? (
              <>
                <Link href="/live" className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-white/15" aria-label="Control room">
                  <span className="animate-pulse-ring size-2 rounded-full bg-mint" aria-hidden="true" />
                  <Activity size={15} aria-hidden="true" />
                </Link>
                {sparks && <Link href="/rewards" className="hidden rounded-md px-2 py-1 hover:bg-white/15 sm:block">✦ {sparks.balance}</Link>}
                <Link href="/messages" className="relative rounded-md px-2 py-1 hover:bg-white/15" aria-label={`Messages${counts.messages ? `, ${counts.messages} unread` : ""}`}>
                  <MessageCircle size={15} aria-hidden="true" />
                  {counts.messages > 0 && <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-[#ff3b30]" />}
                </Link>
                <Link href="/notifications" className="relative rounded-md px-2 py-1 hover:bg-white/15" aria-label={`Notifications${counts.notifications ? `, ${counts.notifications} unread` : ""}`}>
                  <Bell size={15} aria-hidden="true" />
                  {counts.notifications > 0 && (
                    <span className="absolute -right-0.5 top-0 min-w-4 rounded-full bg-[#ff3b30] px-1 text-center text-[10px] font-bold leading-4 text-white">{counts.notifications > 99 ? "99+" : counts.notifications}</span>
                  )}
                </Link>
                <span className="hidden px-2 lg:block"><MenuClock /></span>
                <Link href={`/u/${viewer.handle}`} className="ml-1" aria-label="Your profile">
                  <Avatar name={viewer.displayName} seed={viewer.handle} size={24} tier={sparks?.tier.id} />
                </Link>
              </>
            ) : (
              <>
                <Link href="/signin" className="rounded-md px-2.5 py-1 hover:bg-white/15">Sign in</Link>
                <Link href="/signup" className="rounded-md bg-white/20 px-2.5 py-1 hover:bg-white/30">Join Hustera</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Finder-style sidebar */}
      <aside className="glass-panel fixed bottom-24 left-3 top-[52px] z-20 hidden w-60 flex-col rounded-[22px] lg:flex">
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2.5 pb-4 pt-4">
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">Favourites</p>
          <SideNav unreadMessages={counts.messages} moderator={moderator} />
          {viewer && (
            <div className="mt-4">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">You</p>
              <SideNav unreadMessages={counts.messages} moderator={moderator} group="more" />
            </div>
          )}
          {viewer && (
            <div className="mt-4">
              <div className="flex items-center justify-between px-3 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Your Spaces</span>
                <Link href="/communities/new" className="text-xs text-white/60 hover:text-white" aria-label="Create a space">+ New</Link>
              </div>
              {spaces.length ? (
                <ul className="space-y-0.5">{spaces.map((s) => <li key={s.id}><SpaceLink href={`/s/${s.slug}`} label={s.slug} /></li>)}</ul>
              ) : (
                <p className="px-3 text-xs text-muted">Join or create a Space to collaborate with others.</p>
              )}
            </div>
          )}
        </nav>
        {sparks && (
          <Link href="/rewards" className="mx-2.5 mb-2.5 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm hover:bg-white/15">
            <span className="text-white/75">Sparks</span>
            <span className="font-semibold text-mint">{sparks.balance} · {sparks.tier.name}</span>
          </Link>
        )}
      </aside>

      <div className="pt-10 lg:pl-[16.5rem]">
        <main id="main" className="page-in mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6">
          {children}
        </main>
      </div>
      {viewer && <Dock unreadMessages={counts.messages} />}
    </div>
  );
}
