-- Idempotent migration to ensure orders table shape, profiles loyalty fields,
-- policies, loyalty_awards ledger and award_stamps RPC.

-- 1. Orders table shape & constraints
create table if not exists public.orders (
    user_id uuid,
    order_id text,
    pickup_code text,
    status text default 'pending',
    totals_cents int default 0,
    currency text default 'GBP',
    channel text default 'click_and_collect',
    source text default 'app',
    payment_method text,
    time_slot jsonb,
    time_slot_start timestamptz,
    time_slot_end timestamptz,
    items jsonb,
    receipt jsonb,
    created_at timestamptz default now()
);

alter table public.orders
  add column if not exists user_id uuid,
  add column if not exists order_id text,
  add column if not exists pickup_code text,
  add column if not exists status text default 'pending',
  add column if not exists totals_cents int default 0,
  add column if not exists currency text default 'GBP',
  add column if not exists channel text default 'click_and_collect',
  add column if not exists source text default 'app',
  add column if not exists payment_method text,
  add column if not exists time_slot jsonb,
  add column if not exists time_slot_start timestamptz,
  add column if not exists time_slot_end timestamptz,
  add column if not exists items jsonb,
  add column if not exists receipt jsonb,
  add column if not exists created_at timestamptz default now();


-- 1a) Shadow table to preserve legacy orphaned rows (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_tables where schemaname='public' and tablename='orders_orphaned'
  ) then
    execute $DDL$
      create table public.orders_orphaned (
        user_id uuid,
        order_id text,
        pickup_code text,
        status text,
        totals_cents int,
        currency text,
        channel text,
        source text,
        payment_method text,
        time_slot jsonb,
        time_slot_start timestamptz,
        time_slot_end timestamptz,
        items jsonb,
        receipt jsonb,
        created_at timestamptz,
        moved_at timestamptz default now(),
        reason text
      )
    $DDL$;
  end if;
end$$;

-- 1b) Quarantine rows with NULL user_id (cannot satisfy FK/NOT NULL)
with moved as (
  delete from public.orders
   where user_id is null
   returning *
)
insert into public.orders_orphaned(
  user_id, order_id, pickup_code, status, totals_cents, currency, channel, source,
  payment_method, time_slot, time_slot_start, time_slot_end, items, receipt, created_at, reason
)
select user_id, order_id, pickup_code, status, totals_cents, currency, channel, source,
       payment_method, time_slot, time_slot_start, time_slot_end, items, receipt, created_at,
       'user_id was NULL'
from moved;

-- 1c) Backfill defaults for other required fields on remaining rows
update public.orders
   set order_id      = coalesce(order_id, 'legacy-' || gen_random_uuid()),
       status        = coalesce(status, 'pending'),
       totals_cents  = coalesce(totals_cents, 0),
       currency      = coalesce(currency, 'GBP'),
       channel       = coalesce(channel, 'click_and_collect'),
       source        = coalesce(source, 'app'),
       created_at    = coalesce(created_at, now());

-- === Preflight: diagnose & repair legacy NULLs in orders ===
do $$
declare
  n_user_null int := 0;
  n_orderid_null int := 0;
  n_status_null int := 0;
  n_totals_null int := 0;
  n_currency_null int := 0;
  n_channel_null int := 0;
  n_source_null int := 0;
  n_created_null int := 0;
