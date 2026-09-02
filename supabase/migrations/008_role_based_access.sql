-- Adds branch/region-scoped access: service managers (and regional
-- managers, and whatever other titles come later) should only see their
-- own branch's data; executives should keep seeing everything. Until now
-- every signed-in user had identical access to every branch (see
-- migrations/007_require_authentication.sql) — this migration is what
-- actually tells the database who's allowed to see what.
--
-- role is a free-text label, not a fixed enum. It's informational (useful
-- for a future admin screen) — access control only branches on the
-- 'executive' special case in user_can_access_branch() below. Every other
-- title (service_manager, regional_manager, ...) is handled identically:
-- a user sees exactly the branches listed for them in user_branch_access.
-- A "regional manager" is just a user with one row per branch in their
-- region — no separate region-based rule is needed, which means adding
-- more titles later shouldn't require another schema change.
--
-- Deliberately no insert/update/delete policy on either new table —
-- assigning roles/branches is an admin action done directly in the
-- Supabase Table Editor (which bypasses RLS), not a self-service app
-- feature.
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_branch_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  branch_id bigint not null references branches(id),
  primary key (user_id, branch_id)
);

alter table user_profiles enable row level security;
alter table user_branch_access enable row level security;

drop policy if exists "read own profile" on user_profiles;
create policy "read own profile" on user_profiles for select using (user_id = auth.uid());

drop policy if exists "read own branch access" on user_branch_access;
create policy "read own branch access" on user_branch_access for select using (user_id = auth.uid());

-- The single place branch-scoping logic lives, so every policy below reads
-- the same rule instead of repeating it.
create or replace function user_can_access_branch(p_branch_id bigint) returns boolean
language sql stable
as $$
  select exists (
    select 1 from user_profiles where user_id = auth.uid() and role = 'executive'
  ) or exists (
    select 1 from user_branch_access where user_id = auth.uid() and branch_id = p_branch_id
  );
$$;

-- security definer so this checks whether a link objectively exists at
-- all, not just whether the querying user can see one — delivery_assets
-- is itself RLS-scoped, so an ordinary query here would report "no link"
-- for a link that exists but belongs to a branch the caller can't see,
-- which is exactly backwards for the assets policy below (that gap would
-- make an already-claimed asset look brand-new to everyone else). This
-- only ever reveals a yes/no fact, never which branch or delivery.
create or replace function asset_has_any_delivery_link(p_asset_id uuid) returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from delivery_assets where asset_id = p_asset_id);
$$;

drop policy if exists "anon full access" on branches;
drop policy if exists "authenticated full access" on branches;
create policy "authenticated full access" on branches for all using (user_can_access_branch(id)) with check (user_can_access_branch(id));

drop policy if exists "anon full access" on deliveries;
drop policy if exists "authenticated full access" on deliveries;
create policy "authenticated full access" on deliveries for all using (user_can_access_branch(branch_id)) with check (user_can_access_branch(branch_id));

drop policy if exists "anon full access" on pickups;
drop policy if exists "authenticated full access" on pickups;
create policy "authenticated full access" on pickups for all using (user_can_access_branch(branch_id)) with check (user_can_access_branch(branch_id));

drop policy if exists "anon full access" on reconciliation_reviews;
drop policy if exists "authenticated full access" on reconciliation_reviews;
create policy "authenticated full access" on reconciliation_reviews for all using (user_can_access_branch(branch_id)) with check (user_can_access_branch(branch_id));

drop policy if exists "anon full access" on reconciliation_totals;
drop policy if exists "authenticated full access" on reconciliation_totals;
create policy "authenticated full access" on reconciliation_totals for all using (user_can_access_branch(branch_id)) with check (user_can_access_branch(branch_id));

drop policy if exists "anon full access" on equipment_losses;
drop policy if exists "authenticated full access" on equipment_losses;
create policy "authenticated full access" on equipment_losses for all using (user_can_access_branch(branch_id)) with check (user_can_access_branch(branch_id));

-- assets has no branch_id of its own — current_branch_id is null the
-- moment a unit is scanned out on delivery (see upsertScannedAsset in
-- src/api/dataService.ts), so read access falls back to whichever
-- delivery most recently linked it. upsertScannedAsset does
-- .upsert(...).select().single(), which requires the written row to pass
-- this SAME using clause immediately after the write (Postgres/PostgREST
-- can't return a row RLS says you can't see) — a brand-new scan has
-- neither a branch nor a delivery link yet (linkAssetToDelivery is a
-- separate statement right after), so without the third clause below
-- every first-ever scan would fail outright. That clause's cost: a unit
-- is briefly visible to any authenticated user only for the sliver of
-- time between its very first scan and that same request's follow-up
-- link — every subsequent scan of the same unit has delivery history, so
-- the second clause takes over and properly scopes it from then on.
drop policy if exists "anon full access" on assets;
drop policy if exists "authenticated full access" on assets;
create policy "authenticated full access" on assets for all
  using (
    (current_branch_id is not null and user_can_access_branch(current_branch_id))
    or exists (
      select 1 from delivery_assets da join deliveries d on d.id = da.delivery_id
      where da.asset_id = assets.id and user_can_access_branch(d.branch_id)
    )
    or (current_branch_id is null and not asset_has_any_delivery_link(assets.id))
  )
  with check (current_branch_id is null or user_can_access_branch(current_branch_id));

-- delivery_assets/pickup_assets have no branch_id either — the relevant
-- branch is whichever delivery/pickup they link to.
drop policy if exists "anon full access" on delivery_assets;
drop policy if exists "authenticated full access" on delivery_assets;
create policy "authenticated full access" on delivery_assets for all
  using (exists (select 1 from deliveries d where d.id = delivery_assets.delivery_id and user_can_access_branch(d.branch_id)))
  with check (exists (select 1 from deliveries d where d.id = delivery_assets.delivery_id and user_can_access_branch(d.branch_id)));

drop policy if exists "anon full access" on pickup_assets;
drop policy if exists "authenticated full access" on pickup_assets;
create policy "authenticated full access" on pickup_assets for all
  using (exists (select 1 from pickups p where p.id = pickup_assets.pickup_id and user_can_access_branch(p.branch_id)))
  with check (exists (select 1 from pickups p where p.id = pickup_assets.pickup_id and user_can_access_branch(p.branch_id)));

-- item_master and storage policies are untouched: item_master is a global
-- catalog, not branch data, and asset-photos objects don't carry branch
-- info, so neither can be meaningfully scoped without a bigger change.

-- Rollout safety: every existing account defaults to executive the moment
-- this runs, so nobody already using the app gets locked out. Go to
-- Supabase Dashboard > Table Editor > user_profiles afterward and
-- downgrade specific accounts to a scoped role, then add their branch(es)
-- in user_branch_access, at your own pace.
insert into user_profiles (user_id, role)
select id, 'executive' from auth.users
on conflict (user_id) do nothing;
