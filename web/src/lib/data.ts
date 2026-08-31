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

// Single query pass the dashboard page renders from. Mirrors the mobile
// app's data model (see ../../../src/api/dataService.ts) but reads
// straight from Supabase server-side — no realtime subscription needed
// for a report that's fresh on every page load.
export async function fetchDashboardData(): Promise<DashboardData> {
  const [branchesRes, itemsRes, lossesRes, deliveriesRes, pickupsRes] = await Promise.all([
    supabase.from('branches').select('id, name').order('id'),
    supabase.from('item_master').select('id, name, category').order('id'),
    supabase
      .from('equipment_losses')
      .select('id, branch_id, item_id, quantity_missing, estimated_cost, status, assigned_to, created_at'),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('pickups').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
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
