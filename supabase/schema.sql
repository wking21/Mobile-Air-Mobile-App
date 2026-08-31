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

-- One row per active loss investigation for a (branch, item) pair.
-- Auto-created/kept current by the trigger below whenever completed
-- deliveries/pickups leave that pair's on-hand count negative. Workflow:
-- 'open' (detected, needs an owner + explanation) -> 'pending_approval'
-- (owner submitted resolution_notes) -> 'resolved' (approver signed off).
-- An approver can also reject a pending case back to 'open' with
-- rejection_notes explaining why. Note: with no auth yet, assigned_to /
-- approved_by are free-text names/emails, not real user references — that
-- tightens up once Microsoft sign-in is added.
create table if not exists equipment_losses (
  id uuid primary key default gen_random_uuid(),
  branch_id bigint not null references branches(id),
  item_id bigint not null references item_master(id),
  quantity_missing integer not null,
  estimated_cost numeric not null,
  status text not null default 'open' check (status in ('open', 'pending_approval', 'resolved')),
  assigned_to text,
  resolution_notes text,
  submitted_for_approval_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  rejection_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recomputes on-hand for the (branch, item) pair the changed row belongs to
-- and opens (or refreshes the numbers on) a loss case when it's negative.
-- Only ever opens ONE case per pair at a time — if one is already open or
-- pending approval, its quantity/cost gets updated in place instead of a
-- duplicate case being created.
create or replace function check_for_equipment_loss() returns trigger as $$
declare
  v_branch_id bigint := coalesce(new.branch_id, old.branch_id);
  v_item_id bigint := coalesce(new.item_id, old.item_id);
  v_delivered numeric;
  v_picked numeric;
  v_on_hand numeric;
  v_unit_cost numeric;
  v_existing_case uuid;
begin
  select coalesce(sum(coalesce(confirmed_qty, qty)), 0) into v_delivered
    from deliveries where branch_id = v_branch_id and item_id = v_item_id and status = 'completed';
  select coalesce(sum(coalesce(confirmed_qty, qty)), 0) into v_picked
    from pickups where branch_id = v_branch_id and item_id = v_item_id and status = 'completed';

  v_on_hand := v_delivered - v_picked;

  if v_on_hand < 0 then
    select id into v_existing_case from equipment_losses
      where branch_id = v_branch_id and item_id = v_item_id and status in ('open', 'pending_approval')
      limit 1;

    select unit_cost into v_unit_cost from item_master where id = v_item_id;

    if v_existing_case is null then
      insert into equipment_losses (branch_id, item_id, quantity_missing, estimated_cost)
        values (v_branch_id, v_item_id, abs(v_on_hand)::integer, abs(v_on_hand) * v_unit_cost);
    else
      update equipment_losses
        set quantity_missing = abs(v_on_hand)::integer,
            estimated_cost = abs(v_on_hand) * v_unit_cost,
            updated_at = now()
        where id = v_existing_case;
    end if;
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_deliveries_check_loss on deliveries;
create trigger trg_deliveries_check_loss
  after insert or update on deliveries
  for each row execute function check_for_equipment_loss();

drop trigger if exists trg_pickups_check_loss on pickups;
create trigger trg_pickups_check_loss
  after insert or update on pickups
  for each row execute function check_for_equipment_loss();

-- Indexes for scale: the trigger above runs two filtered SUM queries on
-- every insert/update, and the app's list screens/stats do similar filtered
-- lookups. Partial indexes here only cover the rows each query actually
-- filters by, so they stay small and fast even at millions of rows.
create index if not exists idx_deliveries_branch_item_completed
  on deliveries (branch_id, item_id)
  where status = 'completed';

create index if not exists idx_pickups_branch_item_completed
  on pickups (branch_id, item_id)
  where status = 'completed';

create index if not exists idx_deliveries_status_planned
  on deliveries (status)
  where status = 'planned';

create index if not exists idx_pickups_status_planned
  on pickups (status)
  where status = 'planned';

create index if not exists idx_deliveries_date_id
  on deliveries (date desc, id desc);

create index if not exists idx_pickups_date_id
  on pickups (date desc, id desc);

create index if not exists idx_equipment_losses_branch_item_active
  on equipment_losses (branch_id, item_id)
  where status in ('open', 'pending_approval');

create index if not exists idx_equipment_losses_created_at
  on equipment_losses (created_at desc);

-- Server-side reconciliation aggregate. Size scales with the number of
-- distinct (branch, item) pairs that have ever had activity — NOT with
-- transaction volume — so the app queries this instead of pulling every
-- delivery/pickup row and summing them client-side.
create or replace view reconciliation_summary
  with (security_invoker = true) -- evaluate RLS as the querying role, not the view owner, so this stays correct once RLS is tightened past today's "anyone can read everything"
as
with delivered as (
  select branch_id, item_id, sum(coalesce(confirmed_qty, qty)) as delivered
  from deliveries
  where status = 'completed'
  group by branch_id, item_id
),
picked as (
  select branch_id, item_id, sum(coalesce(confirmed_qty, qty)) as picked
  from pickups
  where status = 'completed'
  group by branch_id, item_id
)
select
  coalesce(d.branch_id, p.branch_id) as branch_id,
  coalesce(d.item_id, p.item_id) as item_id,
  coalesce(d.delivered, 0) as delivered,
  coalesce(p.picked, 0) as picked,
  coalesce(d.delivered, 0) - coalesce(p.picked, 0) as on_hand,
  coalesce(rr.reviewed, false) as reviewed
from delivered d
full outer join picked p on p.branch_id = d.branch_id and p.item_id = d.item_id
left join reconciliation_reviews rr
  on rr.branch_id = coalesce(d.branch_id, p.branch_id) and rr.item_id = coalesce(d.item_id, p.item_id);

-- Seed data — the same demo branches/items/deliveries/pickups the app
-- originally shipped with as in-memory mocks, now coming from a shared
-- database instead of a per-device array.
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
alter table equipment_losses enable row level security;

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

drop policy if exists "anon full access" on equipment_losses;
create policy "anon full access" on equipment_losses for all using (true) with check (true);

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
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'equipment_losses'
  ) then
    alter publication supabase_realtime add table equipment_losses;
  end if;
end $$;
