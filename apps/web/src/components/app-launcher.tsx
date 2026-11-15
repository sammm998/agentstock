"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, BookOpen, CalendarDays, CreditCard, FolderKanban, Lightbulb, MessageCircle, Settings, Sparkles, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import { AgentIcon } from "./visuals";

export interface LauncherApp {
  href: string;
  label: string;
  group: string;
  /** Agent icon key + accent, or a platform icon name. */
  icon: string;
  accent: string;
  platform?: boolean;
}

const PLATFORM_ICONS: Record<string, LucideIcon> = { users: Users, activity: Activity, bulb: Lightbulb, store: Store, folder: FolderKanban, wallet: Wallet, card: CreditCard, book: BookOpen, calendar: CalendarDays, chat: MessageCircle, sparks: Sparkles, settings: Settings };

/** Launchpad-style window: every agent and app, grouped in tabs. */
export function AppLauncher({ apps, groups }: { apps: LauncherApp[]; groups: string[] }) {
  const [tab, setTab] = useState("All");
  const shown = tab === "All" ? apps : apps.filter((a) => a.group === tab);
  return (
    <div>
      <div role="tablist" aria-label="App categories" className="flex gap-1.5 overflow-x-auto border-b border-white/5 px-4 py-3">
        {["All", ...groups].map((g) => (
          <button key={g} role="tab" aria-selected={tab === g} onClick={() => setTab(g)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === g ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
            {g}
          </button>
        ))}
      </div>
      <ul className="grid max-h-[460px] grid-cols-3 gap-x-2 gap-y-5 overflow-y-auto p-5 sm:grid-cols-4 lg:grid-cols-6">
        {shown.map((a) => {
          const Icon = PLATFORM_ICONS[a.icon];
          return (
            <li key={a.href}>
              <Link href={a.href} className="group flex flex-col items-center gap-2 text-center" aria-label={a.label}>
                <span className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110">
                  {a.platform && Icon ? (
                    <span className="icon-tile size-14 rounded-2xl" style={{ color: a.accent }}><Icon size={26} strokeWidth={1.7} aria-hidden="true" /></span>
                  ) : (
                    <AgentIcon icon={a.icon} accent={a.accent} size={56} />
                  )}
                </span>
                <span className="line-clamp-1 text-xs text-white/85">{a.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
