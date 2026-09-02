import React from 'react';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';
import { NewLineItemInput } from '../types';
import { EntrySheet } from './EntrySheet';

export function GlobalEntrySheet() {
  const { branches, items, addDelivery, addPickup } = useAppData();
  const { sheet, closeSheet } = useSheet();

  const handleSave = async (input: NewLineItemInput) => {
    if (sheet === 'deliver') await addDelivery(input);
    else if (sheet === 'pickup') await addPickup(input);
    closeSheet();
  };

  return (
    <EntrySheet
      visible={sheet !== null}
      title={sheet === 'deliver' ? 'New Delivery' : 'New Pickup'}
      branches={branches}
      items={items}
      onCancel={closeSheet}
      onSave={handleSave}
    />
  );
}
