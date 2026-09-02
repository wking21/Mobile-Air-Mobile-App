-- Closes a real gap before the app goes on any real device: every table's
-- RLS policy was "using (true)" — anyone holding the app's anon key (baked
-- into the compiled binary, extractable from any distributed build, even an
-- internal TestFlight one) could read and write the entire company's
-- delivery/pickup/asset data with no login at all. Fine while the app only
-- ever ran in Expo Go on a couple of trusted devices; not fine once it's
-- built and handed to drivers/staff as a real app.
--
-- The fix: require auth.role() = 'authenticated' instead of true. The app
-- has no per-branch access restriction in its own UI today (any signed-in
-- user can log a delivery/pickup for any branch via a plain picker), so
-- this migration doesn't add one either — it only requires that whoever is
-- making the request actually signed in as a known user. Create accounts
-- for your staff under Supabase Dashboard > Authentication > Users before
-- running this, or everyone gets locked out of the mobile app until they
-- have a login.
--
-- This is metadata-only (no table scan, no data change) and safe to run via
-- either the Supabase Dashboard SQL Editor or DBeaver regardless of table
-- size.

drop policy if exists "anon full access" on branches;
drop policy if exists "authenticated full access" on branches;
create policy "authenticated full access" on branches for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on item_master;
drop policy if exists "authenticated full access" on item_master;
create policy "authenticated full access" on item_master for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on deliveries;
drop policy if exists "authenticated full access" on deliveries;
create policy "authenticated full access" on deliveries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on pickups;
drop policy if exists "authenticated full access" on pickups;
create policy "authenticated full access" on pickups for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on reconciliation_reviews;
drop policy if exists "authenticated full access" on reconciliation_reviews;
create policy "authenticated full access" on reconciliation_reviews for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on reconciliation_totals;
drop policy if exists "authenticated full access" on reconciliation_totals;
create policy "authenticated full access" on reconciliation_totals for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on equipment_losses;
drop policy if exists "authenticated full access" on equipment_losses;
create policy "authenticated full access" on equipment_losses for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on assets;
drop policy if exists "authenticated full access" on assets;
create policy "authenticated full access" on assets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on delivery_assets;
drop policy if exists "authenticated full access" on delivery_assets;
create policy "authenticated full access" on delivery_assets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "anon full access" on pickup_assets;
drop policy if exists "authenticated full access" on pickup_assets;
create policy "authenticated full access" on pickup_assets for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage: read stays open (the bucket is "public", so files are served at
-- their public URL regardless of this policy either way) but uploads now
-- require a signed-in user, so a stranger with the anon key can't write
-- arbitrary files into the bucket.
drop policy if exists "asset-photos anon upload" on storage.objects;
drop policy if exists "asset-photos authenticated upload" on storage.objects;
create policy "asset-photos authenticated upload" on storage.objects for insert with check (bucket_id = 'asset-photos' and auth.role() = 'authenticated');
