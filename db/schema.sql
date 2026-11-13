create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table usage_events enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table subscriptions enable row level security;
alter table payment_events enable row level security;
alter table admin_audit_log enable row level security;

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile" on profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users read own usage" on usage_events;
create policy "Users read own usage" on usage_events for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users manage own conversations" on conversations;
create policy "Users manage own conversations" on conversations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage messages in own conversations" on messages;
create policy "Users manage messages in own conversations" on messages for all to authenticated
using (exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()))
with check (exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()));

drop policy if exists "Users read own subscriptions" on subscriptions;
create policy "Users read own subscriptions" on subscriptions for select to authenticated using (user_id = auth.uid());

-- Payment events and audit records are server-only: no client policies are granted.
revoke all on payment_events, admin_audit_log from anon, authenticated;
grant select, update on profiles to authenticated;
grant select on usage_events, subscriptions to authenticated;
grant select, insert, update, delete on conversations, messages to authenticated;

-- Never expose a service-role key in the browser.