-- Removes what seed_synthetic_volume.sql inserted directly, and nothing
-- else. Safe to run against a project that also has real data: every
-- synthetic delivery/pickup row is tagged notes = '[synthetic-load-test]',
-- so these two deletes only ever touch those rows.

delete from pickups where notes = '[synthetic-load-test]';
delete from deliveries where notes = '[synthetic-load-test]';

-- What this deliberately does NOT do, and why:
--
-- equipment_losses / reconciliation_reviews rows aren't tagged (they're
-- derived state the trigger/app writes, not something the seed script
-- inserts directly), so there's no safe, unambiguous way to auto-delete
-- "the synthetic ones" without risking a real loss case or review flag that
-- happens to share a (branch, item) pair with synthetic activity. Deleting
-- them all unconditionally would be destructive to real data on a project
-- that already had any — not a tradeoff to make automatically. Below is a
-- read-only query to see which ones are now stale (reference a pair with
-- zero remaining delivery/pickup activity) so you can review and delete by
-- hand if you're confident they're not real:
--
--   select * from equipment_losses el
--   where not exists (
--     select 1 from reconciliation_summary rs
--     where rs.branch_id = el.branch_id and rs.item_id = el.item_id
--   );
--
--   select * from reconciliation_reviews rr
--   where not exists (
--     select 1 from reconciliation_summary rs
--     where rs.branch_id = rr.branch_id and rs.item_id = rr.item_id
--   );
--
-- The extra branches (ids 5-12) and item_master rows (ids 9-30) added to
-- widen the dimension data are likewise left in place — harmless to keep,
-- and only safe to remove yourself once you've confirmed nothing (real or
-- synthetic) still references them:
--
--   delete from item_master where id between 9 and 30;
--   delete from branches where id between 5 and 12;
