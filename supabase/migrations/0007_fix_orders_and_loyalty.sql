-- 0007_fix_orders_and_loyalty.sql

-- 1) Fix orders.source CHECK and defaults; ensure channel column exists
do $$
begin
  -- Drop old CHECK if present
  if exists (
    select 1 from pg_constraint
    where conname = 'orders_source_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_source_check;
  end if;
exception when undefined_table then
  null;
end$$;

alter table public.orders
  add column if not exists channel text;

alter table public.orders
  alter column channel set default 'click_and_collect';

update public.orders set channel = coalesce(channel, 'click_and_collect') where channel is null;

alter table public.orders
  alter column channel set not null;

-- Allow app/pos/portal as valid sources and set default
alter table public.orders
  alter column source set default 'app';

do $$
begin
  alter table public.orders
    add constraint orders_source_check check (source in ('app','pos','portal'));
exception when duplicate_object then
  null;
end$$;

-- 2) Minimal loyalty ledger to ensure idempotent awards
create table if not exists public.loyalty_awards (
  order_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stamps int not null check (stamps >= 0),
  created_at timestamptz not null default now()
);

-- 3) Ensure profiles has counters (don’t fail if they already exist)
do $$
begin
  alter table public.profiles add column if not exists loyalty_stamps int not null default 0;
  alter table public.profiles add column if not exists free_drinks    int not null default 0;
exception when undefined_table then
  -- If profiles table isn’t named this way, we’ll fail loudly on function creation below.
  null;
end$$;

-- 4) Replace RPC to dynamically use profiles.user_id or profiles.id
drop function if exists public.award_stamps(uuid, text, integer);

create or replace function public.award_stamps(p_user uuid, p_order_id text, p_add integer)
returns table(loyalty_stamps int, free_drinks int)
language plpgsql
security definer
as $fn$
declare
  id_col text := 'id';
  rcount int := 0;
  cur_stamps int := 0;
  cur_free int := 0;
begin
  -- Detect which identifier column profiles uses
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='user_id'
  ) then
    id_col := 'user_id';
  end if;

  -- Zero or negative: just read current totals
  if coalesce(p_add,0) <= 0 then
    execute format(
      'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0) from public.profiles where %I = $1',
      id_col
    ) into loyalty_stamps, free_drinks using p_user;
    return next;
    return;
  end if;

  -- Idempotency: only award once per order_id
  insert into public.loyalty_awards(order_id, user_id, stamps)
  values (p_order_id, p_user, p_add)
  on conflict(order_id) do nothing;

  get diagnostics rcount = ROW_COUNT;
  if rcount = 0 then
    -- already awarded for this order_id; return current stats
    execute format(
      'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0) from public.profiles where %I = $1',
      id_col
    ) into loyalty_stamps, free_drinks using p_user;
    return next;
    return;
  end if;

  -- Lock row, compute carry, update
  execute format(
    'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0) from public.profiles where %I = $1 for update',
    id_col
  ) into cur_stamps, cur_free using p_user;

  cur_stamps := coalesce(cur_stamps,0) + p_add;
  loyalty_stamps := cur_stamps % 8;
  free_drinks := coalesce(cur_free,0) + (cur_stamps / 8);

  execute format(
    'update public.profiles set loyalty_stamps = $1, free_drinks = $2 where %I = $3',
    id_col
  ) using loyalty_stamps, free_drinks, p_user;

  return next;
end
$fn$;

grant execute on function public.award_stamps(uuid, text, integer) to authenticated;

-- 5) Tell PostgREST to refresh its cache
notify pgrst, 'reload schema';
