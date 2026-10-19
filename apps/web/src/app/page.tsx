import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Bot, CreditCard, Sparkles, TrendingUp, Users } from "lucide-react";
import { getViewer } from "@/server/session";
import { LogoMark, Wordmark } from "@/components/brand";
import { StatusBadge } from "@/components/ui";
import type { FeatureStatus } from "@hustera/domain";

const PILLARS: { icon: typeof Users; title: string; text: string; status: FeatureStatus }[] = [
  { icon: Users, title: "Community", text: "Profiles, posts and Discord-style Spaces with channels, roles and moderation.", status: "VERIFIED" },
  { icon: Sparkles, title: "Sparks", text: "Loyalty points for genuine contributions. No cash value, never sold.", status: "VERIFIED" },
  { icon: Bot, title: "AI Agents", text: "Hustera Core and specialist agents that work within your budget and approvals.", status: "NOT_BUILT" },
  { icon: TrendingUp, title: "Earn & Grow", text: "Sell existing products or start new ones, tracked with verified results.", status: "NOT_BUILT" },
  { icon: CreditCard, title: "Hustera Card", text: "A design concept only. Not a payment card.", status: "NOT_BUILT" },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getViewer()) redirect("/home");
  const { deleted } = await searchParams;

  return (
    <div className="aurora min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark size={30} />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/discover" className="btn-ghost hidden sm:inline-flex">
            Explore
          </Link>
          <Link href="/signin" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary">
            Join
          </Link>
        </nav>
      </header>

      <main id="main">
        {deleted && (
          <p role="status" className="mx-auto mt-2 max-w-6xl px-6 text-sm text-mint">
            Your account and personal data have been deleted.
          </p>
        )}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
          <div>
            <p className="chip border-indigo/40 bg-indigo/10 text-[#c9c4ff]">Community-first · People and AI agents</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              <span className="text-gradient">Build together.</span>
              <br />
              Earn independently.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Hustera is where creators, freelancers and AI enthusiasts connect, share what they&apos;re building and collaborate — from people and ideas to real businesses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base">
                Join the community <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/discover" className="btn-secondary px-6 py-3 text-base">
                Explore posts
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted">Free to join. No subscription. We never promise income.</p>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-8 rounded-full bg-indigo/30 blur-3xl" aria-hidden="true" />
            <div className="absolute inset-20 rounded-full bg-mint/20 blur-3xl" aria-hidden="true" />
            <div className="card relative flex h-full flex-col items-center justify-center gap-6 rounded-[32px] p-10">
              <LogoMark size={160} />
              <p className="text-center text-sm text-muted">Two pathways — a person and an AI agent — joined by a rising bridge and a creative spark.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6" aria-labelledby="pillars">
          <h2 id="pillars" className="eyebrow mb-4">
            What&apos;s inside — and what&apos;s live today
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map(({ icon: Icon, title, text, status }) => (
              <li key={title} className="card flex flex-col p-5">
                <Icon className="text-indigo-2" size={26} strokeWidth={1.7} aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{text}</p>
                <div className="mt-4">
                  <StatusBadge status={status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted sm:px-6">
          <span>© {new Date().getFullYear()} Hustera (working name)</span>
          <nav className="flex gap-4" aria-label="Legal">
            <Link href="/brand" className="hover:text-cloud">
              Brand
            </Link>
            <Link href="/legal/guidelines" className="hover:text-cloud">
              Community guidelines
            </Link>
            <Link href="/legal/sparks" className="hover:text-cloud">
              Sparks terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
