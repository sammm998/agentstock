"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  Compass,
  CreditCard,
  FolderKanban,
  Home,
  Lightbulb,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/communities", label: "Community", icon: Users },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/live", label: "Control room", icon: Activity },
  { href: "/opportunities", label: "Opportunities", icon: Lightbulb },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/card", label: "Hustera Card", icon: CreditCard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/events", label: "Events", icon: CalendarDays },
];

const MORE_NAV: NavItem[] = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/store", label: "My store", icon: Briefcase },
  { href: "/rewards", label: "Sparks", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MODERATION_NAV: NavItem = { href: "/moderation", label: "Moderation", icon: ShieldCheck };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/") || (href === "/communities" && pathname.startsWith("/s/"));
}

export function SideNav({ unreadMessages = 0, moderator = false, group = "primary" }: { unreadMessages?: number; moderator?: boolean; group?: "primary" | "more" | "all" }) {
  const pathname = usePathname();
  const base = group === "primary" ? PRIMARY_NAV : group === "more" ? MORE_NAV : [...PRIMARY_NAV, ...MORE_NAV];
  const items = base.map((i) => (i.href === "/messages" ? { ...i, badge: unreadMessages } : i));
  if (moderator && group !== "primary") items.push(MODERATION_NAV);
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-white/20 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25)]" : "text-cloud/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? <span className="rounded-full bg-mint px-1.5 text-[11px] font-bold text-midnight">{item.badge}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SpaceLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm ${active ? "bg-slate-2 text-cloud" : "text-muted hover:bg-slate-2 hover:text-cloud"}`}
    >
      <span className="text-muted" aria-hidden="true">
        #
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

const MOBILE: NavItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/communities", label: "Spaces", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/menu", label: "More", icon: Menu },
];

export function MobileNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-midnight/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {MOBILE.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-cloud" : "text-muted"}`}>
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" className={active ? "text-mint" : undefined} />
                {item.label}
                {item.href === "/messages" && unreadMessages > 0 && <span className="absolute right-[30%] top-1.5 h-2 w-2 rounded-full bg-mint" aria-label={`${unreadMessages} unread`} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface DockApp {
  href: string;
  label: string;
  icon: LucideIcon;
  from: string;
  to: string;
  mobile?: boolean;
}

const DOCK: (DockApp | "sep")[] = [
  { href: "/home", label: "Home", icon: Home, from: "#5ac8fa", to: "#007aff", mobile: true },
  { href: "/communities", label: "Community", icon: Users, from: "#ffcc4d", to: "#ff9500" },
  { href: "/agents", label: "AI Agents", icon: Bot, from: "#a78bfa", to: "#6558f5", mobile: true },
  { href: "/live", label: "Control room", icon: Activity, from: "#4ef2c2", to: "#0a9f7a", mobile: true },
  { href: "/opportunities", label: "Opportunities", icon: Lightbulb, from: "#ffe066", to: "#f5a623" },
  { href: "/marketplace", label: "Marketplace", icon: Store, from: "#ff8a8a", to: "#ff3b5c" },
  { href: "/projects", label: "Projects", icon: FolderKanban, from: "#7dd3fc", to: "#2563eb", mobile: true },
  { href: "/wallet", label: "Wallet", icon: Wallet, from: "#34d399", to: "#047857", mobile: true },
  { href: "/card", label: "Hustera Card", icon: CreditCard, from: "#3b3b4f", to: "#0f0f1a" },
  { href: "/learn", label: "Learn", icon: BookOpen, from: "#fb923c", to: "#ea580c" },
  { href: "/events", label: "Events", icon: CalendarDays, from: "#f87171", to: "#dc2626" },
  "sep",
  { href: "/messages", label: "Messages", icon: MessageCircle, from: "#6ee76e", to: "#22a722" },
  { href: "/store", label: "My store", icon: Briefcase, from: "#c4b5fd", to: "#7c3aed" },
  { href: "/rewards", label: "Sparks", icon: Sparkles, from: "#fde68a", to: "#d97706" },
  { href: "/settings", label: "Settings", icon: Settings, from: "#9ca3af", to: "#4b5563" },
  { href: "/menu", label: "More", icon: Menu, from: "#9ca3af", to: "#4b5563", mobile: true },
];

/** macOS-style dock: the main way around the signed-in app on every screen size. */
export function Dock({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dock" className="fixed inset-x-0 bottom-2 z-40 flex justify-center px-2 pb-[env(safe-area-inset-bottom)] sm:bottom-3">
      <ul className="glass-panel flex items-end gap-1.5 rounded-[22px] px-2 pb-2 pt-2 sm:gap-2 sm:px-3">
        {DOCK.map((app, i) => {
          if (app === "sep") return <li key={`sep-${i}`} aria-hidden="true" className="mx-1 hidden h-10 w-px self-center bg-white/25 lg:block" />;
          const active = isActive(pathname, app.href);
          const Icon = app.icon;
          return (
            <li key={app.href} className={`dock-item relative ${app.mobile ? "" : "hidden lg:block"} ${app.href === "/menu" ? "lg:hidden" : ""}`}>
              <Link href={app.href} aria-current={active ? "page" : undefined} aria-label={app.label} className="block">
                <span className="app-icon flex size-11 items-center justify-center rounded-[12px] text-white sm:size-12 sm:rounded-[13px]" style={{ background: `linear-gradient(160deg, ${app.from}, ${app.to})` }}>
                  <Icon size={22} strokeWidth={2} aria-hidden="true" />
                </span>
                {app.href === "/messages" && unreadMessages > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#ff3b30] px-1 text-center text-[11px] font-bold leading-5 text-white">{unreadMessages}</span>}
              </Link>
              <span className="dock-tip pointer-events-none absolute -top-9 left-1/2 hidden whitespace-nowrap rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur lg:block">{app.label}</span>
              <span aria-hidden="true" className={`absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white/90 ${active ? "" : "opacity-0"}`} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
