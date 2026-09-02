import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  approveLoss,
  assignLossOwner,
  completeDelivery,
  completePickup,
  createDelivery,
  createPickup,
  fetchAssets,
  fetchBranches,
  fetchItems,
  fetchLossCases,
  fetchOpenCounts,
  fetchReconciliationSummary,
  fetchRecentActivity,
  rejectLoss,
  RecentActivityEntry,
  setReviewed,
  subscribeToRealtimeChanges,
  submitLossResolution,
  upsertScannedAsset,
} from '../api/dataService';
import {
  Asset,
  Branch,
  CompleteLineItemInput,
  EquipmentLoss,
  ItemMaster,
  LineItem,
  NewLineItemInput,
  ReconciliationRow,
  ScannedAssetInput,
} from '../types';

interface AppContextValue {
  branches: Branch[];
  items: ItemMaster[];
  openDeliveries: number;
  openPickups: number;
  recentActivity: RecentActivityEntry[];
  reconciliation: ReconciliationRow[];
  lossCases: EquipmentLoss[];
  assets: Asset[];
  // Bumped every time the shared aggregates above are refreshed (on mount, on
  // any realtime change, and after a mutation). The Deliveries/Pickups
  // screens — which hold their own paginated slice of the underlying tables
  // rather than a full copy — key an effect off this to refresh just their
  // first page instead of the app keeping a duplicate full-table cache.
  dataVersion: number;
  branchName: (id: number) => string;
  itemName: (id: number) => string;
  addDelivery: (input: NewLineItemInput) => Promise<void>;
  addPickup: (input: NewLineItemInput) => Promise<void>;
  completeDeliveryEntry: (input: CompleteLineItemInput) => Promise<LineItem>;
  completePickupEntry: (input: CompleteLineItemInput) => Promise<LineItem>;
  toggleReviewed: (key: string) => Promise<void>;
  assignLoss: (id: string, assignedTo: string) => Promise<void>;
  submitLoss: (id: string, resolutionNotes: string) => Promise<void>;
  approveLossCase: (id: string, approvedBy: string) => Promise<void>;
  rejectLossCase: (id: string, rejectionNotes: string) => Promise<void>;
  scanAsset: (input: ScannedAssetInput) => Promise<Asset>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function parseReconciliationKey(key: string): { branchId: number; itemId: number } {
  const [branchId, itemId] = key.split('-').map(Number);
  return { branchId, itemId };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [openDeliveries, setOpenDeliveries] = useState(0);
  const [openPickups, setOpenPickups] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivityEntry[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([]);
  const [lossCases, setLossCases] = useState<EquipmentLoss[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [dataVersion, setDataVersion] = useState(0);

  // Everything here is a small, bounded aggregate — never the full
  // deliveries/pickups tables — so this stays cheap no matter how much
  // transaction history piles up behind it.
  const refetchLiveData = useCallback(() => {
    fetchOpenCounts()
      .then(({ openDeliveries, openPickups }) => {
        setOpenDeliveries(openDeliveries);
        setOpenPickups(openPickups);
      })
      .catch(err => console.error('Failed to load open counts', err));
    fetchRecentActivity().then(setRecentActivity).catch(err => console.error('Failed to load recent activity', err));
    fetchReconciliationSummary().then(setReconciliation).catch(err => console.error('Failed to load reconciliation summary', err));
    fetchLossCases().then(setLossCases).catch(err => console.error('Failed to load loss cases', err));
    fetchAssets().then(setAssets).catch(err => console.error('Failed to load assets', err));
    setDataVersion(v => v + 1);
  }, []);

  useEffect(() => {
    fetchBranches().then(setBranches).catch(err => console.error('Failed to load branches', err));
    fetchItems().then(setItems).catch(err => console.error('Failed to load items', err));
    refetchLiveData();

    // Keeps every device in sync: when any technician or office user changes
    // a delivery, pickup, or review status, everyone else's app re-fetches
    // automatically instead of showing stale data until a manual refresh.
    const unsubscribe = subscribeToRealtimeChanges(refetchLiveData);
    return unsubscribe;
  }, [refetchLiveData]);

  const branchName = useCallback(
    (id: number) => branches.find(b => b.id === Number(id))?.name ?? '',
    [branches]
  );
  const itemName = useCallback(
    (id: number) => items.find(i => i.id === Number(id))?.name ?? '',
    [items]
  );

  const addDelivery = useCallback(async (input: NewLineItemInput) => {
    await createDelivery(input);
    refetchLiveData();
  }, [refetchLiveData]);

  const addPickup = useCallback(async (input: NewLineItemInput) => {
    await createPickup(input);
    refetchLiveData();
  }, [refetchLiveData]);

  const completeDeliveryEntry = useCallback(
    async (input: CompleteLineItemInput) => {
      const updated = await completeDelivery(input);
      refetchLiveData();
      return updated;
    },
    [refetchLiveData]
  );

  const completePickupEntry = useCallback(
    async (input: CompleteLineItemInput) => {
      const updated = await completePickup(input);
      refetchLiveData();
      return updated;
    },
    [refetchLiveData]
  );

  const toggleReviewed = useCallback(
    async (key: string) => {
      const { branchId, itemId } = parseReconciliationKey(key);
      const current = reconciliation.find(r => r.key === key);
      await setReviewed(branchId, itemId, !current?.isReviewed);
      setReconciliation(await fetchReconciliationSummary());
    },
    [reconciliation]
  );

  const assignLoss = useCallback(async (id: string, assignedTo: string) => {
    await assignLossOwner(id, assignedTo);
    setLossCases(await fetchLossCases());
  }, []);

  const submitLoss = useCallback(async (id: string, resolutionNotes: string) => {
    await submitLossResolution(id, resolutionNotes);
    setLossCases(await fetchLossCases());
  }, []);

  const approveLossCase = useCallback(async (id: string, approvedBy: string) => {
    await approveLoss(id, approvedBy);
    setLossCases(await fetchLossCases());
  }, []);

  const rejectLossCase = useCallback(async (id: string, rejectionNotes: string) => {
    await rejectLoss(id, rejectionNotes);
    setLossCases(await fetchLossCases());
  }, []);

  const scanAsset = useCallback(async (input: ScannedAssetInput) => {
    const asset = await upsertScannedAsset(input);
    setAssets(await fetchAssets());
    setItems(await fetchItems()); // may have flipped the item's is_serialized flag
    return asset;
  }, []);

  const value: AppContextValue = {
    branches,
    items,
    openDeliveries,
    openPickups,
    recentActivity,
    reconciliation,
    lossCases,
    assets,
    dataVersion,
    branchName,
    itemName,
    addDelivery,
    addPickup,
    completeDeliveryEntry,
    completePickupEntry,
    toggleReviewed,
    assignLoss,
    submitLoss,
    approveLossCase,
    rejectLossCase,
    scanAsset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within an AppProvider');
  return ctx;
}