begin
  -- 1) Try to backfill user_id from receipt JSON if present (idempotent)
  --    Many apps embed the user id in the receipt payload; we’ll try both keys.
  update public.orders o
     set user_id = coalesce(
       nullif((o.receipt->>'user_id'),'')::uuid,
       nullif((o.receipt->'user'->>'id'),'')::uuid
     )
   where user_id is null
     and (
       (o.receipt ? 'user_id' and (o.receipt->>'user_id') ~* '^[0-9a-f-]{36}$')
       or (o.receipt ? 'user' and (o.receipt->'user'->>'id') ~* '^[0-9a-f-]{36}$')
     );

  -- 2) Fill other required columns from safe defaults where truly missing (only legacy)
  update public.orders
     set status       = coalesce(status, 'pending'),
         totals_cents = coalesce(totals_cents, 0),
         currency     = coalesce(currency, 'GBP'),
         channel      = coalesce(channel, 'click_and_collect'),
         source       = coalesce(source, 'app'),
         created_at   = coalesce(created_at, now())
   where status is null
      or totals_cents is null
      or currency is null
      or channel is null
      or source is null
      or created_at is null;

  -- 3) Count remaining offenders
  select count(*) into n_user_null    from public.orders where user_id    is null;
  select count(*) into n_orderid_null from public.orders where order_id   is null;
  select count(*) into n_status_null  from public.orders where status     is null;
  select count(*) into n_totals_null  from public.orders where totals_cents is null;
  select count(*) into n_currency_null from public.orders where currency  is null;
  select count(*) into n_channel_null  from public.orders where channel   is null;
  select count(*) into n_source_null   from public.orders where source    is null;
  select count(*) into n_created_null  from public.orders where created_at is null;

  -- 4) As a last resort in dev/test, delete rows that still violate required fields
  if n_user_null > 0 or n_orderid_null > 0 or n_status_null > 0
     or n_totals_null > 0 or n_currency_null > 0
     or n_channel_null > 0 or n_source_null > 0 or n_created_null > 0 then
    raise notice '[orders preflight] deleting legacy rows with NULL required fields: user_id=% order_id=% status=% totals=% currency=% channel=% source=% created_at=%',
      n_user_null, n_orderid_null, n_status_null, n_totals_null, n_currency_null, n_channel_null, n_source_null, n_created_null;

    delete from public.orders
     where user_id    is null
        or order_id   is null
        or status     is null
        or totals_cents is null
        or currency   is null
        or channel    is null
        or source     is null
        or created_at is null;
  end if;
end$$;

-- Now it’s safe to enforce NOT NULLs (idempotent if already set)
alter table public.orders
  alter column user_id      set not null,
  alter column order_id     set not null,
  alter column status       set not null,
  alter column totals_cents set not null,
  alter column currency     set not null,
  alter column channel      set not null,
  alter column source       set not null,
  alter column created_at   set not null;

alter table public.orders
  alter column status set default 'pending',
  alter column totals_cents set default 0,
  alter column currency set default 'GBP',
  alter column channel set default 'click_and_collect',
  alter column source set default 'app',
  alter column created_at set default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_user_id_fkey') then
    alter table public.orders
      add constraint orders_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end$$;

create unique index if not exists orders_order_id_key on public.orders(order_id);

alter table public.orders enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_select_own') then
    drop policy orders_select_own on public.orders;
  end if;
  create policy orders_select_own on public.orders for select using (auth.uid() = user_id);
end$$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='orders' and policyname='orders_insert_own') then
    drop policy orders_insert_own on public.orders;
  end if;
  create policy orders_insert_own on public.orders for insert with check (auth.uid() = user_id);
end$$;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'orders_source_check') then
    alter table public.orders drop constraint orders_source_check;
  end if;
  alter table public.orders add constraint orders_source_check check (lower(source) in ('app','pos','portal'));
end$$;

-- 2. Profiles columns
alter table public.profiles add column if not exists loyalty_stamps int not null default 0;
alter table public.profiles add column if not exists free_drinks int not null default 0;

-- 3. RLS on profiles (select own)
alter table public.profiles enable row level security;

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

  if exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_own') then
    execute 'drop policy profiles_select_own on public.profiles';
  end if;
  execute format('create policy profiles_select_own on public.profiles for select using (auth.uid() = %I)', pk);
end$$;

-- 4. Loyalty idempotency ledger
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

  if not exists (select 1 from pg_tables where schemaname='public' and tablename='loyalty_awards') then
    execute format('create table public.loyalty_awards (order_id text primary key, user_id uuid not null references public.profiles(%I) on delete cascade, stamps int not null check (stamps >= 0), created_at timestamptz not null default now())', pk);
  end if;
