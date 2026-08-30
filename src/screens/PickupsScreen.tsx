import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { CompleteEntrySheet } from '../components/CompleteEntrySheet';
import { Divider } from '../components/Divider';
import { LineItemRow } from '../components/LineItemRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';

export function PickupsScreen() {
  const { pickups, branchName, itemName, completePickupEntry } = useAppData();
  const { openPickupSheet } = useSheet();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      [...pickups]
        .sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
        .map(p => ({ ...p, branchName: branchName(p.branchId), itemName: itemName(p.itemId) })),
    [pickups, branchName, itemName]
  );

  const selected = pickups.find(p => p.id === selectedId) ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Pickups" />
      <View style={styles.content}>
        <View style={styles.newRow}>
          <Pressable style={styles.newButton} onPress={openPickupSheet}>
            <Text style={styles.newButtonLabel}>+ New</Text>
          </Pressable>
        </View>
        <Card>
          <FlatList
            data={rows}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <LineItemRow
                itemName={item.itemName}
                qty={item.qty}
                branchName={item.branchName}
                date={item.date}
                notes={item.notes}
                status={item.status}
                onPress={() => setSelectedId(item.id)}
              />
            )}
          />
        </Card>
      </View>

      <CompleteEntrySheet
        visible={!!selected}
        entry={selected}
        itemName={selected ? itemName(selected.itemId) : ''}
        branchName={selected ? branchName(selected.branchId) : ''}
        actionLabel="Pickup"
        onClose={() => setSelectedId(null)}
        onComplete={async (confirmedQty, completionNotes) => {
          if (!selected) return;
          await completePickupEntry({ id: selected.id, confirmedQty, completionNotes });
          setSelectedId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  newRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  newButton: {
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
  },
  newButtonLabel: { ...type.body, fontSize: 14, color: colors.white },
});
