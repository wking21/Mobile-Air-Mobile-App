import type { SupabaseClient } from '@supabase/supabase-js';

export interface Branch {
  id: number;
  name: string;
}

export interface ItemMaster {
  id: number;
  name: string;
  category: string;
  isSerialized: boolean;
}

export interface LossCase {
  id: string;
  branchId: number;
  itemId: number;
  quantityMissing: number;
  estimatedCost: number;
  status: 'open' | 'pending_approval' | 'resolved';
  assignedTo: string | null;
  createdAt: string;
}

// One row per item that currently has any activity. currentlyOut mirrors
// the mobile app's reconciliation view (delivered-minus-picked) and works
// for every item, serialized or not. availableUnits/inUseUnits only exist
// for is_serialized items, since those are the only ones with individually
// scanned units (the `assets` table) — for everything else we have no
// concept of total fleet size, so "available" can't be computed at all.
// currentlyOut and inUseUnits can legitimately disagree for a serialized
// item: scanning a unit at delivery/pickup is optional, so a delivery's
// confirmed qty can outrun how many of its specific units actually got
// scanned.
export interface InventoryItemRow {
  itemId: number;
  itemName: string;
  category: string;
  isSerialized: boolean;
  currentlyOut: number;
  availableUnits: number | null;
  inUseUnits: number | null;
}

// A specific serialized unit that's out on delivery right now, and the
// delivery ticket it's tied to — the closest thing this app has to "what
// contract it's occupied with" until Infor contract data is connected.
export interface OutstandingAssetRow {
  assetId: string;
  assetNumber: string;
  itemId: number;
  itemName: string;
  branchId: number | null;
  branchName: string;
  deliveryDate: string | null;
}

// Same figures as InventoryItemRow, rolled up by branch instead of by item.
// Unlike the per-item view, availableUnits/inUseUnits are never null here —
// "zero serialized units at this branch" is a real, meaningful answer for a
// branch (there's no per-branch equivalent of "we don't track this item
// type" the way there is per-item).
export interface BranchInventoryRow {
  branchId: number;
  branchName: string;
  currentlyOut: number;
  availableUnits: number;
  inUseUnits: number;
}

export interface DashboardData {
  branches: Branch[];
  items: ItemMaster[];
  lossCases: LossCase[];
  completedDeliveryCount: number;
  completedPickupCount: number;
  inventory: InventoryItemRow[];
  branchInventory: BranchInventoryRow[];
  outstandingAssets: OutstandingAssetRow[];
}

export interface DashboardFilters {
  /** ISO yyyy-mm-dd, inclusive. Omit for open-ended ("all time"). */
  from?: string;
  /** ISO yyyy-mm-dd, inclusive. Omit for open-ended ("all time"). */
  to?: string;
  /** Drill-down: scope everything to one branch. Mutually exclusive with itemId in the UI. */
  branchId?: number;
  /** Drill-down: scope everything to one item. Mutually exclusive with branchId in the UI. */
  itemId?: number;
}

