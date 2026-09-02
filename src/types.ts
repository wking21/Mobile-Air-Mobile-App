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
// entry — see supabase/migrations/005_scan_based_assets.sql. assetNumber
// is always a real Infor Asset Number, read by scanning the QR tag Infor
// already prints and affixes to the equipment — this app never invents
// its own numbering or generates a QR code. What this record adds is
// current_branch_id/status: live per-asset location, which neither Texada
// nor Infor tracks today.
export interface Asset {
  id: string;
  assetNumber: string;
  itemId: number;
  photoUrl?: string;
  currentBranchId?: number;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
}

// Produced by scanning an asset's QR tag — assetNumber is the scanned
// value, not something the app generates.
export interface ScannedAssetInput {
  assetNumber: string;
  itemId: number;
  photoUrl?: string;
  currentBranchId?: number;
  status?: AssetStatus;
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
