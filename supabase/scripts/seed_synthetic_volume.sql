-- Synthetic volume generator for load-testing at ~$5-10M/month of business.
-- Run this yourself in the Supabase SQL Editor (Claude's sandbox can't reach
-- your project). It's for load-testing, not demo data — read the whole
-- header before running, especially the runtime note below and the cleanup
-- script alongside this one (cleanup_synthetic_volume.sql).
--
-- PREREQUISITES: schema.sql and migrations/003_scale_indexes_and_summary.sql
-- must already be applied. Without those indexes, check_for_equipment_loss()
-- (see schema.sql) runs a full table scan on every single row this script
-- inserts, and this will take drastically longer or time out.
--
-- HOW TO RUN THIS
-- This does NOT run to completion in one click. Every time you hit Run it
-- generates ONE MONTH of data and remembers where it left off (in a tiny
-- synthetic_seed_progress table this script creates) — so building the full
-- default 36 months means clicking Run about 36 times. That's deliberate:
-- Supabase's SQL Editor sends each query through its own dashboard gateway,
-- which times out a request that runs too long regardless of how the SQL
-- itself is written — a single query generating 3 years of data at once
-- will fail with a dashboard-level "Failed to fetch" error before Postgres
-- is anywhere near done, even though the same SQL runs fine over a raw
-- database connection with no such limit. One month per click keeps each
-- run comfortably short. Each run's NOTICE output tells you how many months
-- are left; once it says done, you're finished.
--
-- HOW THE VOLUME NUMBER WAS DERIVED
-- The schema doesn't track revenue at all (that was an explicit scope
-- decision — see the exec dashboard build), so there's no real number to
-- pull from. This translates the requested "$5-10M/month" into a row count
-- using a stated, adjustable assumption instead of inventing real figures:
--
--   monthly_revenue   $7,500,000   midpoint of the requested $5-10M/month
--   avg_job_value     $250         assumed blended revenue per rental job
--                                  (one delivery + its eventual pickup) —
--                                  a rough ancillary-equipment estimate,
--                                  used only to size this script, never
--                                  written to the database
--   jobs_per_month  = monthly_revenue / avg_job_value  = 30,000
--
-- Default total_months=36 (3 years of history) gives ~1,080,000 jobs total
-- across every run, landing at roughly 2.1M combined delivery+pickup rows
-- once you account for the small share of jobs left mid-flight (see outcome
-- mix below) — comfortably in the "millions of rows" range the
-- indexing/pagination work in this repo was built to handle. Change
-- total_months, monthly_revenue, or avg_job_value in the DO block below any
-- time — it's read fresh from synthetic_seed_progress on every run, so a
-- change takes effect on the next click of Run without losing progress on
-- the runs already done (only total_months affects how many runs remain;
-- changing monthly_revenue/avg_job_value changes the size of runs not yet
-- done).
--
-- OUTCOME MIX per generated job (branch + item + qty + dates), meant to look
-- like a real operation rather than uniform noise:
--   3%  delivery still 'planned'          (not yet delivered)
--   8%  delivered, pickup still 'planned' (equipment currently out)
--   10% delivered + picked up, but the recorded pickup qty is 1-3 MORE than
--       was delivered (a mis-scan / miscount) — this is what actually drives
--       on_hand negative and feeds check_for_equipment_loss(), populating
--       equipment_losses the same way it would in production. (A pickup qty
--       *below* what was delivered just means equipment still sitting on
--       site — normal positive on-hand, not a loss.)
--   79% delivered + picked up, exact qty match
--
-- IDENTIFYING / REMOVING THIS DATA LATER
-- Every synthetic row is tagged notes = '[synthetic-load-test]' so it can be
-- found and deleted without touching real data — see
-- cleanup_synthetic_volume.sql in this same folder (it also drops
-- synthetic_seed_progress).
--
-- STORAGE WARNING
-- The full run inserts on the order of 2 million rows total into
-- deliveries + pickups (plus whatever equipment_losses that creates). That
-- uses real storage on your project, likely more than fits a free-tier
-- plan — worth checking your plan's storage limit against that estimate
-- before running all ~36 months.