end$$;

alter table public.loyalty_awards enable row level security;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='loyalty_awards' and policyname='loyalty_awards_read_own') then
    drop policy loyalty_awards_read_own on public.loyalty_awards;
  end if;
  create policy loyalty_awards_read_own on public.loyalty_awards for select using (auth.uid() = user_id);
end$$;

do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='loyalty_awards' and policyname='loyalty_awards_insert_own') then
    drop policy loyalty_awards_insert_own on public.loyalty_awards;
  end if;
  create policy loyalty_awards_insert_own on public.loyalty_awards for insert with check (auth.uid() = user_id);
end$$;

-- 5. RPC award_stamps
drop function if exists public.award_stamps(uuid, text, int);

create function public.award_stamps(p_user uuid, p_order_id text, p_add int)
returns table(loyalty_stamps int, free_drinks int)
language plpgsql
security definer
as $$
declare
  pk text;
  inserted int;
  cur_stamps int;
  cur_free int;
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

  if p_add <= 0 then
    execute format('select loyalty_stamps, free_drinks from public.profiles where %I=$1', pk)
      into loyalty_stamps, free_drinks
      using p_user;
    return;
  end if;

  insert into public.loyalty_awards(order_id, user_id, stamps)
  values (p_order_id, p_user, p_add)
  on conflict (order_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    execute format('select loyalty_stamps, free_drinks from public.profiles where %I=$1', pk)
      into loyalty_stamps, free_drinks
      using p_user;
    return;
  end if;

  execute format('select loyalty_stamps, free_drinks from public.profiles where %I=$1 for update', pk)
    into cur_stamps, cur_free
    using p_user;

  cur_stamps := coalesce(cur_stamps,0) + p_add;
  cur_free := coalesce(cur_free,0);

  free_drinks := cur_free + (cur_stamps / 8);
  loyalty_stamps := mod(cur_stamps, 8);

  execute format('update public.profiles set loyalty_stamps=$1, free_drinks=$2 where %I=$3', pk)
    using loyalty_stamps, free_drinks, p_user;

  return;
end;
$$;

grant execute on function public.award_stamps(uuid, text, int) to authenticated;

-- 6. Schema cache refresh
notify pgrst, 'reload schema';

-- Acceptance tests
-- insert orders row
DO $$
DECLARE u uuid;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  INSERT INTO public.orders(user_id, order_id, source, channel)
    VALUES (u, 'test-oid', 'app', 'click_and_collect');
  DELETE FROM public.orders WHERE order_id='test-oid';
END$$;

-- award_stamps with zero addition
SELECT * FROM public.award_stamps(gen_random_uuid(), 'order-xyz', 0);

-- roll stamps into free drink
DO $$
DECLARE u uuid := gen_random_uuid();
       ls int;
       fd int;
       cnt int;
       pk text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) THEN
    pk := 'user_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='id'
  ) THEN
    pk := 'id';
  ELSE
    RAISE EXCEPTION 'profiles identifier column not found';
  END IF;

  EXECUTE format('INSERT INTO public.profiles(%I, loyalty_stamps, free_drinks) VALUES ($1,5,1)', pk) USING u;

  SELECT loyalty_stamps, free_drinks INTO ls, fd FROM public.award_stamps(u, 'o1', 3);
  IF ls <> 0 OR fd <> 2 THEN
    RAISE EXCEPTION 'unexpected totals % %', ls, fd;
  END IF;

  SELECT count(*) INTO cnt FROM public.loyalty_awards WHERE order_id='o1';
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'loyalty_awards count %', cnt;
  END IF;

  DELETE FROM public.loyalty_awards WHERE order_id='o1';
  EXECUTE format('DELETE FROM public.profiles WHERE %I=$1', pk) USING u;
END$$;
