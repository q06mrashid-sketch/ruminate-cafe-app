alter table public.orders
  add column if not exists free_drinks_redeemed int not null default 0;

do $$
declare
  pk text;
begin
  -- detect pk (id or user_id)
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_id'
  ) then
    pk := 'user_id';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'id'
  ) then
    pk := 'id';
  else
    raise exception 'profiles identifier column not found';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'loyalty_tx'
  ) then
    execute format($f$
      create table public.loyalty_tx (
        order_id text primary key,
        user_id uuid not null,
        stamps_awarded int not null default 0 check (stamps_awarded >= 0),
        vouchers_redeemed int not null default 0 check (vouchers_redeemed >= 0),
        created_at timestamptz not null default now(),
        foreign key (user_id) references public.profiles(%I) on delete cascade
      )
    $f$, pk);
  end if;
end$$;
alter table public.loyalty_tx enable row level security;

-- RLS: user can read own rows / insert own
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='loyalty_tx' and policyname='loyalty_tx_read_own') then
    drop policy loyalty_tx_read_own on public.loyalty_tx;
  end if;
  create policy loyalty_tx_read_own on public.loyalty_tx for select using (auth.uid() = user_id);

  if exists (select 1 from pg_policies where schemaname='public' and tablename='loyalty_tx' and policyname='loyalty_tx_insert_own') then
    drop policy loyalty_tx_insert_own on public.loyalty_tx;
  end if;
  create policy loyalty_tx_insert_own on public.loyalty_tx for insert with check (auth.uid() = user_id);
end$$;

drop function if exists public.checkout_loyalty(uuid, text, int, int);

create function public.checkout_loyalty(
  p_user uuid,
  p_order_id text,
  p_add_stamps int,
  p_redeem int
)
returns table(loyalty_stamps int, free_drinks int)
language plpgsql
security definer
as $$
declare
  pk text;
  cur_stamps int;
  cur_free int;
  redeem_used int;
  inserted int;
begin
  -- detect pk (id or user_id)
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='user_id') then
    pk := 'user_id';
  elsif exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='profiles' and column_name='id') then
    pk := 'id';
  else
    raise exception 'profiles identifier column not found';
  end if;

  -- Idempotency: if we already have a tx row for this order_id, return current totals
  insert into public.loyalty_tx(order_id, user_id, stamps_awarded, vouchers_redeemed)
    values (p_order_id, p_user, greatest(p_add_stamps,0), greatest(p_redeem,0))
    on conflict (order_id) do nothing;

  get diagnostics inserted = row_count;
  execute format('select loyalty_stamps, free_drinks from public.profiles where %I=$1 for update', pk)
    into cur_stamps, cur_free
    using p_user;

  if inserted = 0 then
    -- previously processed: just return current totals
    loyalty_stamps := coalesce(cur_stamps,0);
    free_drinks    := coalesce(cur_free,0);
    return;
  end if;

  -- Redeem against current free, capping at available
  redeem_used := least(greatest(p_redeem,0), coalesce(cur_free,0));
  cur_free := coalesce(cur_free,0) - redeem_used;

  -- Award stamps from non-redeemed drinks
  cur_stamps := coalesce(cur_stamps,0) + greatest(p_add_stamps,0);

  -- Roll into free drinks
  free_drinks := cur_free + (cur_stamps / 8);
  loyalty_stamps := mod(cur_stamps, 8);

  -- Persist
  execute format('update public.profiles set loyalty_stamps=$1, free_drinks=$2 where %I=$3', pk)
    using loyalty_stamps, free_drinks, p_user;

  return;
end;
$$;

grant execute on function public.checkout_loyalty(uuid, text, int, int) to authenticated;

notify pgrst, 'reload schema';
