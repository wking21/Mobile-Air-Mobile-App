import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { LineItemRow } from '../components/LineItemRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';

export function DeliveriesScreen() {
  const { deliveries, branchName, itemName } = useAppData();
  const { openDeliverSheet } = useSheet();

  const rows = useMemo(
    () =>
      [...deliveries]
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .map(d => ({ ...d, branchName: branchName(d.branchId), itemName: itemName(d.itemId) })),
    [deliveries, branchName, itemName]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Deliveries" />
      <View style={styles.content}>
        <View style={styles.newRow}>
          <Pressable style={styles.newButton} onPress={openDeliverSheet}>
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
              />
            )}
          />
        </Card>
      </View>
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
