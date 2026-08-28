import { BRANCHES, DELIVERIES, ITEMS, PICKUPS } from '../data/mockData';
import { Branch, ItemMaster, LineItem, NewLineItemInput } from '../types';

// Thin data-access layer. Every function is async and returns plain data,
// so this module is the only thing that needs to change when the backing
// store moves from in-memory mocks to a real REST/Sheets-backed API.
let deliveries: LineItem[] = [...DELIVERIES];
let pickups: LineItem[] = [...PICKUPS];

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
  const entry: LineItem = { id: makeId('d'), ...input };
  deliveries = [entry, ...deliveries];
  return entry;
}

export async function createPickup(input: NewLineItemInput): Promise<LineItem> {
  const entry: LineItem = { id: makeId('p'), ...input };
  pickups = [entry, ...pickups];
  return entry;
}
