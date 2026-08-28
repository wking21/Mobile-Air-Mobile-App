# Ancillary Reconciliation

A React Native (Expo + TypeScript) mobile app for tracking ancillary equipment
(tables, chairs, tents, generators, coolers, etc.) delivered to and picked up
from branches, and reconciling what's still outstanding. It's a mobile
redesign of an existing AppSheet app built on the same data model: branches,
item_master, deliveries, and pickups.

## Running the app

```
npm install
npm start        # then press i (iOS simulator), a (Android emulator), or w (web)
```

## Structure

- `src/theme.ts` — design tokens (colors, radii, spacing, type scale), ported
  from the design handoff's oklch values to sRGB hex since React Native has no
  oklch support.
- `src/types.ts` — shared domain types (`Branch`, `ItemMaster`, `LineItem`, …).
- `src/data/mockData.ts` — seed data matching the source spreadsheet's
  branches and item_master tables.
- `src/api/dataService.ts` — the only module that should change when the app
  moves from in-memory mocks to a real REST/Sheets-backed API. Every function
  is already async and returns plain data.
- `src/state/AppContext.tsx` — app-wide data (branches, items, deliveries,
  pickups) plus derived reconciliation rows (`onHand = delivered - picked`,
  discrepancy/reviewed status).
- `src/state/SheetContext.tsx` — which "new delivery/pickup" bottom sheet is
  open, shared across the Home tab and the Deliver/Pickup tabs.
- `src/navigation/RootNavigator.tsx` — the 5-tab bottom navigator (Home,
  Deliver, Pickup, Items, Review) with geometric tab icons matching the design.
- `src/screens/` — one file per screen.
- `src/components/` — shared presentational pieces (stat cards, list rows,
  status pills, the segmented filter control, the entry form sheet, etc).

## Data model

Matches the source spreadsheet/AppSheet app:

- **branches**: BranchID, BranchName, Region, ServiceManagerEmail
- **item_master**: ItemID, ItemName, Category, UnitCost
- **deliveries** / **pickups**: id, BranchID, ItemID, Qty, Date, Notes

Reconciliation is a computed join over deliveries + pickups grouped by
(BranchID, ItemID) — not a stored table. `onHand < 0` flags a discrepancy
(more was picked up than delivered).
