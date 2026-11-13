import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { GUIDES } from "@/content/guides";
import { Markdown } from "@/components/markdown";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: GUIDES.find((g) => g.slug === slug)?.title ?? "Learn" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/learn" className="btn-ghost btn-sm -ml-2"><ArrowLeft size={15} aria-hidden="true" /> Learn</Link>
      <article className="card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-mint">{guide.level} · {guide.minutes} min</p>
        <div className="mt-3"><Markdown source={guide.body} /></div>
      </article>
    </div>
  );
}
