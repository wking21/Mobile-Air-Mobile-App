import { supabase } from './supabaseClient';

export interface Branch {
  id: number;
  name: string;
}

export interface ItemMaster {
  id: number;
  name: string;
  category: string;
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

export interface DashboardData {
  branches: Branch[];
  items: ItemMaster[];
  lossCases: LossCase[];
  completedDeliveryCount: number;
  completedPickupCount: number;
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
// Filtering happens once, here, rather than being bolted onto individual
// components downstream — every number on the page (stat cards, both
// tables, both charts, the open-case list) is computed from this same
// filtered dataset, so drilling into a branch or item scopes everything
// at once instead of some pieces filtering and others not.
export async function fetchDashboardData(filters: DashboardFilters = {}): Promise<DashboardData> {
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

  const [branchesRes, itemsRes, lossesRes, deliveriesRes, pickupsRes] = await Promise.all([
    supabase.from('branches').select('id, name').order('id'),
    supabase.from('item_master').select('id, name, category').order('id'),
    lossesQuery,
    deliveriesQuery,
    pickupsQuery,
  ]);

  if (branchesRes.error) throw branchesRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (lossesRes.error) throw lossesRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;
  if (pickupsRes.error) throw pickupsRes.error;

  return {
    branches: branchesRes.data,
    items: itemsRes.data,
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
  };
}
