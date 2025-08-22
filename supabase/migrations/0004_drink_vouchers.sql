create table if not exists public.drink_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code text unique not null,
  redeemed boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists drink_vouchers_user_id_idx on public.drink_vouchers(user_id);