-- Optional: widen the dimension data so the reconciliation aggregate has a
-- realistic number of distinct (branch, item) pairs to group by instead of
-- concentrating millions of rows onto the 4 demo branches / 8 demo items.
-- Safe to skip (comment this block out) if you'd rather keep the existing
-- dimension rows as-is; it only ever adds rows, never touches your real ones.
-- Only needs to run once — subsequent runs of this script no-op here.
insert into branches (id, name, region, service_manager_email) values
  (5, 'Branch 05', 'North', 'branch05.manager@example.com'),
  (6, 'Branch 06', 'South', 'branch06.manager@example.com'),
  (7, 'Branch 07', 'Central', 'branch07.manager@example.com'),
  (8, 'Branch 08', 'East', 'branch08.manager@example.com'),
  (9, 'Branch 09', 'North', 'branch09.manager@example.com'),
  (10, 'Branch 10', 'South', 'branch10.manager@example.com'),
  (11, 'Branch 11', 'Central', 'branch11.manager@example.com'),
  (12, 'Branch 12', 'East', 'branch12.manager@example.com')
on conflict (id) do nothing;

insert into item_master (id, name, category, unit_cost) values
  (9, 'Round Table 8ft', 'Furniture', 55),
  (10, 'Bar Stool', 'Furniture', 18),
  (11, '20x20 Canopy Tent', 'Structures', 480),
  (12, 'Dance Floor Panel', 'Structures', 40),
  (13, 'Portable Generator 10kW', 'Equipment', 1100),
  (14, 'Pallet Jack Electric', 'Equipment', 900),
  (15, 'Rolling Cooler 300qt', 'Coolers', 150),
  (16, 'Patio Heater Tall', 'Equipment', 210),
  (17, 'Hand Dolly Heavy Duty', 'Equipment', 90),
  (18, 'Stage Deck 4x8', 'Structures', 320),
  (19, 'PA Speaker', 'Equipment', 275),
  (20, 'String Light Set 50ft', 'Furniture', 35),
  (21, 'Linen Tablecloth 90in', 'Furniture', 15),
  (22, 'Chafing Dish', 'Equipment', 42),
  (23, 'Ice Bin', 'Coolers', 60),
  (24, 'Extension Cord Reel', 'Equipment', 28),
  (25, 'Barricade 8ft', 'Structures', 75),
  (26, 'Traffic Cone', 'Equipment', 8),
  (27, 'Podium', 'Furniture', 130),
  (28, 'Projector Screen', 'Equipment', 160),
  (29, 'Fan Misting Unit', 'Equipment', 340),
  (30, 'Water Cooler Jug Station', 'Coolers', 70)
on conflict (id) do nothing;

-- Tracks how far this generator has gotten, so each click of Run does one
-- bounded chunk of work instead of one long-running statement. Safe to
-- re-run this script from scratch any time — cleanup_synthetic_volume.sql
-- drops this table along with the synthetic rows it produced.
create table if not exists synthetic_seed_progress (
  id int primary key default 1,
  cursor_date date not null,
  total_months int not null,
  months_done int not null default 0,
  check (id = 1)
);

insert into synthetic_seed_progress (id, cursor_date, total_months)
select 1, (current_date - interval '36 months')::date, 36
where not exists (select 1 from synthetic_seed_progress where id = 1)
on conflict (id) do nothing;

-- One run = one month of data. Click Run again to do the next month; the
-- NOTICE at the end says how many are left. No internal COMMIT here (that's
-- what broke under the Supabase SQL Editor the first time this script was
-- written — see git history) — each click is naturally its own top-level
-- transaction as far as the editor is concerned, which is exactly the
-- chunking this needs.
do $$
declare
  monthly_revenue numeric := 7500000; -- midpoint of the requested $5-10M/month
  avg_job_value numeric := 250;       -- assumed blended revenue per rental job — sizing only, never written to the DB

  progress record;
  window_start date;
  window_end date;
  total_days int;
  jobs_this_run bigint;
  branch_ids bigint[];
  item_ids bigint[];