// Single query pass the dashboard page renders from. Mirrors the mobile
// app's data model (see ../../../src/api/dataService.ts) but reads
// straight from Supabase server-side — no realtime subscription needed
// for a report that's fresh on every page load.
//
// Takes the caller's own per-request Supabase client (see
// lib/supabase/server.ts) rather than importing a shared one — every page
// creates that client bound to its own request's session cookie, so
// queries here run AS that signed-in user and RLS (role/branch scoping,
// see supabase/migrations/008_role_based_access.sql) applies exactly the
// way it does on the mobile app.
//
// Filtering happens once, here, rather than being bolted onto individual
// components downstream — every number on the page (stat cards, both
// tables, both charts, the open-case list) is computed from this same
// filtered dataset, so drilling into a branch or item scopes everything
// at once instead of some pieces filtering and others not.
export async function fetchDashboardData(supabase: SupabaseClient, filters: DashboardFilters = {}): Promise<DashboardData> {
  let lossesQuery = supabase
    .from('equipment_losses')
    .select('id, branch_id, item_id, quantity_missing, estimated_cost, status, assigned_to, created_at');
  let deliveriesQuery = supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'completed');
  let pickupsQuery = supabase.from('pickups').select('id', { count: 'exact', head: true }).eq('status', 'completed');

  if (filters.from) {
    lossesQuery = lossesQuery.gte('created_at', filters.from);
    deliveriesQuery = deliveriesQuery.gte('date', filters.from);
    pickupsQuery = pickupsQuery.gte('date', filters.from);
  }
  if (filters.to) {
    // created_at is a timestamp; a plain date bound needs the next day to
    // be inclusive of everything that happened on `to`.
    const toExclusive = new Date(filters.to + 'T00:00:00Z');
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    lossesQuery = lossesQuery.lt('created_at', toExclusive.toISOString());
    deliveriesQuery = deliveriesQuery.lte('date', filters.to);
    pickupsQuery = pickupsQuery.lte('date', filters.to);
  }
  if (filters.branchId !== undefined) {
    lossesQuery = lossesQuery.eq('branch_id', filters.branchId);
    deliveriesQuery = deliveriesQuery.eq('branch_id', filters.branchId);
    pickupsQuery = pickupsQuery.eq('branch_id', filters.branchId);
  }
  if (filters.itemId !== undefined) {
    lossesQuery = lossesQuery.eq('item_id', filters.itemId);
    deliveriesQuery = deliveriesQuery.eq('item_id', filters.itemId);
    pickupsQuery = pickupsQuery.eq('item_id', filters.itemId);
  }

  // Inventory reflects right now, not a date range — the from/to filters
  // above don't apply here, only the branch/item drill-down does.
  let reconciliationQuery = supabase.from('reconciliation_summary').select('branch_id, item_id, on_hand');
  if (filters.branchId !== undefined) reconciliationQuery = reconciliationQuery.eq('branch_id', filters.branchId);
  if (filters.itemId !== undefined) reconciliationQuery = reconciliationQuery.eq('item_id', filters.itemId);

  // Only at_branch/out_on_delivery matter for a "what's available vs in
  // use" view — lost/retired units are already covered by the loss-case
  // sections above. current_branch_id is null once a unit is out on
  // delivery, so branch-scoping "in use" units happens afterward via the
  // delivery they're linked to, not this column.
  let assetsQuery = supabase
    .from('assets')
    .select('id, asset_number, item_id, status, current_branch_id, delivery_assets(deliveries(id, branch_id, date))')
    .in('status', ['at_branch', 'out_on_delivery']);
  if (filters.itemId !== undefined) assetsQuery = assetsQuery.eq('item_id', filters.itemId);

  const [branchesRes, itemsRes, lossesRes, deliveriesRes, pickupsRes, reconciliationRes, assetsRes] = await Promise.all([
    supabase.from('branches').select('id, name').order('id'),
    supabase.from('item_master').select('id, name, category, is_serialized').order('id'),
    lossesQuery,
    deliveriesQuery,
    pickupsQuery,
    reconciliationQuery,
    assetsQuery,
  ]);

  if (branchesRes.error) throw branchesRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (lossesRes.error) throw lossesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;
  if (pickupsRes.error) throw pickupsRes.error;
  if (reconciliationRes.error) throw reconciliationRes.error;
  if (assetsRes.error) throw assetsRes.error;

  const branches = branchesRes.data;
  const items: ItemMaster[] = itemsRes.data.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    isSerialized: row.is_serialized,
  }));
  const branchName = (id: number | null) => branches.find(b => b.id === id)?.name ?? 'Unknown branch';

  const onHandByItem = new Map<number, number>();
  const onHandByBranch = new Map<number, number>();
  for (const row of reconciliationRes.data) {
    onHandByItem.set(row.item_id, (onHandByItem.get(row.item_id) ?? 0) + Number(row.on_hand));
    onHandByBranch.set(row.branch_id, (onHandByBranch.get(row.branch_id) ?? 0) + Number(row.on_hand));
  }

  type AssetJoinRow = {
    id: string;
    asset_number: string;
    item_id: number;
    status: string;
    current_branch_id: number | null;
    // Supabase's untyped client can't know delivery_id/asset_id is a 1:1
    // link here, so the nested relation comes back as an array either way.
    delivery_assets: { deliveries: { id: string; branch_id: number; date: string }[] | null }[];
  };

  // A unit can rack up delivery history over its lifetime; the one it's
  // CURRENTLY out on is whichever delivery linked to it most recently.
  function latestDelivery(row: AssetJoinRow) {
    const deliveries = row.delivery_assets.flatMap(link => link.deliveries ?? []);
    if (deliveries.length === 0) return null;
    return deliveries.reduce((latest, d) => (d.date > latest.date ? d : latest));
  }

  const availableByItem = new Map<number, number>();
  const inUseByItem = new Map<number, number>();
  const availableByBranch = new Map<number, number>();
  const inUseByBranch = new Map<number, number>();
  const outstandingAssets: OutstandingAssetRow[] = [];

  for (const row of assetsRes.data as AssetJoinRow[]) {
    if (row.status === 'at_branch') {
      if (filters.branchId !== undefined && row.current_branch_id !== filters.branchId) continue;
      availableByItem.set(row.item_id, (availableByItem.get(row.item_id) ?? 0) + 1);
      if (row.current_branch_id !== null) {
        availableByBranch.set(row.current_branch_id, (availableByBranch.get(row.current_branch_id) ?? 0) + 1);
      }
    } else {
      const delivery = latestDelivery(row);
      if (filters.branchId !== undefined && delivery?.branch_id !== filters.branchId) continue;
      inUseByItem.set(row.item_id, (inUseByItem.get(row.item_id) ?? 0) + 1);
      if (delivery) {
        inUseByBranch.set(delivery.branch_id, (inUseByBranch.get(delivery.branch_id) ?? 0) + 1);
      }
      outstandingAssets.push({
        assetId: row.id,
        assetNumber: row.asset_number,
        itemId: row.item_id,
        itemName: items.find(i => i.id === row.item_id)?.name ?? 'Unknown item',
        branchId: delivery?.branch_id ?? null,
        branchName: branchName(delivery?.branch_id ?? null),
        deliveryDate: delivery?.date ?? null,
      });
    }
  }

  const relevantItemIds = new Set([...onHandByItem.keys(), ...availableByItem.keys(), ...inUseByItem.keys()]);
  const inventory: InventoryItemRow[] = Array.from(relevantItemIds)
    .map(itemId => {
      const master = items.find(i => i.id === itemId);
      return {
        itemId,
        itemName: master?.name ?? 'Unknown item',
        category: master?.category ?? '',
        isSerialized: master?.isSerialized ?? false,
        currentlyOut: onHandByItem.get(itemId) ?? 0,
        availableUnits: master?.isSerialized ? (availableByItem.get(itemId) ?? 0) : null,
        inUseUnits: master?.isSerialized ? (inUseByItem.get(itemId) ?? 0) : null,
      };
    })
    .sort((a, b) => b.currentlyOut - a.currentlyOut);

  const relevantBranchIds = new Set([...onHandByBranch.keys(), ...availableByBranch.keys(), ...inUseByBranch.keys()]);
  const branchInventory: BranchInventoryRow[] = Array.from(relevantBranchIds)
    .map(branchId => ({
      branchId,
      branchName: branchName(branchId),
      currentlyOut: onHandByBranch.get(branchId) ?? 0,
      availableUnits: availableByBranch.get(branchId) ?? 0,
      inUseUnits: inUseByBranch.get(branchId) ?? 0,
    }))
    .sort((a, b) => b.currentlyOut - a.currentlyOut);

  return {
    branches,
    items,
    lossCases: lossesRes.data.map(row => ({
      id: row.id,
      branchId: row.branch_id,
      itemId: row.item_id,
      quantityMissing: row.quantity_missing,
      estimatedCost: Number(row.estimated_cost),
      status: row.status,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
    })),
    completedDeliveryCount: deliveriesRes.count ?? 0,
    completedPickupCount: pickupsRes.count ?? 0,
    inventory,
    branchInventory,
    outstandingAssets: outstandingAssets.sort((a, b) => (a.deliveryDate ?? '').localeCompare(b.deliveryDate ?? '')),
  };
}
