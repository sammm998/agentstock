# Architecture

## Overview

```
Browser ──► Next.js 16 (App Router)
              ├─ Server Components  (read: src/server/*)
              ├─ Server Actions     (write: src/app/actions.ts → src/server/*)
              └─ Route handlers     (/api/account/export)
                     │
                     ▼
              src/server/db.ts  ──►  PGlite (dev/test)  |  Postgres / Supabase (prod)
                     ▲
              packages/domain  (validation, permission matrices, Sparks rules — no I/O)
```

- **Reads** happen in Server Components through service functions that take the viewer id explicitly, so every query is scoped to a principal.
- **Writes** go through Server Actions, which: resolve the session → validate input with zod schemas from `@hustera/domain` → call a service → revalidate. Services raise `UserError` for messages that are safe to show.
- **Authorization** is enforced in the service layer with the matrices in `packages/domain/src/permissions.ts` and in SQL (visibility predicates, membership checks), not in the UI.

## Decisions

### ADR-001 — Next.js + TypeScript monorepo (npm workspaces)
`apps/web` holds the product; `packages/domain` holds pure logic shared by future services (`services/agent-runtime`, `services/finance`) as the spec's monorepo layout grows. npm workspaces keep tooling minimal.

### ADR-002 — Postgres everywhere, embedded in development
The same SQL migrations (`apps/web/src/server/migrations.ts`) run on PGlite (Postgres compiled to WASM) locally and in tests, and on hosted Postgres (Supabase) in production via `DATABASE_URL`. This gives zero-setup development, fast isolated tests, and no SQLite/Postgres drift.

### ADR-003 — First-party sessions instead of Supabase Auth (for Milestone A)
Email + password with scrypt hashing and opaque session tokens (only SHA-256 hashes stored) keeps the app runnable without external accounts. Swapping to Supabase Auth later only changes `src/server/accounts.ts` and `src/server/session.ts`; services already take a user id.
*Consequence:* email verification and password reset need an email provider and are not built yet.

### ADR-004 — App-layer authorization first, RLS as defence-in-depth later
Service functions are the only data access path and are covered by tests. When moving to Supabase with client-side access, add RLS policies mirroring the permission matrix; until then the database is not exposed to clients.

### ADR-005 — Sparks in their own ledger
`rewards_ledger` is append-only with an idempotency key per contribution (`unique (user_id, ref_key)`) and explicit reversal rows. It shares nothing with future money ledgers (`revenue_ledger`, `cost_ledger`, `payments`), which will be separate tables with separate services.

### ADR-006 — No realtime infrastructure yet
Channels and DMs refresh every 5–6 seconds while visible. A real-time event stream (Supabase Realtime or SSE) is planned with the agent task stream in Milestone B.

## Directory guide

| Path | Responsibility |
| --- | --- |
| `src/server/db.ts` | Connection, migrations, transactions |
| `src/server/core.ts` | Password hashing, tokens, rate limits, audit log |
| `src/server/accounts.ts` | Registration, sessions, profiles, export, deletion |
| `src/server/social.ts` | Follows, blocks, posts, likes, comments, reposts, search |
| `src/server/spaces.ts` | Spaces, channels, roles, invites, channel messages |
| `src/server/messages.ts` | Direct messages |
| `src/server/moderation.ts` | Reports, platform actions, appeals |
| `src/server/sparks.ts` | Sparks awards, reversals, summaries |
| `src/server/notifications.ts` | Notifications and unread counts |
