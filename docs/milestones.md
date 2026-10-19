# Milestones and feature status

Statuses: `VERIFIED` (built and covered by automated tests) · `TESTED_SIMULATION` · `NEEDS_CONNECTION` · `NEEDS_APPROVAL` · `BLOCKED` · `NOT_BUILT`.

## Milestone A — Brand and social skeleton

| Feature | Status | Evidence |
| --- | --- | --- |
| Design system, logo, tokens, responsive layout, mobile bottom nav | VERIFIED | `e2e/mobile.spec.ts` (no horizontal overflow) |
| Sign up / sign in / sign out / password change | VERIFIED | `test/services.test.ts`, `e2e/social.spec.ts` |
| Profiles, kinds, private accounts, follow requests | VERIFIED | services tests |
| Follow, block, visibility rules | VERIFIED | services tests |
| Posts, tags, mentions, likes, comments, reposts, saves | VERIFIED | services + e2e |
| Discover search (people, posts, Spaces, tags) | VERIFIED | services tests (people, tag feed) |
| Direct messages | VERIFIED | services + e2e |
| Spaces, channels, roles, invites, pins, mod log | VERIFIED | services + e2e |
| Reports, moderation queue, appeals | VERIFIED | services + e2e |
| Sparks earning rules, caps, reversals, ledger, disputes | VERIFIED | domain + services + e2e |
| Data export and account deletion | VERIFIED | services + e2e |
| Email verification, password reset | NEEDS_CONNECTION | Requires an email provider |
| Media uploads (images/video in posts) | NOT_BUILT | Needs object storage + scanning |
| Realtime push for chat | NOT_BUILT | Polling every 5–6 s today |

## Later milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| B — Agent foundation | Hustera Core, agent registry, durable queue, budget engine, Composio importer | NOT_BUILT (registry shown as plan) |
| C — Existing product to first test sale | Product import, storefront, Stripe test checkout, refunds, ledgers | NOT_BUILT |
| D — AI-created product to first test sale | Research, generation, rights/QA, storefront | NOT_BUILT |
| E — Creator / freelance marketplace | Listings, proposals, contracts, deliveries, reviews | NOT_BUILT |
| F — Composio online business agents | End-to-end agent workflows | NOT_BUILT |
| G — Social and loyalty | Richer communities, creator monetisation | Partially (Sparks live) |
| H — Browser / desktop | Isolated browsers, Tauri companion | NOT_BUILT |
| I — Regulated options | Card program, pooled funding | BLOCKED until licensed partners and legal authorisation |

## Integration inventory

| Integration | Status |
| --- | --- |
| Postgres / Supabase | Supported via `DATABASE_URL` |
| Email provider | NEEDS_CONNECTION |
| Stripe | NOT_BUILT |
| Composio | NOT_BUILT — must enumerate real toolkits/actions before claiming any capability |
| Discord linking | NOT_BUILT (optional) |
