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

alter table public.orders
  alter column user_id set not null,
  alter column order_id set not null,
  alter column status set not null,
  alter column totals_cents set not null,
  alter column currency set not null,
  alter column channel set not null,
  alter column source set not null,
  alter column created_at set not null;

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

-- Acceptance (SAFE): skip on empty auth.users and never assert hard values
DO $$
DECLARE
  u  uuid;
  ls int;
  fd int;
BEGIN
  SELECT id INTO u FROM auth.users LIMIT 1;
  IF u IS NULL THEN
    RAISE NOTICE 'Skipping acceptance (no users in auth.users)';
    RETURN;
  END IF;

  -- Smoke call only; don't depend on current profile state
  PERFORM 1 FROM public.award_stamps(u, 'accept-'||floor(extract(epoch from now()))::text, 0);

  -- Optional: create a minimal orders row that cannot violate checks
  INSERT INTO public.orders(user_id, order_id, source, channel)
  VALUES (u, 'accept-order-'||floor(extract(epoch from now()))::text, 'app', 'click_and_collect')
  ON CONFLICT (order_id) DO NOTHING;
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
