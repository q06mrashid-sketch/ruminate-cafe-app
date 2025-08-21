create table if not exists vouchers (
  code text primary key,
  user_id uuid references auth.users(id),
  redeemed boolean default false,
  created_at timestamptz default now(),
  redeemed_at timestamptz
);
