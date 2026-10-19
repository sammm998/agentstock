import type { Metadata } from "next";
import Link from "next/link";
import { RoadmapNotice } from "@/components/roadmap";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Marketplace" };

const CATEGORIES = ["Development", "Web design", "Graphic design", "Copywriting", "Video", "Research", "Automation", "SEO", "Translation", "Virtual assistance", "Courses", "Downloadable products"];

export default function MarketplacePage() {
  return (
    <>
      <PageHeader title="Marketplace" description="Hire freelancers and creators, or offer your own services and products." />
      <RoadmapNotice milestone="E">
        Listings, proposals, contracts, milestones, deliveries and verified reviews are not built yet. Payments will only run through a licensed payment provider — there is no escrow today. Until then, show your work on your <Link href="/settings" className="underline">profile</Link> and connect with people in <Link href="/communities" className="underline">Communities</Link>.
      </RoadmapNotice>
      <h2 className="eyebrow mb-3">Planned categories</h2>
      <ul className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => <li key={c} className="chip px-3 py-1 text-sm">{c}</li>)}
      </ul>
    </>
  );
}
