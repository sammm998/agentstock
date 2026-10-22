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
| Password reset (single-use emailed token, 1 h expiry) and sign-in throttling | VERIFIED | services tests; email delivery NEEDS_CONNECTION (`RESEND_API_KEY`), otherwise kept in the outbox |
| Email verification on sign-up | NOT_BUILT | Follows once an email provider is configured |
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
| LLM-based planning and live web research | NOT_BUILT | Planning stays deterministic by design |
| Background worker and realtime task stream | Partially | `POST /api/cron/agents` advances autonomous missions; realtime stream NOT_BUILT |

## Milestone C — Existing product to first test sale

| Feature | Status | Evidence |
| --- | --- | --- |
| Stores with seller-of-record identity shown to buyers | VERIFIED | `test/commerce.test.ts`, `e2e/commerce.spec.ts` |
| Products (digital / physical / service), ownership confirmation, publish rules | VERIFIED | commerce tests |
| Product import from URL with SSRF protection | VERIFIED | commerce + domain tests (mocked network) |
| Checkout: simulated test provider | TESTED_SIMULATION | e2e: guest purchase end to end |
| Checkout: Stripe Checkout (test keys only by default) + signed webhook | NEEDS_CONNECTION | Code complete; needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |
| Digital delivery after payment, EU withdrawal-right consent | VERIFIED | commerce tests + e2e |
| Refunds (Stripe refund API or simulated) | VERIFIED (simulated) | commerce tests + e2e |
| Double-entry ledger, costs, profit, 30 % settlement preview with loss carry-forward | VERIFIED | domain + commerce tests (preview only, nothing collected) |
| Agents publish to the user's Hustera store after approval | VERIFIED | agents tests + e2e |

## Milestone D — AI-created product to first test sale

| Feature | Status | Evidence |
| --- | --- | --- |
| AI product generation step (Anthropic or OpenAI) with budget reservation | NEEDS_CONNECTION | Tested with a mocked model; needs `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` |
| Mandatory human rights & quality review before publishing | VERIFIED | agents tests |
| Generated product goes live and is delivered after test payment | VERIFIED (mocked model) | agents tests |

## Milestone E — Creator / freelance marketplace

| Feature | Status | Evidence |
| --- | --- | --- |
| Service listings with categories, AI-assistance disclosure, pause/resume | VERIFIED | commerce tests + e2e |
| Contracts: request → accept → pay → deliver → revisions → complete | VERIFIED | commerce tests + e2e |
| Reviews only for completed contracts, once per party | VERIFIED | commerce tests + e2e |
| Disputes resolved by moderators (refund or complete) | VERIFIED | commerce tests |
| Payment for contracts | TESTED_SIMULATION | Test checkout; real payouts to sellers need Stripe Connect onboarding and a legal structure (NEEDS_APPROVAL) |

## Milestone F — Composio online business agents

| Feature | Status | Evidence |
| --- | --- | --- |
| Per-user connections (start, confirm, revoke) | NEEDS_CONNECTION | Mocked tests; see `docs/composio.md` |
| Tool execution + "Publish to external store" mission step | NEEDS_CONNECTION | Mocked tests; tool slug configurable |
| Capability inventory incl. auth configs | NEEDS_CONNECTION | integration tests |

## Other milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| G — Social and loyalty | Communities, Sparks, marketplace reviews | VERIFIED (Milestones A + E) |
| H — Browser / desktop | Isolated browsers, Tauri companion | NOT_BUILT — needs a native app and a security review |
| I — Regulated options | Card program, real pooled funding | BLOCKED until licensed partners and legal authorisation |
| Community funding simulator (section 11) | Time-weighted split of imaginary units, clearly labelled | TESTED_SIMULATION |
| Background worker | `POST /api/cron/agents` with `CRON_SECRET` advances autonomous missions | VERIFIED (route), schedule NEEDS_CONNECTION |

## Integration inventory

| Integration | Status |
| --- | --- |
| Postgres / Supabase | Supported via `DATABASE_URL` |
| Email provider | NEEDS_CONNECTION |
| Stripe | Checkout, webhook, refunds implemented; NEEDS_CONNECTION (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) |
| Composio | Inventory, connections and tool execution implemented; NEEDS_CONNECTION — see `docs/composio.md` |
| AI model (Anthropic / OpenAI) | Implemented; NEEDS_CONNECTION (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) |
| Discord linking | NOT_BUILT (optional) |
