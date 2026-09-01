-- Corrects a wrong assumption in migration 004: Infor already generates and
-- owns the QR code / Asset Number association for serialized equipment —
-- this app was never meant to invent its own numbering scheme or print new
-- QR codes. The scanned value from an existing Infor QR tag IS the real
-- Infor Asset Number, so there's no placeholder-to-real reconciliation step
-- to design for; manufacturer_serial and infor_synced_at existed only to
-- support that reconciliation and are no longer needed.
--
-- assets.asset_number now always holds a real Infor Asset Number, captured
-- by scanning the tag already on the equipment (see the mobile app's Scan
-- Asset flow). What this table still adds — and the reason it exists at
-- all — is current_branch_id/status: live per-asset location, which
-- neither Texada nor Infor tracks today.

alter table assets drop column if exists manufacturer_serial;
alter table assets drop column if exists infor_synced_at;
