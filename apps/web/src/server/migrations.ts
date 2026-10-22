/**
 * Ordered, append-only schema migrations. They run on both the embedded
 * PGlite database and on a hosted Postgres (e.g. Supabase). Never edit a
 * migration that has shipped; add a new one instead.
 */
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_social_skeleton",
    sql: /* sql */ `
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  platform_role text not null default 'user' check (platform_role in ('user','moderator','admin')),
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index users_email_key on users (lower(email));

create table profiles (
  user_id uuid primary key references users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text not null default '' check (char_length(bio) <= 280),
  location text not null default '' check (char_length(location) <= 60),
  website text check (website is null or char_length(website) <= 200),
  kind text not null default 'personal' check (kind in ('personal','creator','freelancer','business')),
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on sessions (user_id);

create table follows (
  follower_id uuid not null references users(id) on delete cascade,
  followee_id uuid not null references users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','pending')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on follows (followee_id, status);

create table blocks (
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) <= 1000),
  visibility text not null default 'public' check (visibility in ('public','followers')),
  repost_of uuid references posts(id) on delete cascade,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  check (char_length(body) >= 1 or repost_of is not null)
);
create index posts_author_idx on posts (author_id, created_at desc);
create index posts_created_idx on posts (created_at desc);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag)
);
create index post_tags_tag_idx on post_tags (tag);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index comments_post_idx on comments (post_id, created_at);

create table likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table saves (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  actor_id uuid references users(id) on delete cascade,
  kind text not null check (kind in ('follow','follow_request','like','comment','mention','repost','space_invite','dm','moderation','sparks')),
  post_id uuid references posts(id) on delete cascade,
  space_id uuid,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null check (char_length(name) between 3 and 48),
  description text not null default '' check (char_length(description) <= 280),
  visibility text not null default 'public' check (visibility in ('public','private')),
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table space_members (
  space_id uuid not null references spaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create index space_members_user_idx on space_members (user_id);

create table space_invites (
  code text primary key,
  space_id uuid not null references spaces(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  max_uses int not null default 25 check (max_uses between 1 and 1000),
  uses int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9-]{2,32}$'),
  topic text not null default '' check (char_length(topic) <= 120),
  kind text not null default 'text' check (kind in ('text','announcements')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (space_id, name)
);

create table channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references channels(id) on delete cascade,
  author_id uuid references users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  pinned boolean not null default false,
  removed_at timestamptz,
  removed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index channel_messages_channel_idx on channel_messages (channel_id, created_at desc);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on conversation_members (user_id);

create table direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index direct_messages_conv_idx on direct_messages (conversation_id, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete set null,
  target_type text not null check (target_type in ('post','comment','user','channel_message','space','rewards_entry')),
  target_id uuid not null,
  reason text not null,
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_by uuid references users(id) on delete set null,
  resolution_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on reports (status, created_at);

create table moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  subject_user_id uuid references users(id) on delete cascade,
  scope text not null check (scope in ('platform','space')),
  space_id uuid references spaces(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index moderation_actions_space_idx on moderation_actions (space_id, created_at desc);
create index moderation_actions_subject_idx on moderation_actions (subject_user_id);

create table appeals (
  id uuid primary key default gen_random_uuid(),
  moderation_action_id uuid not null references moderation_actions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'open' check (status in ('open','upheld','overturned')),
  decided_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (moderation_action_id, user_id)
);

-- Sparks: non-cash loyalty points. Kept entirely separate from any money ledger.
create table rewards_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  rule_id text not null,
  amount int not null check (amount <> 0 and amount between -1000 and 1000),
  reason text not null,
  ref_key text not null,
  reverses_id uuid references rewards_ledger(id),
  created_at timestamptz not null default now(),
  unique (user_id, ref_key)
);
create index rewards_ledger_user_idx on rewards_ledger (user_id, created_at desc);

create table audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references users(id) on delete set null,
  action text not null,
  target text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
`,
  },
  {
    id: "002_agent_foundation",
    sql: /* sql */ `
create table missions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('start_business','sell_existing')),
  title text not null check (char_length(title) between 3 and 80),
  brief text not null check (char_length(brief) between 10 and 2000),
  region text not null,
  mode text not null default 'approve_each' check (mode in ('approve_each','autonomous')),
  status text not null default 'active' check (status in ('active','paused','blocked','completed','stopped')),
  status_reason text not null default '',
  ownership_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index missions_owner_idx on missions (owner_id, created_at desc);

-- Agent budgets are test-mode only: simulated = true until a payment provider is connected.
create table budgets (
  mission_id uuid primary key references missions(id) on delete cascade,
  currency text not null default 'EUR',
  total_cents int not null check (total_cents >= 0),
  per_day_cents int not null check (per_day_cents >= 0),
  per_task_cents int not null check (per_task_cents >= 0),
  simulated boolean not null default true
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  key text not null,
  seq int not null,
  agent_id text not null,
  tool_id text not null,
  tool_version int not null,
  title text not null,
  depends_on text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued','awaiting_approval','running','succeeded','failed','blocked','cancelled')),
  status_reason text not null default '',
  requires_approval boolean not null default false,
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, key)
);
create index tasks_mission_idx on tasks (mission_id, seq);

create table task_events (
  id bigint generated always as identity primary key,
  mission_id uuid not null references missions(id) on delete cascade,
  task_id uuid references tasks(id) on delete cascade,
  actor text not null check (actor in ('user','agent','system')),
  from_agent text,
  to_agent text,
  kind text not null,
  message text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index task_events_mission_idx on task_events (mission_id, id);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  decision text check (decision in ('approved','rejected')),
  decided_by uuid references users(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index approvals_task_idx on approvals (task_id);

create table budget_reservations (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  amount_cents int not null check (amount_cents >= 0),
  settled_cents int,
  status text not null default 'held' check (status in ('held','settled','released')),
  simulated boolean not null default true,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index budget_reservations_mission_idx on budget_reservations (mission_id, created_at);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  kind text not null,
  title text not null,
  content text not null,
  simulated boolean not null default true,
  created_at timestamptz not null default now()
);
create index artifacts_mission_idx on artifacts (mission_id, created_at);

create table platform_flags (
  key text primary key,
  value boolean not null,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now()
);
`,
  },
  {
    id: "003_commerce_marketplace",
    sql: /* sql */ `
-- The store owner is the seller of record for every product in their store.
create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null,
  description text not null default '',
  seller_legal_name text not null,
  seller_country text not null check (char_length(seller_country) = 2),
  support_email text not null,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null,
  kind text not null check (kind in ('digital','physical','service')),
  price_cents int not null check (price_cents between 100 and 1000000),
  currency text not null default 'EUR',
  delivery_content text not null default '',
  status text not null default 'draft' check (status in ('draft','active','archived')),
  ownership_confirmed boolean not null default false,
  source text not null default 'manual' check (source in ('manual','url_import','agent')),
  source_url text,
  mission_id uuid references missions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or ownership_confirmed)
);
create index products_store_idx on products (store_id, status);

create table orders (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'product' check (kind in ('product','contract')),
  product_id uuid references products(id) on delete set null,
  contract_id uuid,
  seller_id uuid references users(id) on delete set null,
  buyer_id uuid references users(id) on delete set null,
  buyer_email text not null,
  title text not null,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'EUR',
  status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled')),
  provider text not null check (provider in ('stripe','test')),
  provider_session_id text unique,
  provider_payment_id text,
  fee_cents int,
  simulated boolean not null,
  access_token text not null unique,
  withdrawal_waiver boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
create index orders_seller_idx on orders (seller_id, created_at desc);
create index orders_buyer_idx on orders (buyer_id, created_at desc);

create table payment_events (
  provider text not null,
  event_id text not null,
  type text not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- Double-entry ledger for real business money. Separate from Sparks and from agent test budgets.
create table ledger_entries (
  id bigint generated always as identity primary key,
  owner_id uuid not null references users(id) on delete cascade,
  entry_group uuid not null,
  account text not null,
  amount_cents int not null,
  order_id uuid references orders(id) on delete set null,
  memo text not null default '',
  simulated boolean not null,
  created_at timestamptz not null default now()
);
create index ledger_owner_idx on ledger_entries (owner_id, created_at);
create index ledger_group_idx on ledger_entries (entry_group);

create table services (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 100),
  description text not null,
  category text not null,
  price_cents int not null check (price_cents between 500 and 1000000),
  delivery_days int not null check (delivery_days between 1 and 90),
  revisions int not null default 1 check (revisions between 0 and 10),
  ai_assisted boolean not null default false,
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now()
);
create index services_category_idx on services (category, created_at desc);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete set null,
  buyer_id uuid references users(id) on delete set null,
  seller_id uuid references users(id) on delete set null,
  title text not null,
  price_cents int not null,
  delivery_days int not null,
  revisions_allowed int not null,
  revisions_used int not null default 0,
  requirements text not null,
  status text not null default 'requested' check (status in ('requested','accepted','in_progress','delivered','completed','cancelled','disputed')),
  delivery text,
  dispute_reason text,
  resolution text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_buyer_idx on contracts (buyer_id);
create index contracts_seller_idx on contracts (seller_id);

create table contract_events (
  id bigint generated always as identity primary key,
  contract_id uuid not null references contracts(id) on delete cascade,
  actor_id uuid references users(id) on delete set null,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Reviews are only possible for completed contracts, once per party.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  subject_id uuid not null references users(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (contract_id, author_id)
);

alter table missions add column price_cents int not null default 900 check (price_cents between 100 and 1000000);
alter table missions add column external_channel boolean not null default false;

alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in ('follow','follow_request','like','comment','mention','repost','space_invite','dm','moderation','sparks','order','contract'));

create table connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('composio')),
  toolkit text not null,
  external_id text,
  status text not null default 'pending' check (status in ('pending','active','failed','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, toolkit)
);
`,
  },
  {
    id: "004_account_security",
    sql: /* sql */ `
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index audit_events_action_target_idx on audit_events (action, target, created_at);
`,
  },
];
