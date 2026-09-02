-- Incremental migration: indexes + a server-side reconciliation aggregate,
-- needed once transaction volume grows past a small demo dataset. Run this
-- in the SQL Editor on a project that already has schema.sql applied.
--
-- Why this matters: check_for_equipment_loss() (see schema.sql) runs two
-- SUM queries filtered by (branch_id, item_id, status='completed') on every
-- single insert/update to deliveries or pickups. Without an index those are
-- full table scans — fine at a few hundred rows, ruinous at millions, and it
-- gets slower with every row added since the table it's scanning keeps
-- growing. The app's list screens and Home stats have the same shape of
-- problem on the read side (see the accompanying app changes).

-- Partial indexes: only cover the rows each real query actually filters by,
-- so they stay smaller and faster than indexing the whole table.
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

-- List-screen sorting (most recent first) and pagination.
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
-- transaction volume. A company with 40 branches and 300 catalog items has
-- at most 12,000 rows here even after millions of delivery/pickup tickets,
-- versus the old approach of shipping every raw row to the client and
-- summing them in JavaScript. Reviewed state joins in from
-- reconciliation_reviews so the app gets status in one query.
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

-- security_invoker above makes RLS on the underlying tables apply using the
-- querying role, so no separate policy is needed on the view itself —
-- deliveries/pickups/reconciliation_reviews already have their own "anon
-- full access" policies, and this view will honor whatever replaces them
-- later without needing to be touched again.
