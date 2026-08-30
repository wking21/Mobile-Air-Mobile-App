-- Ancillary Reconciliation schema.
-- Run this once in the Supabase project's SQL Editor (Dashboard > SQL Editor > New query).
-- The table/policy/publication statements are safe to re-run. The demo seed
-- data below is not deduplicated (deliveries/pickups have no natural unique
-- key) — re-running this script on a project that already has data will add
-- a second copy of the demo rows, which is harmless but worth knowing.

create extension if not exists pgcrypto; -- gen_random_uuid()

create table if not exists branches (
  id bigint primary key,
  name text not null,
  region text not null,
  service_manager_email text not null
);

create table if not exists item_master (
  id bigint primary key,
  name text not null,
  category text not null,
  unit_cost numeric not null
);

create table if not exists deliveries (
  id uuid primary key default gen_random_uuid(),
  branch_id bigint not null references branches(id),
  item_id bigint not null references item_master(id),
  qty integer not null,
  date date not null,
  notes text not null default '',
  status text not null default 'planned' check (status in ('planned', 'completed')),
  confirmed_qty integer,
  completed_at date,
  completion_notes text,
  created_at timestamptz not null default now()
);

create table if not exists pickups (
  id uuid primary key default gen_random_uuid(),
  branch_id bigint not null references branches(id),
  item_id bigint not null references item_master(id),
  qty integer not null,
  date date not null,
  notes text not null default '',
  status text not null default 'planned' check (status in ('planned', 'completed')),
  confirmed_qty integer,
  completed_at date,
  completion_notes text,
  created_at timestamptz not null default now()
);

-- One row per (branch, item) pair once someone has marked it reviewed in the
-- Reconciliation tab. Absence of a row means "not yet reviewed".
create table if not exists reconciliation_reviews (
  branch_id bigint not null references branches(id),
  item_id bigint not null references item_master(id),
  reviewed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (branch_id, item_id)
);

-- Seed data — mirrors src/data/mockData.ts so the app has the same demo
-- content it already had, now coming from a shared database instead of an
-- in-memory array per device.
insert into branches (id, name, region, service_manager_email) values
  (1, 'North Branch', 'North', 'north.manager@example.com'),
  (2, 'South Branch', 'South', 'south.manager@example.com'),
  (3, 'Central Branch', 'Central', 'central.manager@example.com'),
  (4, 'East Branch', 'East', 'east.manager@example.com')
on conflict (id) do nothing;

insert into item_master (id, name, category, unit_cost) values
  (1, 'Folding Table 6ft', 'Furniture', 45),
  (2, 'Banquet Chair', 'Furniture', 12),
  (3, '10x10 Canopy Tent', 'Structures', 220),
  (4, 'Portable Generator 5kW', 'Equipment', 650),
  (5, 'Pallet Jack', 'Equipment', 310),
  (6, 'Rolling Cooler 150qt', 'Coolers', 95),
  (7, 'Patio Heater', 'Equipment', 180),
  (8, 'Hand Dolly', 'Equipment', 60)
on conflict (id) do nothing;

insert into deliveries (branch_id, item_id, qty, date, notes, status, confirmed_qty, completed_at, completion_notes) values
  (1, 1, 20, '2026-08-10', 'Event setup', 'completed', 20, '2026-08-10', ''),
  (1, 3, 2, '2026-08-10', '', 'completed', 2, '2026-08-10', ''),
  (2, 4, 1, '2026-08-12', 'Backup power', 'completed', 1, '2026-08-12', ''),
  (3, 6, 10, '2026-08-15', '', 'completed', 10, '2026-08-15', ''),
  (4, 2, 50, '2026-08-18', 'Conference', 'completed', 50, '2026-08-18', ''),
  (2, 4, 1, '2026-08-20', 'Second unit', 'completed', 1, '2026-08-20', ''),
  (1, 1, 10, '2026-08-22', '', 'completed', 10, '2026-08-22', '')
on conflict do nothing;

insert into pickups (branch_id, item_id, qty, date, notes, status, confirmed_qty, completed_at, completion_notes) values
  (1, 1, 18, '2026-08-20', 'Partial return', 'completed', 18, '2026-08-20', ''),
  (2, 4, 2, '2026-08-25', 'Both units returned', 'completed', 2, '2026-08-25', ''),
  (3, 6, 4, '2026-08-24', '', 'completed', 4, '2026-08-24', ''),
  (4, 2, 50, '2026-08-24', '', 'completed', 50, '2026-08-24', ''),
  (1, 3, 3, '2026-08-26', '', 'completed', 3, '2026-08-26', '')
on conflict do nothing;

-- Row Level Security. Enabled with a permissive "anyone with the anon key
-- can read/write" policy for now, since the app has no login step yet.
-- TODO before any real rollout: replace these with policies scoped to an
-- authenticated user/branch once auth is added — do not ship this open
-- policy to production with real customer/financial data.
alter table branches enable row level security;
alter table item_master enable row level security;
alter table deliveries enable row level security;
alter table pickups enable row level security;
alter table reconciliation_reviews enable row level security;

drop policy if exists "anon full access" on branches;
create policy "anon full access" on branches for all using (true) with check (true);

drop policy if exists "anon full access" on item_master;
create policy "anon full access" on item_master for all using (true) with check (true);

drop policy if exists "anon full access" on deliveries;
create policy "anon full access" on deliveries for all using (true) with check (true);

drop policy if exists "anon full access" on pickups;
create policy "anon full access" on pickups for all using (true) with check (true);

drop policy if exists "anon full access" on reconciliation_reviews;
create policy "anon full access" on reconciliation_reviews for all using (true) with check (true);

-- Realtime: push live inserts/updates for these tables to subscribed clients
-- so multiple technicians/branches see the same data without refreshing.
-- Wrapped so re-running this script doesn't error if a table is already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'deliveries'
  ) then
    alter publication supabase_realtime add table deliveries;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'pickups'
  ) then
    alter publication supabase_realtime add table pickups;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reconciliation_reviews'
  ) then
    alter publication supabase_realtime add table reconciliation_reviews;
  end if;
end $$;
