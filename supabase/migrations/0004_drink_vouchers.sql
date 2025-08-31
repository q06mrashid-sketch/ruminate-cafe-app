do $$
declare pk text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='user_id'
  ) then
    pk := 'user_id';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='id'
  ) then
    pk := 'id';
  else
    raise exception 'profiles identifier column not found';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='drink_vouchers'
  ) then
    execute format('create table public.drink_vouchers (id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(%I) on delete cascade, code text unique not null, redeemed boolean not null default false, created_at timestamptz default now())', pk);
  end if;
end$$;

create index if not exists drink_vouchers_user_id_idx on public.drink_vouchers(user_id);
