export interface Guide {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: "Start here" | "Selling" | "Agents" | "Rules";
  body: string;
}

/** Hustera's own learning guides. Practical, no income promises. */
export const GUIDES: readonly Guide[] = [
  {
    slug: "how-hustera-works",
    title: "How Hustera works",
    summary: "Community, agents, your store and your wallet — and how they fit together.",
    minutes: 4,
    level: "Start here",
    body: `# How Hustera works

Hustera is a community where people and AI agents build real businesses together.

## The pieces
- **Community:** follow people, post updates, join Spaces with channels and get help.
- **AI agents:** start a mission and an agent does the groundwork — research, offer, listing, publishing, promotion.
- **Your store:** products are sold from your own Hustera store. You are the seller.
- **Wallet:** every real sale, refund and cost is recorded in a double-entry ledger.
- **Sparks:** reward points for contributing to the community. They have no cash value.

## You stay in control
Agents run inside a budget you set. Anything public — publishing a product, posting, sending — waits for your approval. You can pause or stop a mission at any time.`,
  },
  {
    slug: "first-digital-product",
    title: "Sell your first digital product",
    summary: "From idea to a live product page with EcomPro, step by step.",
    minutes: 6,
    level: "Selling",
    body: `# Sell your first digital product

## 1. Pick something you can make well
A checklist, template, planner or short guide that solves one specific problem for one specific group of people.

## 2. Create your store
Store → fill in your seller name, country and support email. Buyers see these details.

## 3. Start EcomPro
AI Agents → EcomPro → Use Agent. Describe the product honestly, set a price and paste the download link buyers get after paying.

## 4. Approve the important steps
EcomPro drafts research, an offer, a launch checklist and a listing. You approve the listing, publishing and the announcement post.

## 5. Share and learn
Post in relevant Spaces, ask for feedback and watch the Results card on your mission. Improve the product based on what buyers say.`,
  },
  {
    slug: "pricing-unit-economics",
    title: "Pricing and unit economics",
    summary: "Know what you keep from every sale before you spend on ads.",
    minutes: 5,
    level: "Selling",
    body: `# Pricing and unit economics

For every sale, write down:

| Line | Example |
| --- | --- |
| Price (incl. VAT) | €9.00 |
| VAT | depends on the buyer's country |
| Payment fees | ~1.5 % + €0.25 |
| Cost of goods | €0 for digital |
| Acquisition cost | what you spend to get one buyer |

- Test at least two prices.
- Don't pay for ads until each sale leaves a positive margin.
- Record costs in your Wallet so profit is calculated correctly.`,
  },
  {
    slug: "agents-safely",
    title: "Working with AI agents safely",
    summary: "Budgets, approvals, rights and what agents will never do for you.",
    minutes: 4,
    level: "Agents",
    body: `# Working with AI agents safely

- **Budgets:** every step reserves its maximum cost first. When a limit would be exceeded, the mission pauses.
- **Approvals:** publishing, posting and external actions always wait for you.
- **Rights:** AI-generated products need your rights & quality review. Don't sell content that copies other people's work.
- **Honesty:** never claim guaranteed results or income in your listings.
- **Stop button:** pause or stop any mission; admins can stop all agents at once.`,
  },
  {
    slug: "eu-selling-rules",
    title: "EU selling rules — an overview",
    summary: "Seller identity, withdrawal rights, VAT and product safety in plain words.",
    minutes: 6,
    level: "Rules",
    body: `# EU selling rules — an overview

_Not legal advice. Check with an adviser for your situation._

- **Who sells:** show your name or company, country and a contact address.
- **Prices:** show the total price including VAT before payment.
- **Withdrawal:** consumers usually have 14 days to cancel. For digital content delivered immediately, ask for explicit consent that the right ends when delivery starts.
- **VAT:** digital sales to consumers in other EU countries generally use the buyer's VAT rate (OSS).
- **Product safety:** physical goods need safety information and an EU responsible person.
- **Marketing:** claims must be true; disclose affiliate links and AI-generated media where required.`,
  },
  {
    slug: "community-etiquette",
    title: "Growing in the community",
    summary: "How to get help, give help and build an audience without spam.",
    minutes: 3,
    level: "Start here",
    body: `# Growing in the community

- Share what you're building, including what didn't work.
- Answer questions in Spaces — it earns Sparks and trust.
- Use #tags so people interested in a topic can find you.
- Promote your products in your own feed and in channels where it's welcome — not in DMs to strangers.
- Report spam and scams; moderators review every report.`,
  },
];
