create table if not exists public.menu_items (
  id bigserial primary key,
  name text,
  type text,
  base_price numeric,
  options jsonb,
  cms_key text unique
);

create index if not exists menu_items_cms_key_idx on public.menu_items(cms_key);
