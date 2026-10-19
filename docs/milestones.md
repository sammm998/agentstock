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

## Milestone B — Agent foundation

| Feature | Status | Evidence |
| --- | --- | --- |
| Missions ("Start a business for me", "Sell my existing product") with ownership confirmation | VERIFIED | `test/agents.test.ts`, `e2e/agents.spec.ts` |
| Hustera Core deterministic planner, versioned agent + tool registry | VERIFIED | domain tests |
| Durable task queue in Postgres with dependencies and a checked state machine | VERIFIED | domain + agents tests |
| Traceable agent-to-agent messages (`task_events` with from/to agent) | VERIFIED | agents tests |
| Budget engine: upper-bound reservations, per-task/day/total limits, settle/release | TESTED_SIMULATION | Simulated costs only — no payment provider |
| Approvals (approve-each mode; listing + publishing always need approval) | VERIFIED | agents tests + e2e |
| Pause / resume / stop per mission; platform-wide emergency stop for admins | VERIFIED | agents tests |
| Sandbox tools (research plan, offer outline, launch checklist, listing draft) | TESTED_SIMULATION | Drafts from the user's brief; no web access, no claims |
| Composio capability importer (toolkit listing via `GET /api/v3.1/toolkits`) | NEEDS_CONNECTION | Tested against mocked responses only; needs `COMPOSIO_API_KEY` |
| Publishing to a sales channel | NEEDS_CONNECTION | Tasks block with `CONNECT_REQUIRED` |
| LLM-based planning and live research | NOT_BUILT | |
| Background worker (Trigger.dev) and realtime task stream | NOT_BUILT | Missions advance when the owner presses "Run agents" |

## Later milestones

| Milestone | Scope | Status |
| --- | --- | --- |
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
| Composio | Toolkit inventory implemented; NEEDS_CONNECTION (no key configured, no per-user connections or actions yet) |
| Discord linking | NOT_BUILT (optional) |
