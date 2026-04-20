create table if not exists wrestling.guide_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  status text not null default 'open',
  latest_intent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guide_conversations_status_check check (status in ('open', 'closed'))
);
create index if not exists guide_conversations_user_created_idx
  on wrestling.guide_conversations (user_id, created_at desc);
create index if not exists guide_conversations_session_created_idx
  on wrestling.guide_conversations (session_id, created_at desc);
alter table wrestling.guide_conversations enable row level security;
grant select, insert, update, delete on wrestling.guide_conversations to service_role;
create table if not exists wrestling.guide_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references wrestling.guide_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  intent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint guide_messages_role_check check (role in ('user', 'assistant', 'system'))
);
create index if not exists guide_messages_conversation_created_idx
  on wrestling.guide_messages (conversation_id, created_at asc);
alter table wrestling.guide_messages enable row level security;
grant select, insert, update, delete on wrestling.guide_messages to service_role;
create table if not exists wrestling.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references wrestling.guide_conversations(id) on delete set null,
  session_id text,
  issue_category text not null,
  transcript_summary text not null,
  status text not null default 'open',
  source text not null default 'freco_guide',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_status_check check (status in ('open', 'in_review', 'closed'))
);
create index if not exists support_tickets_status_created_idx
  on wrestling.support_tickets (status, created_at desc);
create index if not exists support_tickets_category_created_idx
  on wrestling.support_tickets (issue_category, created_at desc);
create index if not exists support_tickets_user_created_idx
  on wrestling.support_tickets (user_id, created_at desc);
alter table wrestling.support_tickets enable row level security;
grant select, insert, update, delete on wrestling.support_tickets to service_role;
