# Data model (Milestone A)

Source of truth: `apps/web/src/server/migrations.ts`. All tables use UUID keys and `timestamptz`.

| Table | Purpose | Tenant / ownership |
| --- | --- | --- |
| `users` | Credentials, platform role, suspension | Self |
| `profiles` | Public identity: handle, name, bio, kind, privacy | `user_id` |
| `sessions` | Hashed session tokens with expiry | `user_id` |
| `follows` | Directed follow edges, `active` or `pending` | `follower_id` → `followee_id` |
| `blocks` | Directed blocks (hide both ways) | `blocker_id` |
| `posts` | Posts and reposts (`repost_of`), soft-removal by moderation | `author_id` |
| `post_tags` | Normalised #tags | via post |
| `comments`, `likes`, `saves` | Engagement | `author_id` / `user_id` |
| `notifications` | Per-user inbox | `user_id` |
| `spaces` | Communities, public or private | `owner_id` |
| `space_members` | Membership + role (`owner`/`moderator`/`member`) | `(space_id, user_id)` |
| `space_invites` | Expiring, use-limited invite codes | `space_id` |
| `channels` | Text / announcement channels | `space_id` |
| `channel_messages` | Channel messages, pins, removals | `channel_id`, `author_id` |
| `conversations`, `conversation_members`, `direct_messages` | 1:1 DMs with read markers | members |
| `reports` | User reports against any target type | `reporter_id` |
| `moderation_actions` | Platform- and space-scoped actions with subject user | `actor_id`, `subject_user_id`, `space_id` |
| `appeals` | One appeal per action per user | `user_id` |
| `rewards_ledger` | Sparks awards and reversals (non-cash) | `user_id` |
| `audit_events` | Security-relevant events | `actor_id` |

## Deletion semantics

Deleting an account cascades to profile, sessions, posts, comments, likes, saves, follows, blocks, notifications, DMs and Sparks. Spaces the user owned transfer to the longest-serving moderator (or earliest member), or are deleted if empty. Channel messages are anonymised (`[deleted]`) to keep conversations coherent. Reports filed by the user keep the report but drop the reporter (`set null`).

## Planned entities (later milestones)

`listings, gigs, contracts, products, stores, connected_accounts, agents, agent_capabilities, missions, tasks, task_events, approvals, budgets, budget_reservations, payments, refunds, revenue_ledger, cost_ledger, commission_settlements, community_simulations, simulation_participations, compliance_decisions, artifacts` — each with explicit owner/tenant columns.
