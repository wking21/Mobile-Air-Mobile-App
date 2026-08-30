# Ancillary Reconciliation

A React Native (Expo + TypeScript) mobile app for tracking ancillary equipment
(tables, chairs, tents, generators, coolers, etc.) delivered to and picked up
from branches, and reconciling what's still outstanding. It's a mobile
redesign of an existing AppSheet app built on the same data model: branches,
item_master, deliveries, and pickups. Data is backed by Supabase (Postgres +
realtime), shared live across every device.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's SQL Editor, run `supabase/schema.sql` (creates the
   tables, seeds demo data, sets permissive RLS policies, and enables
   realtime — see the comments in that file for what each part does).
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key
   (Project Settings > API in the Supabase dashboard).
4. `npm install`
5. `npm start` — then press `i` (iOS simulator), `a` (Android emulator), or
   `w` (web), or scan the QR code with Expo Go on a phone.

## Structure

- `supabase/schema.sql` — the database schema, demo seed data, RLS policies,
  and realtime publication setup. Source of truth for the data model.
- `src/theme.ts` — design tokens (colors, radii, spacing, type scale), ported
  from the design handoff's oklch values to sRGB hex since React Native has no
  oklch support.
- `src/types.ts` — shared domain types (`Branch`, `ItemMaster`, `LineItem`, …).
- `src/api/supabaseClient.ts` — the Supabase client instance, configured to
  persist auth sessions via AsyncStorage.
- `src/api/dataService.ts` — the only module that talks to Supabase directly;
  screens and state never import `supabaseClient` themselves. Swapping or
  adding a backend integration (e.g. syncing completions out to Texada or
  Infor) means changing this file, not the UI.
- `src/state/AppContext.tsx` — app-wide data (branches, items, deliveries,
  pickups) plus derived reconciliation rows (`onHand = delivered - picked`,
  discrepancy/reviewed status). Subscribes to Supabase realtime changes so
  every device stays in sync without a manual refresh.
- `src/state/SheetContext.tsx` — which "new delivery/pickup" bottom sheet is
  open, shared across the Home tab and the Deliver/Pickup tabs.
- `src/navigation/RootNavigator.tsx` — the 5-tab bottom navigator (Home,
  Deliver, Pickup, Items, Review) with geometric tab icons matching the design.
- `src/screens/` — one file per screen.
- `src/components/` — shared presentational pieces (stat cards, list rows,
  status pills, the segmented filter control, the entry/completion sheets, etc).

## Data model

Matches the source spreadsheet/AppSheet app, plus a completion workflow:

- **branches**: id, name, region, service_manager_email
- **item_master**: id, name, category, unit_cost
- **deliveries** / **pickups**: id, branch_id, item_id, qty, date, notes,
  `status` (`planned` | `completed`), confirmed_qty, completed_at,
  completion_notes
- **reconciliation_reviews**: (branch_id, item_id) marked reviewed in the
  Review tab

A delivery/pickup starts `planned` when logged, then a field technician
confirms the actual quantity handled to mark it `completed`. Reconciliation
is a computed join over *completed* deliveries + pickups grouped by
(branch_id, item_id) — not a stored table — using each entry's confirmed
quantity. `onHand < 0` flags a discrepancy (more was picked up than
delivered).

## Security note

The RLS policies in `supabase/schema.sql` currently grant full read/write
access to anyone with the anon key, since the app has no login step yet.
That's fine for internal testing but must be replaced with policies scoped
to an authenticated user/branch before this holds real operational or
financial data.
