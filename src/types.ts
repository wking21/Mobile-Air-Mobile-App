export interface Branch {
  id: number;
  name: string;
  region: string;
  serviceManagerEmail: string;
}

export interface ItemMaster {
  id: number;
  name: string;
  category: string;
  unitCost: number;
}

export interface LineItem {
  id: string;
  branchId: number;
  itemId: number;
  qty: number;
  date: string; // ISO yyyy-mm-dd
  notes: string;
}

export type Delivery = LineItem;
export type Pickup = LineItem;

export type NewLineItemInput = Omit<LineItem, 'id'>;

export type ReviewFilter = 'All' | 'Pending' | 'Discrepancy';

export interface ReconciliationRow {
  key: string;
  branchId: number;
  itemId: number;
  delivered: number;
  picked: number;
  onHand: number;
  isDiscrepancy: boolean;
  isReviewed: boolean;
  status: 'Discrepancy' | 'Reviewed' | 'Pending';
}