begin
  select * into progress from synthetic_seed_progress where id = 1 for update;

  if progress.months_done >= progress.total_months then
    raise notice 'Already done: % of % months generated. Nothing to do — run cleanup_synthetic_volume.sql if you want to start over.',
      progress.months_done, progress.total_months;
    return;
  end if;

  select array_agg(id) into branch_ids from branches;
  select array_agg(id) into item_ids from item_master;

  if branch_ids is null or item_ids is null then
    raise exception 'branches and item_master must be seeded before running this script (see schema.sql)';
  end if;

  window_start := progress.cursor_date;
  window_end := least((window_start + interval '1 month')::date, current_date);
  total_days := greatest(window_end - window_start, 1);
  jobs_this_run := round((monthly_revenue / avg_job_value) * (total_days / 30.44));

  raise notice 'Generating month %/% (% to %): ~% jobs, ~% delivery+pickup rows...',
    progress.months_done + 1, progress.total_months, window_start, window_end, jobs_this_run, jobs_this_run * 2;

  create temporary table if not exists tmp_synthetic_jobs (
    branch_id bigint,
    item_id bigint,
    qty int,
    delivered_date date,
    picked_date date,
    outcome text
  );
  truncate tmp_synthetic_jobs;

  -- outcome_r is drawn once per row by the inner subquery, then compared
  -- against thresholds in the CASE below — random() directly inside each
  -- WHEN would re-draw a fresh value per branch checked, skewing the
  -- percentages documented above. (A `cross join lateral (select random())`
  -- looks like it should also give one draw per row, but since the
  -- subquery doesn't reference the outer row at all, Postgres's planner is
  -- free to treat it as uncorrelated and evaluate it exactly once for the
  -- whole query — confirmed against a real Postgres 16 instance while
  -- writing this script. Nesting random() in the outer SELECT list over a
  -- set-returning function, as below, is the version that's actually
  -- evaluated per row.)
  insert into tmp_synthetic_jobs (branch_id, item_id, qty, delivered_date, picked_date, outcome)
  select
    branch_ids[1 + floor(random() * array_length(branch_ids, 1))::int],
    item_ids[1 + floor(random() * array_length(item_ids, 1))::int],
    (1 + floor(random() * 30))::int,
    window_start + floor(random() * total_days)::int,
    null::date,
    case
      when outcome_r < 0.03 then 'not_yet_delivered'
      when outcome_r < 0.11 then 'not_yet_picked'
      when outcome_r < 0.21 then 'overpickup'
      else 'exact'
    end
  from (select random() as outcome_r from generate_series(1, jobs_this_run)) g;

  update tmp_synthetic_jobs
    set picked_date = delivered_date + (1 + floor(random() * 14))::int
    where outcome in ('exact', 'overpickup');

  insert into deliveries (branch_id, item_id, qty, date, notes, status, confirmed_qty, completed_at, completion_notes)
  select
    branch_id,
    item_id,
    qty,
    delivered_date,
    '[synthetic-load-test]',
    case when outcome = 'not_yet_delivered' then 'planned' else 'completed' end,
    case when outcome = 'not_yet_delivered' then null else qty end,
    case when outcome = 'not_yet_delivered' then null else delivered_date end,
    null
  from tmp_synthetic_jobs;

  insert into pickups (branch_id, item_id, qty, date, notes, status, confirmed_qty, completed_at, completion_notes)
  select
    branch_id,
    item_id,
    qty,
    picked_date,
    '[synthetic-load-test]',
    'completed',
    case when outcome = 'overpickup' then qty + (1 + floor(random() * 3))::int else qty end,
    picked_date,
    case when outcome = 'overpickup' then 'Recorded pickup count exceeds delivered count' else null end
  from tmp_synthetic_jobs
  where outcome in ('exact', 'overpickup');

  update synthetic_seed_progress
    set cursor_date = window_end, months_done = months_done + 1
    where id = 1;

  drop table if exists tmp_synthetic_jobs;

  if window_end >= current_date or progress.months_done + 1 >= progress.total_months then
    raise notice 'Done: % of % months generated. Run cleanup_synthetic_volume.sql whenever you want to remove this data.',
      progress.months_done + 1, progress.total_months;
  else
    raise notice '% of % months done — click Run again to continue.', progress.months_done + 1, progress.total_months;
  end if;
end $$;
