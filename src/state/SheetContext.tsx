import React, { createContext, useCallback, useContext, useState } from 'react';

export type SheetType = 'deliver' | 'pickup' | null;

interface SheetContextValue {
  sheet: SheetType;
  openDeliverSheet: () => void;
  openPickupSheet: () => void;
  closeSheet: () => void;
}

const SheetContext = createContext<SheetContextValue | undefined>(undefined);

export function SheetProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetType>(null);

  const openDeliverSheet = useCallback(() => setSheet('deliver'), []);
  const openPickupSheet = useCallback(() => setSheet('pickup'), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  return (
    <SheetContext.Provider value={{ sheet, openDeliverSheet, openPickupSheet, closeSheet }}>
      {children}
    </SheetContext.Provider>
  );
}

export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used within a SheetProvider');
  return ctx;
}
