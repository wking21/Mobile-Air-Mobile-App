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

export type LineItemStatus = 'planned' | 'completed';

export interface LineItem {
  id: string;
  branchId: number;
  itemId: number;
  qty: number; // planned quantity, logged at dispatch time
  date: string; // ISO yyyy-mm-dd
  notes: string;
  status: LineItemStatus;
  confirmedQty?: number; // actual qty the technician confirmed on completion
  completedAt?: string; // ISO yyyy-mm-dd, set when marked completed
  completionNotes?: string; // optional note captured on completion (e.g. explaining a qty mismatch)
}

export type Delivery = LineItem;
export type Pickup = LineItem;

export type NewLineItemInput = Omit<LineItem, 'id' | 'status' | 'confirmedQty' | 'completedAt' | 'completionNotes'>;

export interface CompleteLineItemInput {
  id: string;
  confirmedQty: number;
  completionNotes: string;
}

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

export type LossStatus = 'open' | 'pending_approval' | 'resolved';

export interface EquipmentLoss {
  id: string;
  branchId: number;
  itemId: number;
  quantityMissing: number;
  estimatedCost: number;
  status: LossStatus;
  assignedTo?: string;
  resolutionNotes?: string;
  submittedForApprovalAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionNotes?: string;
  createdAt: string;
  updatedAt: string;
}
