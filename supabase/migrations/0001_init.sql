create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('none','active','canceled','past_due');
  end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status membership_status not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  started_at timestamptz,
  canceled_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  total_cents int not null,
  items jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.loyalty_stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  receipt_id uuid references receipts(id) on delete set null,
  stamps int not null check (stamps > 0),
  created_at timestamptz default now()
);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reward text not null,
  stamps_spent int not null,
  created_at timestamptz default now()
);

create table if not exists public.community_monthly (
  month date primary key,
  goal_cents int not null,
  created_at timestamptz default now()
);

create table if not exists public.community_ledger (
  id uuid primary key default gen_random_uuid(),
  month date not null references community_monthly(month) on delete cascade,
  source text not null,
  amount_cents int not null,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.dividends (
  id uuid primary key default gen_random_uuid(),
  month date not null,
  user_id uuid references auth.users(id) on delete cascade,
  amount_cents int not null,
  created_at timestamptz default now()
);
