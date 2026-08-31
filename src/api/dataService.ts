import {
  Branch,
  CompleteLineItemInput,
  EquipmentLoss,
  ItemMaster,
  LineItem,
  NewLineItemInput,
  ReconciliationRow,
} from '../types';
import { supabase } from './supabaseClient';

// Data-access layer backed by Supabase (Postgres + realtime). This is the
// only module the rest of the app talks to for data — screens and state
// never import supabaseClient directly, so the backend can change again
// later (e.g. adding a Texada/Infor sync) without touching UI code.

interface DbLineItem {
  id: string;
  branch_id: number;
  item_id: number;
  qty: number;
  date: string;
  notes: string | null;
  status: 'planned' | 'completed';
  confirmed_qty: number | null;
  completed_at: string | null;
  completion_notes: string | null;
}

function fromDbLineItem(row: DbLineItem): LineItem {
  return {
    id: row.id,
    branchId: row.branch_id,
    itemId: row.item_id,
    qty: row.qty,
    date: row.date,
    notes: row.notes ?? '',
    status: row.status,
    confirmedQty: row.confirmed_qty ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completionNotes: row.completion_notes ?? undefined,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data, error } = await supabase.from('branches').select('*').order('id');
  if (error) throw error;
  return data.map(b => ({
    id: b.id,
    name: b.name,
    region: b.region,
    serviceManagerEmail: b.service_manager_email,
  }));
}

export async function fetchItems(): Promise<ItemMaster[]> {
  const { data, error } = await supabase.from('item_master').select('*').order('id');
  if (error) throw error;
  return data.map(i => ({ id: i.id, name: i.name, category: i.category, unitCost: Number(i.unit_cost) }));
}

// Deliveries/pickups lists are paginated (see fetchDeliveriesPage/fetchPickupsPage
// below) rather than fetched in full — at millions of rows an unbounded fetch
// would blow past device memory and load time. These two capped fetches remain
// only for the two call sites that genuinely need a bounded slice rather than
// a scrollable page: the Home screen's recent-activity card and completion
// flows that need to hand a freshly-updated single row back to a screen.

export const LINE_ITEM_PAGE_SIZE = 30;

export interface LineItemPage {
  items: LineItem[];
  hasMore: boolean;
}

async function fetchLineItemPage(table: 'deliveries' | 'pickups', page: number): Promise<LineItemPage> {
  const from = page * LINE_ITEM_PAGE_SIZE;
  const to = from + LINE_ITEM_PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  const items = (data as DbLineItem[]).map(fromDbLineItem);
  return { items, hasMore: items.length === LINE_ITEM_PAGE_SIZE };
}

// page is 0-based. Uses idx_deliveries_date_id / idx_pickups_date_id for the
// sort, so paging stays fast regardless of how many rows are behind it.
export function fetchDeliveriesPage(page: number): Promise<LineItemPage> {
  return fetchLineItemPage('deliveries', page);
}

export function fetchPickupsPage(page: number): Promise<LineItemPage> {
  return fetchLineItemPage('pickups', page);
}

// Completed entries for one (branch, item) pair — the line-item breakdown
// behind a single reconciliation_summary row. Bounded by definition: this is
// every entry that ever contributed to that one branch+item's totals, not the
// whole table, and idx_deliveries_branch_item_completed /
// idx_pickups_branch_item_completed cover exactly this filter shape.
async function fetchCompletedEntriesFor(
  table: 'deliveries' | 'pickups',
  branchId: number,
  itemId: number
): Promise<LineItem[]> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('branch_id', branchId)
    .eq('item_id', itemId)
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as DbLineItem[]).map(fromDbLineItem);
}

export function fetchCompletedDeliveriesFor(branchId: number, itemId: number): Promise<LineItem[]> {
  return fetchCompletedEntriesFor('deliveries', branchId, itemId);
}

export function fetchCompletedPickupsFor(branchId: number, itemId: number): Promise<LineItem[]> {
  return fetchCompletedEntriesFor('pickups', branchId, itemId);
}

export async function fetchOpenCounts(): Promise<{ openDeliveries: number; openPickups: number }> {
  const [d, p] = await Promise.all([
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('status', 'planned'),
    supabase.from('pickups').select('*', { count: 'exact', head: true }).eq('status', 'planned'),
  ]);
  if (d.error) throw d.error;
  if (p.error) throw p.error;
  return { openDeliveries: d.count ?? 0, openPickups: p.count ?? 0 };
}

export interface RecentActivityEntry extends LineItem {
  typeLabel: 'Delivered' | 'Picked up';
}

