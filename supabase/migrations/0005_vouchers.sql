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
    where table_schema='public' and table_name='vouchers'
  ) then
    execute format('create table public.vouchers (code text primary key, user_id uuid references public.profiles(%I), redeemed boolean default false, created_at timestamptz default now(), redeemed_at timestamptz)', pk);
  end if;
end$$;
