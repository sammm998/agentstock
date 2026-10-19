import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Community guidelines" };

const RULES: [string, string][] = [
  ["Be respectful", "No harassment, bullying, threats or hateful conduct. Disagree with ideas, not people."],
  ["Be genuine", "No fake engagement, spam, sock-puppet accounts or manipulation of Sparks. Don't impersonate people or brands."],
  ["Be honest about money", "Don't promise guaranteed income or “passive income”. Don't promote scams, pyramid schemes, gambling or unlicensed investment offers."],
  ["Respect rights", "Only share content you created or have the right to use. Disclose affiliate links and AI-generated media."],
  ["Keep it legal and safe", "No illegal goods or services, counterfeit products, or content that endangers others. Protect other people's private information."],
  ["Use reports, not retaliation", "If something breaks these rules, report it. Moderators review every report, actions are logged, and you can appeal decisions about your content."],
];

export default function GuidelinesPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Community guidelines" description="Hustera is a place to build together. These rules keep it welcoming and trustworthy." />
      <ol className="space-y-3">
        {RULES.map(([title, text], i) => (
          <li key={title} className="card flex gap-4 p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo/20 text-sm font-bold text-indigo-2">{i + 1}</span>
            <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted">{text}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
