import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createDelivery,
  createPickup,
  fetchBranches,
  fetchDeliveries,
  fetchItems,
  fetchPickups,
} from '../api/dataService';
import { Branch, ItemMaster, LineItem, NewLineItemInput, ReconciliationRow } from '../types';

interface AppContextValue {
  branches: Branch[];
  items: ItemMaster[];
  deliveries: LineItem[];
  pickups: LineItem[];
  reconciliation: ReconciliationRow[];
  reviewedKeys: Record<string, boolean>;
  branchName: (id: number) => string;
  itemName: (id: number) => string;
  addDelivery: (input: NewLineItemInput) => Promise<void>;
  addPickup: (input: NewLineItemInput) => Promise<void>;
  toggleReviewed: (key: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function reconciliationKey(branchId: number, itemId: number): string {
  return `${branchId}-${itemId}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [deliveries, setDeliveries] = useState<LineItem[]>([]);
  const [pickups, setPickups] = useState<LineItem[]>([]);
  const [reviewedKeys, setReviewedKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchBranches().then(setBranches);
    fetchItems().then(setItems);
    fetchDeliveries().then(setDeliveries);
    fetchPickups().then(setPickups);
  }, []);

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

  const toggleReviewed = useCallback((key: string) => {
    setReviewedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Reconciliation is derived, never stored: for each (branch, item) pair,
  // onHand = sum(delivered qty) - sum(picked-up qty). onHand < 0 means more
  // was picked up than delivered (a data/process error needing investigation).
  const reconciliation = useMemo<ReconciliationRow[]>(() => {
    const map: Record<string, { branchId: number; itemId: number; delivered: number; picked: number }> = {};
    deliveries.forEach(d => {
      const key = reconciliationKey(d.branchId, d.itemId);
      map[key] = map[key] ?? { branchId: d.branchId, itemId: d.itemId, delivered: 0, picked: 0 };
      map[key].delivered += Number(d.qty);
    });
    pickups.forEach(p => {
      const key = reconciliationKey(p.branchId, p.itemId);
      map[key] = map[key] ?? { branchId: p.branchId, itemId: p.itemId, delivered: 0, picked: 0 };
      map[key].picked += Number(p.qty);
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
    branchName,
    itemName,
    addDelivery,
    addPickup,
    toggleReviewed,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppData(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within an AppProvider');
  return ctx;
}
