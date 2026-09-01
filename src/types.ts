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
  isSerialized: boolean; // true for items tracked as individual QR-tagged assets, not just a quantity
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
  completionPhotoUrl?: string; // optional photo taken at completion, documenting condition/what actually left or came back
}

export type Delivery = LineItem;
export type Pickup = LineItem;

export type NewLineItemInput = Omit<LineItem, 'id' | 'status' | 'confirmedQty' | 'completedAt' | 'completionNotes'>;

export interface CompleteLineItemInput {
  id: string;
  confirmedQty: number;
  completionNotes: string;
  completionPhotoUrl?: string;
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

export type AssetStatus = 'at_branch' | 'out_on_delivery' | 'lost' | 'retired';

// One physical, individually QR-tagged unit of a serialized item master
// entry — see supabase/migrations/004_asset_tracking.sql. assetNumber is
// app-generated (prefixed 'TEMP-') until a future Infor sync replaces it
// with the real Infor Asset Number; manufacturerSerial is captured up
// front so that sync can match this asset automatically when it happens.
export interface Asset {
  id: string;
  assetNumber: string;
  itemId: number;
  manufacturerSerial?: string;
  photoUrl?: string;
  currentBranchId?: number;
  status: AssetStatus;
  inforSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewAssetInput {
  itemId: number;
  manufacturerSerial?: string;
  photoUrl?: string;
  currentBranchId?: number;
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
