# hustera

**Build together. Earn independently.**

Hustera (working name) is a community-first home for creators, freelancers and AI business agents. This repository contains **Milestone A — brand and social skeleton** (a working social network with communities, messaging, moderation and the non-cash Sparks loyalty system) and **Milestone B — agent foundation** (missions run by Hustera Core with approvals, budget limits and an emergency stop, using sandbox tools in test mode). It also includes **Milestones C–F**: stores and checkout, a double-entry ledger, AI-created products, a freelance marketplace and a Composio client that is ready for keys. The Hustera Card and pooled funding remain concepts, labelled that way in the product.

![Hustera home feed](docs/screenshots/home.png)

<sub>Screenshots use demo accounts created locally — names and posts are illustrative, not real members.</sub>

| Landing | Space channel | Sparks | Mobile |
| --- | --- | --- | --- |
| ![](docs/screenshots/landing.png) | ![](docs/screenshots/channel.png) | ![](docs/screenshots/rewards.png) | ![](docs/screenshots/mobile-home.png) |

## What works today

| Area | Status |
| --- | --- |
| Accounts: sign up, sign in, sessions, password change, data export, account deletion | Live |
| Profiles: personal / creator / freelancer / business, bio, website, private accounts | Live |
| Social graph: follow, follow requests for private accounts, block | Live |
| Posts: public / followers-only, #tags, @mentions, likes, comments, reposts, saves | Live |
| Discover: people, posts, Spaces and topic search (recency-ordered, no paid placement) | Live |
| Spaces: public / private communities, channels, announcements, roles, invites, pins, moderation log | Live |
| Direct messages with unread tracking | Live |
| Notifications | Live |
| Trust & safety: reports, moderation queue, removals, suspensions, appeals, rate limits | Live |
| Sparks: published earning rules, daily caps, reversals, ledger, recognition tiers, disputes | Live |
| Agent foundation: missions, Hustera Core planner, task queue, approvals, budget engine (test mode), kill switch | Live (sandbox tools produce drafts only) |
| Stores, products, URL import, checkout, digital delivery, refunds | Live (test checkout; Stripe needs keys) |
| Wallet: double-entry ledger, costs, profit and 30 % fee preview | Live (preview only, nothing collected) |
| AI-created products with mandatory rights review | Needs `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| Marketplace: services, contracts, deliveries, revisions, disputes, verified reviews | Live (test checkout) |
| Composio: inventory, per-user connections, external publishing | Prepared — needs keys, see [docs/composio.md](docs/composio.md) |
| Desktop companion, Hustera Card, pooled funding | Not built / blocked by design |

See [docs/milestones.md](docs/milestones.md) for the full status table.

## Quick start

Requires Node.js 22.12+.

```bash
npm install
npm run dev          # http://localhost:3000
```

No external services are needed. In development the app uses an embedded Postgres (PGlite) stored in `apps/web/.data/`. To make yourself an admin (access to `/moderation`), set `HUSTERA_ADMIN_EMAILS` before signing up:

```bash
HUSTERA_ADMIN_EMAILS=you@example.com npm run dev
```

## Tests

```bash
npm run typecheck
npm test             # domain unit tests + service integration tests (in-memory Postgres)
npm run build
npm run test:e2e     # Playwright: desktop + mobile flows against a production build
```

If Playwright's bundled Chromium isn't installed, point it at an existing one with `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

## Configuration

All integrations are optional and off by default — see [`apps/web/.env.example`](apps/web/.env.example). Without keys the app runs fully with a clearly labelled simulated checkout (outside production) and blocks AI/Composio steps with `CONNECT_REQUIRED`.

## Deploying

1. Create a Postgres database (e.g. Supabase). Set `DATABASE_URL` to its connection string. Migrations run automatically on first request.
2. Set `HUSTERA_ADMIN_EMAILS` for the first admins.
3. Optional: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` (point a Stripe webhook at `/api/stripe/webhook` for `checkout.session.completed`), an AI key, Composio keys, and `CRON_SECRET` with a scheduler calling `POST /api/cron/agents`.
4. `npm run build && npm start` (or deploy `apps/web` to any Node host that supports Next.js).

Sessions use secure, HTTP-only cookies in production, so serve over HTTPS.

## Repository layout

```
apps/web            Next.js 16 app (App Router, Server Actions, Tailwind v4)
  src/app           Routes and server actions
  src/components    Design-system components
  src/server        Data access, auth, and domain services (server-only)
  test/             Service integration tests (Vitest + in-memory Postgres)
  e2e/              Playwright end-to-end tests
packages/domain     Pure TypeScript: validation, permission matrices, Sparks rules, registries
docs/               Brand, architecture, data model, threat model, compliance and milestones
```

## Honesty rules

Hustera never shows invented members, revenue, ratings, testimonials or income forecasts. Sparks are not money. The Hustera Card is a concept. Every feature carries a status: `VERIFIED`, `TESTED_SIMULATION`, `NEEDS_CONNECTION`, `NEEDS_APPROVAL`, `BLOCKED` or `NOT_BUILT`.