// Home screen's "Recent activity" card only ever shows a handful of rows, so
// it pulls its own small top-N slice from each table instead of deriving it
// from whatever the Deliveries/Pickups screens happen to have paged in.
export async function fetchRecentActivity(limit = 6): Promise<RecentActivityEntry[]> {
  const [d, p] = await Promise.all([
    supabase.from('deliveries').select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(limit),
    supabase.from('pickups').select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(limit),
  ]);
  if (d.error) throw d.error;
  if (p.error) throw p.error;
  const combined: RecentActivityEntry[] = [
    ...(d.data as DbLineItem[]).map(row => ({ ...fromDbLineItem(row), typeLabel: 'Delivered' as const })),
    ...(p.data as DbLineItem[]).map(row => ({ ...fromDbLineItem(row), typeLabel: 'Picked up' as const })),
  ];
  return combined
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

export async function createDelivery(input: NewLineItemInput): Promise<LineItem> {
  const { data, error } = await supabase
    .from('deliveries')
    .insert({ branch_id: input.branchId, item_id: input.itemId, qty: input.qty, date: input.date, notes: input.notes })
    .select()
    .single();
  if (error) throw error;
  return fromDbLineItem(data as DbLineItem);
}

export async function createPickup(input: NewLineItemInput): Promise<LineItem> {
  const { data, error } = await supabase
    .from('pickups')
    .insert({ branch_id: input.branchId, item_id: input.itemId, qty: input.qty, date: input.date, notes: input.notes })
    .select()
    .single();
  if (error) throw error;
  return fromDbLineItem(data as DbLineItem);
}

async function completeEntry(table: 'deliveries' | 'pickups', input: CompleteLineItemInput): Promise<LineItem> {
  const { data, error } = await supabase
    .from(table)
    .update({
      status: 'completed',
      confirmed_qty: input.confirmedQty,
      completion_notes: input.completionNotes,
      completed_at: todayIso(),
    })
    .eq('id', input.id)
    .select()
    .single();
  if (error) throw error;
  return fromDbLineItem(data as DbLineItem);
}

// Marks a delivery completed once the field technician on-site confirms the
// actual quantity delivered. Note: no email/notification integration yet —
// deferred until that backend function is built. Returns the updated row so
// callers can patch their own local list state instead of refetching a page.
export function completeDelivery(input: CompleteLineItemInput): Promise<LineItem> {
  return completeEntry('deliveries', input);
}

export function completePickup(input: CompleteLineItemInput): Promise<LineItem> {
  return completeEntry('pickups', input);
}

// Reconciliation is aggregated server-side by the reconciliation_summary view
// (see supabase/migrations/003_scale_indexes_and_summary.sql) instead of being
// computed here from the full deliveries/pickups tables — at millions of rows,
// shipping every raw row to the client and summing in JS doesn't scale, while
// this view's row count only grows with the number of distinct (branch, item)
// pairs that have ever had activity.
export async function fetchReconciliationSummary(): Promise<ReconciliationRow[]> {
  const { data, error } = await supabase.from('reconciliation_summary').select('*');
  if (error) throw error;
  return data.map(row => {
    const isDiscrepancy = row.on_hand < 0;
    const isReviewed = row.reviewed;
    return {
      key: `${row.branch_id}-${row.item_id}`,
      branchId: row.branch_id,
      itemId: row.item_id,
      delivered: row.delivered,
      picked: row.picked,
      onHand: row.on_hand,
      isDiscrepancy,
      isReviewed,
      status: isDiscrepancy ? 'Discrepancy' : isReviewed ? 'Reviewed' : 'Pending',
    };
  });
}

export async function setReviewed(branchId: number, itemId: number, reviewed: boolean): Promise<void> {
  if (reviewed) {
    const { error } = await supabase
      .from('reconciliation_reviews')
      .upsert({ branch_id: branchId, item_id: itemId, reviewed: true, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('reconciliation_reviews')
      .delete()
      .eq('branch_id', branchId)
      .eq('item_id', itemId);
    if (error) throw error;
  }
}

interface DbEquipmentLoss {
  id: string;
  branch_id: number;
  item_id: number;
  quantity_missing: number;
  estimated_cost: number;
  status: 'open' | 'pending_approval' | 'resolved';
  assigned_to: string | null;
  resolution_notes: string | null;
  submitted_for_approval_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_notes: string | null;
  created_at: string;
  updated_at: string;
}

function fromDbLoss(row: DbEquipmentLoss): EquipmentLoss {
  return {
    id: row.id,
    branchId: row.branch_id,
    itemId: row.item_id,
    quantityMissing: row.quantity_missing,
    estimatedCost: Number(row.estimated_cost),
    status: row.status,
    assignedTo: row.assigned_to ?? undefined,
    resolutionNotes: row.resolution_notes ?? undefined,
    submittedForApprovalAt: row.submitted_for_approval_at ?? undefined,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectionNotes: row.rejection_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Loss cases are auto-created/updated by a database trigger whenever a
// branch+item pair's on-hand count goes negative (see supabase/schema.sql) —
// this module only ever reads them and moves them through the owner/approval
// workflow, it never opens or closes a case's underlying discrepancy itself.
export async function fetchLossCases(): Promise<EquipmentLoss[]> {
  const { data, error } = await supabase.from('equipment_losses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DbEquipmentLoss[]).map(fromDbLoss);
}

export async function assignLossOwner(id: string, assignedTo: string): Promise<void> {
  const { error } = await supabase.from('equipment_losses').update({ assigned_to: assignedTo }).eq('id', id);
  if (error) throw error;
}

export async function submitLossResolution(id: string, resolutionNotes: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_losses')
    .update({
      status: 'pending_approval',
      resolution_notes: resolutionNotes,
      submitted_for_approval_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function approveLoss(id: string, approvedBy: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_losses')
    .update({ status: 'resolved', approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectLoss(id: string, rejectionNotes: string): Promise<void> {
  const { error } = await supabase
    .from('equipment_losses')
    .update({ status: 'open', rejection_notes: rejectionNotes })
    .eq('id', id);
  if (error) throw error;
}

// One realtime channel covering everything the app needs to stay in sync
// across devices. Callers get a single onChange callback — simplest to
// reason about at this data volume; re-fetches the affected list rather
// than trying to patch individual rows in from the payload.
export function subscribeToRealtimeChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('ancillary-reconciliation-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reconciliation_reviews' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_losses' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
