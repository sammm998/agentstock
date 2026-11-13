import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Clock } from "lucide-react";
import { GUIDES } from "@/content/guides";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Learn" };

export default function LearnPage() {
  return (
    <>
      <PageHeader title="Learn" description="Short, practical guides for building with the community and with agents." />
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/learn/${g.slug}`} className="card flex h-full flex-col p-5 hover:border-indigo/50">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mint"><BookOpen size={14} aria-hidden="true" />{g.level}</span>
              <h2 className="mt-3 font-semibold">{g.title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted">{g.summary}</p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted"><Clock size={13} aria-hidden="true" />{g.minutes} min read</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
