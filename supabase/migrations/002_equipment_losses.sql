-- Incremental migration for an existing project that already ran schema.sql
-- once. Adds the equipment loss workflow. Run this in the SQL Editor —
-- it's the exact same block that's now folded into schema.sql for fresh
-- installs, split out here so you don't have to re-run the whole script
-- (and re-duplicate the seed data) on a project that already has data.

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

alter table equipment_losses enable row level security;

drop policy if exists "anon full access" on equipment_losses;
create policy "anon full access" on equipment_losses for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'equipment_losses'
  ) then
    alter publication supabase_realtime add table equipment_losses;
  end if;
end $$;

-- Backfill: open a loss case for any (branch, item) pair that's already
-- negative on-hand right now, so existing discrepancies (e.g. the demo
-- 10x10 Canopy Tent / North Branch data) get a case instead of only new
-- ones going forward.
do $$
declare
  r record;
begin
  for r in
    select d.branch_id, d.item_id,
           coalesce(sum(d.amt), 0) - coalesce((
             select sum(coalesce(p.confirmed_qty, p.qty))
             from pickups p
             where p.branch_id = d.branch_id and p.item_id = d.item_id and p.status = 'completed'
           ), 0) as on_hand
    from (
      select branch_id, item_id, coalesce(confirmed_qty, qty) as amt
      from deliveries where status = 'completed'
    ) d
    group by d.branch_id, d.item_id
  loop
    if r.on_hand < 0 then
      insert into equipment_losses (branch_id, item_id, quantity_missing, estimated_cost)
      select r.branch_id, r.item_id, abs(r.on_hand)::integer, abs(r.on_hand) * im.unit_cost
      from item_master im
      where im.id = r.item_id
        and not exists (
          select 1 from equipment_losses el
          where el.branch_id = r.branch_id and el.item_id = r.item_id and el.status in ('open', 'pending_approval')
        );
    end if;
  end loop;
end $$;
