import { Branch, ItemMaster, LineItem } from '../types';

// Seed data mirrors the source spreadsheet/AppSheet app's branches and
// item_master tables. Swap this module for real network calls once a
// backing REST/Sheets API is available (see src/api/dataService.ts).
export const BRANCHES: Branch[] = [
  { id: 1, name: 'North Branch', region: 'North', serviceManagerEmail: 'north.manager@example.com' },
  { id: 2, name: 'South Branch', region: 'South', serviceManagerEmail: 'south.manager@example.com' },
  { id: 3, name: 'Central Branch', region: 'Central', serviceManagerEmail: 'central.manager@example.com' },
  { id: 4, name: 'East Branch', region: 'East', serviceManagerEmail: 'east.manager@example.com' },
];

export const ITEMS: ItemMaster[] = [
  { id: 1, name: 'Folding Table 6ft', category: 'Furniture', unitCost: 45 },
  { id: 2, name: 'Banquet Chair', category: 'Furniture', unitCost: 12 },
  { id: 3, name: '10x10 Canopy Tent', category: 'Structures', unitCost: 220 },
  { id: 4, name: 'Portable Generator 5kW', category: 'Equipment', unitCost: 650 },
  { id: 5, name: 'Pallet Jack', category: 'Equipment', unitCost: 310 },
  { id: 6, name: 'Rolling Cooler 150qt', category: 'Coolers', unitCost: 95 },
  { id: 7, name: 'Patio Heater', category: 'Equipment', unitCost: 180 },
  { id: 8, name: 'Hand Dolly', category: 'Equipment', unitCost: 60 },
];

export const DELIVERIES: LineItem[] = [
  { id: 'd1', branchId: 1, itemId: 1, qty: 20, date: '2026-08-10', notes: 'Event setup' },
  { id: 'd2', branchId: 1, itemId: 3, qty: 2, date: '2026-08-10', notes: '' },
  { id: 'd3', branchId: 2, itemId: 4, qty: 1, date: '2026-08-12', notes: 'Backup power' },
  { id: 'd4', branchId: 3, itemId: 6, qty: 10, date: '2026-08-15', notes: '' },
  { id: 'd5', branchId: 4, itemId: 2, qty: 50, date: '2026-08-18', notes: 'Conference' },
  { id: 'd6', branchId: 2, itemId: 4, qty: 1, date: '2026-08-20', notes: 'Second unit' },
  { id: 'd7', branchId: 1, itemId: 1, qty: 10, date: '2026-08-22', notes: '' },
];

export const PICKUPS: LineItem[] = [
  { id: 'p1', branchId: 1, itemId: 1, qty: 18, date: '2026-08-20', notes: 'Partial return' },
  { id: 'p2', branchId: 2, itemId: 4, qty: 2, date: '2026-08-25', notes: 'Both units returned' },
  { id: 'p3', branchId: 3, itemId: 6, qty: 4, date: '2026-08-24', notes: '' },
  { id: 'p4', branchId: 4, itemId: 2, qty: 50, date: '2026-08-24', notes: '' },
  { id: 'p5', branchId: 1, itemId: 3, qty: 3, date: '2026-08-26', notes: '' },
];
