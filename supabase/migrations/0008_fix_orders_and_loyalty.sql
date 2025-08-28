-- Fix orders.source allowlist + defaults, and ensure channel exists & is not null
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'orders_source_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders drop constraint orders_source_check;
  end if;
exception when undefined_table then null;
end$$;


-- Backfill legacy rows so constraints can be applied safely
update public.orders
  set source = coalesce(nullif(lower(source), ''), 'app')
  where source is null or source = '';

update public.orders
  set channel = coalesce(nullif(lower(channel), ''), 'click_and_collect')
  where channel is null or channel = '';

update public.orders
  set order_id = 'legacy-' || encode(gen_random_bytes(6), 'hex')
  where order_id is null or order_id = '';

alter table public.orders
  add column if not exists channel text,
  alter column source  set default 'app',
  alter column channel set default 'click_and_collect';

alter table public.orders
  alter column source set not null,
  alter column channel set not null,
  alter column order_id set not null;


do $$
begin
  alter table public.orders

    add constraint orders_source_check check (lower(source) in ('app','pos','portal'));
exception when duplicate_object then null;
end$$;

-- Normalize future values
update public.orders set source = lower(source);


-- Ledger for idempotent loyalty awards
create table if not exists public.loyalty_awards (
  order_id  text primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  stamps    int  not null check (stamps >= 0),
  created_at timestamptz not null default now()
);

-- Ensure profiles has counters
do $$
begin
  alter table public.profiles add column if not exists loyalty_stamps int not null default 0;
  alter table public.profiles add column if not exists free_drinks    int not null default 0;
exception when undefined_table then null;
end$$;

-- Replace RPC: detect profiles PK col ('id' vs 'user_id') dynamically
drop function if exists public.award_stamps(uuid, text, integer);

create function public.award_stamps(p_user uuid, p_order_id text, p_add int)
returns table(loyalty_stamps int, free_drinks int)
language plpgsql
security definer
set search_path = public
as $$
declare
  pk_col text;
  cur_stamps int;
  cur_free   int;
  total      int;
  carry      int;
begin
  select case
           when exists (select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles' and column_name='id')
             then 'id'
           when exists (select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles' and column_name='user_id')
             then 'user_id'
         end
    into pk_col;

  if pk_col is null then
    raise exception 'profiles needs an ''id'' or ''user_id'' column';
  end if;

  if coalesce(p_add,0) <= 0 then
    return query execute format(
      'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0) from public.profiles where %I = $1',
      pk_col
    ) using p_user;
    return;
  end if;

  insert into public.loyalty_awards(order_id, user_id, stamps)
  values (p_order_id, p_user, p_add)
  on conflict(order_id) do nothing;

  if not found then
    return query execute format(
      'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0) from public.profiles where %I = $1',
      pk_col
    ) using p_user;
    return;
  end if;

  execute format(
    'select coalesce(loyalty_stamps,0), coalesce(free_drinks,0)
       from public.profiles where %I = $1 for update', pk_col
  ) into cur_stamps, cur_free using p_user;

  total := cur_stamps + p_add;
  carry := total / 8;

  execute format(
    'update public.profiles
        set loyalty_stamps = $1,
            free_drinks    = $2
      where %I = $3', pk_col
  ) using mod(total,8), cur_free + carry, p_user;

  return query execute format(
    'select loyalty_stamps, free_drinks from public.profiles where %I = $1', pk_col
  ) using p_user;
end;
$$;

grant execute on function public.award_stamps(uuid, text, int) to authenticated;

-- Fix profiles_select_own policy to respect user_id or id
do $$
declare pk_col text;
begin
  select case
           when exists (select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles' and column_name='id')
             then 'id'
           when exists (select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles' and column_name='user_id')
             then 'user_id'
         end
    into pk_col;

  if pk_col is null then raise exception 'profiles needs id or user_id'; end if;

  alter table public.profiles enable row level security;

  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own') then
    drop policy profiles_select_own on public.profiles;
  end if;

  execute format(
    'create policy profiles_select_own on public.profiles for select using (auth.uid() = %I)',
    pk_col
  );
end$$;

-- Refresh PostgREST cache
notify pgrst, 'reload schema';
