create table if not exists public.referrals (
  code text primary key,
  referrer uuid references auth.users(id) on delete cascade,
  referred uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists free_drinks int not null default 0,
  add column if not exists discount_credits int not null default 0;

create or replace function public.redeem_referral(p_code text, p_referred uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_referrer uuid;
begin
  select referrer into v_referrer from referrals where code = p_code and referred is null;
  if v_referrer is null then
    return;
  end if;

  update referrals set referred = p_referred where code = p_code;

  update profiles set free_drinks = free_drinks + 1 where user_id = v_referrer;
  update profiles set discount_credits = discount_credits + 1 where user_id = p_referred;
end;
$$;
