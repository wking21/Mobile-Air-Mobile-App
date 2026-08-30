import { Branch, CompleteLineItemInput, EquipmentLoss, ItemMaster, LineItem, NewLineItemInput } from '../types';
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

export async function fetchDeliveries(): Promise<LineItem[]> {
  const { data, error } = await supabase.from('deliveries').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data as DbLineItem[]).map(fromDbLineItem);
}

export async function fetchPickups(): Promise<LineItem[]> {
  const { data, error } = await supabase.from('pickups').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data as DbLineItem[]).map(fromDbLineItem);
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

async function completeEntry(table: 'deliveries' | 'pickups', input: CompleteLineItemInput): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({
      status: 'completed',
      confirmed_qty: input.confirmedQty,
      completion_notes: input.completionNotes,
      completed_at: todayIso(),
    })
    .eq('id', input.id);
  if (error) throw error;
}

// Marks a delivery completed once the field technician on-site confirms the
// actual quantity delivered. Note: no email/notification integration yet —
// deferred until that backend function is built.
export async function completeDelivery(input: CompleteLineItemInput): Promise<void> {
  await completeEntry('deliveries', input);
}

export async function completePickup(input: CompleteLineItemInput): Promise<void> {
  await completeEntry('pickups', input);
}

// Reconciliation review state: presence of a row means that (branch, item)
// pair has been marked reviewed. Shared across every device via the DB
// instead of local component state.
export async function fetchReviewedKeys(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('reconciliation_reviews').select('branch_id, item_id');
  if (error) throw error;
  const map: Record<string, boolean> = {};
  data.forEach(row => {
    map[`${row.branch_id}-${row.item_id}`] = true;
  });
  return map;
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
