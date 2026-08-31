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

export interface DateRange {
  /** ISO yyyy-mm-dd, inclusive. Omit for open-ended ("all time"). */
  from?: string;
  /** ISO yyyy-mm-dd, inclusive. Omit for open-ended ("all time"). */
  to?: string;
}

// Single query pass the dashboard page renders from. Mirrors the mobile
// app's data model (see ../../../src/api/dataService.ts) but reads
// straight from Supabase server-side — no realtime subscription needed
// for a report that's fresh on every page load.
//
// The date range scopes loss cases by when they were opened (created_at)
// and completed deliveries/pickups by when the job happened (date) — the
// same range applied to both, so every number on the page agrees.
export async function fetchDashboardData(range: DateRange = {}): Promise<DashboardData> {
  let lossesQuery = supabase
    .from('equipment_losses')
    .select('id, branch_id, item_id, quantity_missing, estimated_cost, status, assigned_to, created_at');
  let deliveriesQuery = supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'completed');
  let pickupsQuery = supabase.from('pickups').select('id', { count: 'exact', head: true }).eq('status', 'completed');

  if (range.from) {
    lossesQuery = lossesQuery.gte('created_at', range.from);
    deliveriesQuery = deliveriesQuery.gte('date', range.from);
    pickupsQuery = pickupsQuery.gte('date', range.from);
  }
  if (range.to) {
    // created_at is a timestamp; a plain date bound needs the next day to
    // be inclusive of everything that happened on `to`.
    const toExclusive = new Date(range.to + 'T00:00:00Z');
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    lossesQuery = lossesQuery.lt('created_at', toExclusive.toISOString());
    deliveriesQuery = deliveriesQuery.lte('date', range.to);
    pickupsQuery = pickupsQuery.lte('date', range.to);
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
