# Threat model and permission matrix

## Assets

Account credentials and sessions · private posts and DMs · private Spaces · moderation decisions · Sparks ledger integrity · (future) money, provider credentials and agent budgets.

## Threats and mitigations (Milestone A)

| Threat | Mitigation |
| --- | --- |
| Credential stuffing / brute force | scrypt (N=16384) hashing; constant work on unknown emails; *TODO:* login rate limiting by IP |
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

- Login and sign-up rate limiting per IP, email verification and password reset (needs an email provider).
- Content Security Policy with nonces.
- RLS policies if the database is ever exposed to clients.
- Backups, incident runbook, abuse escalation contacts, age policy.
