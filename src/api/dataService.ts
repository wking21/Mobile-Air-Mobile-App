import { BRANCHES, DELIVERIES, ITEMS, PICKUPS } from '../data/mockData';
import { Branch, CompleteLineItemInput, ItemMaster, LineItem, NewLineItemInput } from '../types';

// Thin data-access layer. Every function is async and returns plain data,
// so this module is the only thing that needs to change when the backing
// store moves from in-memory mocks to a real REST/Sheets-backed API.
let deliveries: LineItem[] = [...DELIVERIES];
let pickups: LineItem[] = [...PICKUPS];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function completeEntry(list: LineItem[], input: CompleteLineItemInput): LineItem[] {
  return list.map(entry =>
    entry.id === input.id
      ? {
          ...entry,
          status: 'completed',
          confirmedQty: input.confirmedQty,
          completionNotes: input.completionNotes,
          completedAt: todayIso(),
        }
      : entry
  );
}

export async function fetchBranches(): Promise<Branch[]> {
  return BRANCHES;
}

export async function fetchItems(): Promise<ItemMaster[]> {
  return ITEMS;
}

export async function fetchDeliveries(): Promise<LineItem[]> {
  return deliveries;
}

export async function fetchPickups(): Promise<LineItem[]> {
  return pickups;
}

export async function createDelivery(input: NewLineItemInput): Promise<LineItem> {
  const entry: LineItem = { id: makeId('d'), ...input, status: 'planned' };
  deliveries = [entry, ...deliveries];
  return entry;
}

export async function createPickup(input: NewLineItemInput): Promise<LineItem> {
  const entry: LineItem = { id: makeId('p'), ...input, status: 'planned' };
  pickups = [entry, ...pickups];
  return entry;
}

// Marks a delivery completed once the field technician on-site confirms the
// actual quantity delivered. Note: no email/notification integration yet —
// deferred until that backend function is built.
export async function completeDelivery(input: CompleteLineItemInput): Promise<void> {
  deliveries = completeEntry(deliveries, input);
}

export async function completePickup(input: CompleteLineItemInput): Promise<void> {
  pickups = completeEntry(pickups, input);
}
