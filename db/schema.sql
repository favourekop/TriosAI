create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key,
  email text unique,
  display_name text,
  plan text not null default 'regular' check (plan in ('regular','geek','pro','ekop','premium')),
  timezone text not null default 'Africa/Lagos',
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_type text not null check (event_type in ('chat','file_analysis','image_generation','video_generation','audio_generation')),
  units integer not null default 1 check (units > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_type_date on usage_events(user_id, event_type, created_at desc);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created on messages(conversation_id, created_at);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan text not null check (plan in ('geek','pro','ekop','premium')),
  provider text not null default 'paystack',
  provider_reference text unique,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','refunded')),
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency text not null default 'NGN',
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_status on subscriptions(user_id, status);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Production: enable RLS and add policies before exposing the database through a client.
-- Keep service-role and database credentials server-only.