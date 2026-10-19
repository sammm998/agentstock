"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Briefcase,
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
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/communities", label: "Communities", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/opportunities", label: "Opportunities", icon: Lightbulb },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/rewards", label: "Rewards", icon: Sparkles },
  { href: "/card", label: "Hustera Card", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MODERATION_NAV: NavItem = { href: "/moderation", label: "Moderation", icon: ShieldCheck };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/") || (href === "/communities" && pathname.startsWith("/s/"));
}

export function SideNav({ unreadMessages = 0, moderator = false }: { unreadMessages?: number; moderator?: boolean }) {
  const pathname = usePathname();
  const items = PRIMARY_NAV.map((i) => (i.href === "/messages" ? { ...i, badge: unreadMessages } : i));
  if (moderator) items.push(MODERATION_NAV);
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
                active ? "bg-indigo/20 text-cloud shadow-[inset_0_0_0_1px_rgb(101_88_245/0.45)]" : "text-muted hover:bg-slate-2 hover:text-cloud"
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
