-- Phase 1 of asset-level tracking, working toward replacing Texada's
-- ticket generation/QR workflow.
--
-- WHY THIS MODEL: Infor stays the system of record for what assets exist
-- and which contract they're on — this app is NOT meant to become a
-- competing asset registry. What Texada and Infor both lack today is live
-- location/status ("where is this specific generator right now"), which is
-- exactly what this table adds. Once Infor API access is confirmed, a sync
-- job populates infor_synced_at and overwrites asset_number with the real
-- Infor Asset Number; until then, asset_number is app-generated (see the
-- 'TEMP-' prefix convention used by the mobile app) so nothing here blocks
-- on that integration existing yet. manufacturer_serial is captured now
-- specifically so that later Infor sync can match a placeholder asset to
-- its real record automatically instead of requiring manual reconciliation.
--
-- Not every catalog item needs individual serialized tracking (a banquet
-- chair doesn't; a $650 generator does) — item_master.is_serialized is the
-- switch, left off by default so nothing about existing items changes.

alter table item_master add column if not exists is_serialized boolean not null default false;

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique,
  item_id bigint not null references item_master(id),
  manufacturer_serial text,
  photo_url text,
  current_branch_id bigint references branches(id),
  status text not null default 'at_branch' check (status in ('at_branch', 'out_on_delivery', 'lost', 'retired')),
  infor_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assets_item_id on assets(item_id);
create index if not exists idx_assets_current_branch_id on assets(current_branch_id);

-- Links a delivery/pickup ticket to the specific serialized asset(s) it
-- covered. A ticket for a non-serialized item just has no rows here — qty
-- on the delivery/pickup row is still how those are tracked.
create table if not exists delivery_assets (
  delivery_id uuid not null references deliveries(id) on delete cascade,
  asset_id uuid not null references assets(id),
  primary key (delivery_id, asset_id)
);

create table if not exists pickup_assets (
  pickup_id uuid not null references pickups(id) on delete cascade,
  asset_id uuid not null references assets(id),
  primary key (pickup_id, asset_id)
);

-- A photo taken at the moment a delivery/pickup is marked complete —
-- documents condition/what actually left or came back, and is what a
-- generated ticket (a later phase) will embed alongside the asset list.
alter table deliveries add column if not exists completion_photo_url text;
alter table pickups add column if not exists completion_photo_url text;

alter table assets enable row level security;
alter table delivery_assets enable row level security;
alter table pickup_assets enable row level security;

-- Same permissive "anon full access" pattern as every other table in this
-- schema — see schema.sql's own caveat: needs real auth-scoped policies
-- before production, not specific to this migration.
drop policy if exists "anon full access" on assets;
create policy "anon full access" on assets for all using (true) with check (true);

drop policy if exists "anon full access" on delivery_assets;
create policy "anon full access" on delivery_assets for all using (true) with check (true);

drop policy if exists "anon full access" on pickup_assets;
create policy "anon full access" on pickup_assets for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'assets'
  ) then
    alter publication supabase_realtime add table assets;
  end if;
end $$;

-- Storage bucket for asset photos and delivery/pickup completion photos.
-- Public read (so a generated ticket or the dashboard can just link to the
-- image directly) — same permissive posture as everything else here.
insert into storage.buckets (id, name, public)
values ('asset-photos', 'asset-photos', true)
on conflict (id) do nothing;

drop policy if exists "asset-photos public read" on storage.objects;
create policy "asset-photos public read" on storage.objects for select using (bucket_id = 'asset-photos');

drop policy if exists "asset-photos anon upload" on storage.objects;
create policy "asset-photos anon upload" on storage.objects for insert with check (bucket_id = 'asset-photos');
