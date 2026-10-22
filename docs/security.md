# Threat model and permission matrix

## Assets

Account credentials and sessions · private posts and DMs · private Spaces · moderation decisions · Sparks ledger integrity · (future) money, provider credentials and agent budgets.

## Threats and mitigations (Milestone A)

| Threat | Mitigation |
| --- | --- |
| Credential stuffing / brute force | scrypt (N=16384) hashing; constant work on unknown emails; sign-in locked for 15 min after 10 failures per email; *TODO:* per-IP limits at the edge |
| Session theft | 256-bit random tokens, only SHA-256 stored; HTTP-only, SameSite=Lax, Secure cookies; sessions revoked on password change and suspension |
| CSRF | Next.js Server Actions verify Origin; all mutations are Server Actions |
| XSS | React escaping; no `dangerouslySetInnerHTML`; user links use `rel="nofollow noopener noreferrer ugc"` |
| Clickjacking | `X-Frame-Options: DENY` |
| Open redirect after sign-in | `next` parameter restricted to same-site relative paths |
| IDOR on private content | Every read takes the viewer id; SQL visibility predicate checks blocks, privacy and follower status; private Spaces return 404 to non-members |
| Privilege escalation in Spaces | Role matrix in `@hustera/domain`; moderators cannot remove moderators or owners; owners cannot be demoted or removed |
| Spam / abuse | Per-user write rate limits; duplicate report suppression; Sparks caps and idempotent awards; reversal on removal |
| SQL injection | Parameterised queries only; dynamic table names come from fixed whitelists |
| Harassment | Blocks hide content both ways and prevent follows/DMs; reports; appeals |

## Platform permission matrix

| Action | user | moderator | admin |
| --- | :-: | :-: | :-: |
| View / resolve reports, remove content | | ✓ | ✓ |
| Suspend accounts, decide appeals, adjust Sparks | | | ✓ |

## Space permission matrix

| Action | member | moderator | owner |
| --- | :-: | :-: | :-: |
| Read, post in text channels | ✓ | ✓ | ✓ |
| Post announcements, pin, delete any message, manage channels, create invites, view mod log | | ✓ | ✓ |
| Remove members | | members only | ✓ (not owner) |
| Assign moderators, edit / delete Space | | | ✓ |

Source: `packages/domain/src/permissions.ts`, tested in `packages/domain/test` and `apps/web/test`.

## Before production

- Per-IP rate limiting at the edge and email verification on sign-up (needs an email provider).
- Content Security Policy with nonces.
- RLS policies if the database is ever exposed to clients.
- Backups, incident runbook, abuse escalation contacts, age policy.

## Money and integrations (Milestones C–F)

| Threat | Mitigation |
| --- | --- |
| Forged payment confirmations | Orders are marked paid only by the signature-verified Stripe webhook (or the labelled test checkout outside production); events are de-duplicated |
| Accidental live charges | Live Stripe keys are refused unless `HUSTERA_ALLOW_LIVE_PAYMENTS=true` |
| Double booking | `markOrderPaid` is idempotent; every ledger group must balance to zero |
| SSRF via product import | https only, DNS resolution checked against private/link-local ranges, no redirects, 512 KB cap, 6 s timeout |
| Agents acting beyond authority | Approvals, budget reservations and the kill switch run before every tool call; external publishing and store publishing always need approval |
| Cross-user integration access | Composio connections are stored and executed per Hustera user id; users can revoke them |
| Prompt injection into generated products | Generated content is a draft that must pass a human rights & quality review before it can be sold |
| Password reset abuse | Tokens are random, stored hashed, single use, expire in 1 h, max 3 per hour; responses don't reveal whether an email exists |
