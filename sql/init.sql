create table if not exists public.orders (
  id bigserial primary key,
  retailcrm_id text not null unique,
  external_id text,
  order_number text,
  customer_name text,
  customer_phone text,
  status text,
  total_sum numeric(14,2) not null default 0,
  currency text not null default 'KZT',
  created_at_retailcrm timestamptz,
  uploaded_at timestamptz not null default now(),
  raw jsonb not null
);

create index if not exists idx_orders_created_at_retailcrm on public.orders (created_at_retailcrm desc);
create index if not exists idx_orders_total_sum on public.orders (total_sum desc);
