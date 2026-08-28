import React, { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { ActivityRow } from '../components/ActivityRow';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { colors, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';

export function HomeScreen() {
  const { deliveries, pickups, reconciliation, branchName, itemName } = useAppData();
  const { openDeliverSheet, openPickupSheet } = useSheet();

  const pendingCount = reconciliation.filter(r => r.status === 'Pending').length;
  const discrepancyCount = reconciliation.filter(r => r.isDiscrepancy).length;

  const recentActivity = useMemo(() => {
    const combined = [
      ...deliveries.map(d => ({ ...d, typeLabel: 'Delivered', dotColor: colors.accent })),
      ...pickups.map(p => ({ ...p, typeLabel: 'Picked up', dotColor: colors.good })),
    ];
    return combined
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 6)
      .map(r => ({ ...r, branchName: branchName(r.branchId), itemName: itemName(r.itemId) }));
  }, [deliveries, pickups, branchName, itemName]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Overview" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statGrid}>
          <StatCard label="Open deliveries" value={deliveries.length} />
          <StatCard label="Open pickups" value={pickups.length} />
          <StatCard label="Pending review" value={pendingCount} />
          <StatCard
            label="Discrepancies"
            value={discrepancyCount}
            valueColor={discrepancyCount > 0 ? colors.bad : undefined}
          />
        </View>

        <View style={styles.actionRow}>
          <ActionButton label="+ New Delivery" variant="filled" onPress={openDeliverSheet} />
          <ActionButton label="+ New Pickup" variant="outline" onPress={openPickupSheet} />
        </View>

        <Text style={styles.sectionLabel}>Recent activity</Text>
        <Card>
          <FlatList
            data={recentActivity}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <ActivityRow
                dotColor={item.dotColor}
                itemName={item.itemName}
                branchName={item.branchName}
                typeLabel={item.typeLabel}
                qty={item.qty}
                date={item.date}
              />
            )}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.xl },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl + 2 },
  sectionLabel: { ...type.sectionLabel, color: colors.sub, marginHorizontal: 4, marginBottom: spacing.sm },
});
