import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  approveLoss,
  assignLossOwner,
  completeDelivery,
  completePickup,
  createDelivery,
  createPickup,
  fetchBranches,
  fetchDeliveries,
  fetchItems,
  fetchLossCases,
  fetchPickups,
  fetchReviewedKeys,
  rejectLoss,
  setReviewed,
  subscribeToRealtimeChanges,
  submitLossResolution,
} from '../api/dataService';
import {
  Branch,
  CompleteLineItemInput,
  EquipmentLoss,
  ItemMaster,
  LineItem,
  NewLineItemInput,
  ReconciliationRow,
} from '../types';

interface AppContextValue {
  branches: Branch[];
  items: ItemMaster[];
  deliveries: LineItem[];
  pickups: LineItem[];
  reconciliation: ReconciliationRow[];
  reviewedKeys: Record<string, boolean>;
  lossCases: EquipmentLoss[];
  branchName: (id: number) => string;
  itemName: (id: number) => string;
  addDelivery: (input: NewLineItemInput) => Promise<void>;
  addPickup: (input: NewLineItemInput) => Promise<void>;
  completeDeliveryEntry: (input: CompleteLineItemInput) => Promise<void>;
  completePickupEntry: (input: CompleteLineItemInput) => Promise<void>;
  toggleReviewed: (key: string) => Promise<void>;
  assignLoss: (id: string, assignedTo: string) => Promise<void>;
  submitLoss: (id: string, resolutionNotes: string) => Promise<void>;
  approveLossCase: (id: string, approvedBy: string) => Promise<void>;
  rejectLossCase: (id: string, rejectionNotes: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function reconciliationKey(branchId: number, itemId: number): string {
  return `${branchId}-${itemId}`;
}

function parseReconciliationKey(key: string): { branchId: number; itemId: number } {
  const [branchId, itemId] = key.split('-').map(Number);
  return { branchId, itemId };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [deliveries, setDeliveries] = useState<LineItem[]>([]);
  const [pickups, setPickups] = useState<LineItem[]>([]);
  const [reviewedKeys, setReviewedKeys] = useState<Record<string, boolean>>({});
  const [lossCases, setLossCases] = useState<EquipmentLoss[]>([]);

  const refetchLiveData = useCallback(() => {
    fetchDeliveries().then(setDeliveries).catch(err => console.error('Failed to load deliveries', err));
    fetchPickups().then(setPickups).catch(err => console.error('Failed to load pickups', err));
    fetchReviewedKeys().then(setReviewedKeys).catch(err => console.error('Failed to load reviewed status', err));
    fetchLossCases().then(setLossCases).catch(err => console.error('Failed to load loss cases', err));
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
    const entry = await createDelivery(input);
    setDeliveries(prev => [entry, ...prev]);
  }, []);

  const addPickup = useCallback(async (input: NewLineItemInput) => {
    const entry = await createPickup(input);
    setPickups(prev => [entry, ...prev]);
  }, []);

  const completeDeliveryEntry = useCallback(async (input: CompleteLineItemInput) => {
    await completeDelivery(input);
    setDeliveries(await fetchDeliveries());
  }, []);

  const completePickupEntry = useCallback(async (input: CompleteLineItemInput) => {
    await completePickup(input);
    setPickups(await fetchPickups());
  }, []);

  const toggleReviewed = useCallback(
    async (key: string) => {
      const { branchId, itemId } = parseReconciliationKey(key);
      const nextReviewed = !reviewedKeys[key];
      await setReviewed(branchId, itemId, nextReviewed);
      setReviewedKeys(prev => ({ ...prev, [key]: nextReviewed }));
    },
    [reviewedKeys]
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

  // Reconciliation is derived, never stored: for each (branch, item) pair,
  // onHand = sum(delivered qty) - sum(picked-up qty), counting only entries a
  // technician has confirmed completed (a planned-but-unconfirmed delivery or
  // pickup hasn't physically happened yet, so it shouldn't move the count).
  // onHand < 0 means more was picked up than delivered (a data/process error
  // needing investigation).
  const reconciliation = useMemo<ReconciliationRow[]>(() => {
    const map: Record<string, { branchId: number; itemId: number; delivered: number; picked: number }> = {};
    deliveries
      .filter(d => d.status === 'completed')
      .forEach(d => {
        const key = reconciliationKey(d.branchId, d.itemId);
        map[key] = map[key] ?? { branchId: d.branchId, itemId: d.itemId, delivered: 0, picked: 0 };
        map[key].delivered += Number(d.confirmedQty ?? d.qty);
      });
    pickups
      .filter(p => p.status === 'completed')
      .forEach(p => {
        const key = reconciliationKey(p.branchId, p.itemId);
        map[key] = map[key] ?? { branchId: p.branchId, itemId: p.itemId, delivered: 0, picked: 0 };
        map[key].picked += Number(p.confirmedQty ?? p.qty);
      });

    return Object.entries(map).map(([key, row]) => {
      const onHand = row.delivered - row.picked;
      const isDiscrepancy = onHand < 0;
      const isReviewed = !!reviewedKeys[key];
      return {
        key,
        branchId: row.branchId,
        itemId: row.itemId,
        delivered: row.delivered,
        picked: row.picked,
        onHand,
        isDiscrepancy,
        isReviewed,
        status: isDiscrepancy ? 'Discrepancy' : isReviewed ? 'Reviewed' : 'Pending',
      };
    });
  }, [deliveries, pickups, reviewedKeys]);

  const value: AppContextValue = {
    branches,
    items,
    deliveries,
    pickups,
    reconciliation,
    reviewedKeys,
    lossCases,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within an AppProvider');
  return ctx;
}
