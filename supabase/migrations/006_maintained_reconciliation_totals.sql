-- Fixes a real production timeout: reconciliation_summary was a view that
-- recomputed its delivered/picked sums from scratch on every read, via a
-- GROUP BY scanning the full deliveries/pickups tables. That was fine at a
-- few hundred rows but started exceeding Supabase's statement timeout for
-- ordinary app requests once those tables reached hundreds of thousands of
-- rows (observed directly: "canceling statement due to statement timeout"
-- on the mobile app's normal load, not a big one-off query).
--
-- The fix: maintain the sums incrementally instead of recomputing them.
-- check_for_equipment_loss() (see schema.sql) already computes exactly
-- these per-pair sums via an indexed query every time a delivery/pickup is
-- inserted/updated — this migration has it also write those sums into a
-- small table (reconciliation_totals, one row per distinct branch+item
-- pair, bounded regardless of transaction volume) at zero extra query
-- cost. reconciliation_summary becomes a thin join over that table instead
-- of a live aggregate.
--
-- Run this via a direct database connection (e.g. DBeaver), not the
-- Supabase dashboard's SQL Editor — the one-time backfill below is a full
-- GROUP BY scan and, depending on how much data you've already got, may
-- be slow enough that the dashboard's own connection handling gets in the
-- way, the same issue seen loading synthetic volume earlier.

create table if not exists reconciliation_totals (
  branch_id bigint not null references branches(id),
  item_id bigint not null references item_master(id),
  delivered numeric not null default 0,
  picked numeric not null default 0,
  primary key (branch_id, item_id)
);

alter table reconciliation_totals enable row level security;

drop policy if exists "anon full access" on reconciliation_totals;
create policy "anon full access" on reconciliation_totals for all using (true) with check (true);

-- Same function body as schema.sql, with the incremental upsert added
-- right after the sums it already computes.
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

  insert into reconciliation_totals (branch_id, item_id, delivered, picked)
    values (v_branch_id, v_item_id, v_delivered, v_picked)
    on conflict (branch_id, item_id) do update
      set delivered = excluded.delivered, picked = excluded.picked;

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

-- One-time backfill for data that predates this migration — every pair
-- with existing completed deliveries/pickups needs its starting totals
-- computed once. From here on, the trigger above keeps this current
-- without ever re-scanning the full tables again.
insert into reconciliation_totals (branch_id, item_id, delivered, picked)
select
  coalesce(d.branch_id, p.branch_id),
  coalesce(d.item_id, p.item_id),
  coalesce(d.delivered, 0),
  coalesce(p.picked, 0)
from (
  select branch_id, item_id, sum(coalesce(confirmed_qty, qty)) as delivered
  from deliveries
  where status = 'completed'
  group by branch_id, item_id
) d
full outer join (
  select branch_id, item_id, sum(coalesce(confirmed_qty, qty)) as picked
  from pickups
  where status = 'completed'
  group by branch_id, item_id
) p on p.branch_id = d.branch_id and p.item_id = d.item_id
on conflict (branch_id, item_id) do update
  set delivered = excluded.delivered, picked = excluded.picked;

-- The old view's delivered/picked/on_hand summed integer qty columns
-- (bigint); the new one reads them from reconciliation_totals (numeric).
-- create or replace view can't change a column's type, so drop first.
drop view if exists reconciliation_summary;

create view reconciliation_summary
  with (security_invoker = true)
as
select
  rt.branch_id,
  rt.item_id,
  rt.delivered,
  rt.picked,
  rt.delivered - rt.picked as on_hand,
  coalesce(rr.reviewed, false) as reviewed
from reconciliation_totals rt
left join reconciliation_reviews rr
  on rr.branch_id = rt.branch_id and rr.item_id = rt.item_id;
