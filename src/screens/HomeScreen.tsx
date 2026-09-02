import React, { useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { ActivityRow } from '../components/ActivityRow';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { colors, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { useSheet } from '../state/SheetContext';

export function HomeScreen() {
  const { openDeliveries, openPickups, recentActivity, reconciliation, lossCases, branchName, itemName } = useAppData();
  const { openDeliverSheet, openPickupSheet } = useSheet();
  const { signOut } = useAuth();

  const pendingCount = reconciliation.filter(r => r.status === 'Pending').length;
  // Active loss cases (not yet resolved), not raw math mismatches — a
  // discrepancy that's been investigated and resolved shouldn't still read
  // as an open problem here even though the underlying numbers stay off.
  const discrepancyCount = lossCases.filter(l => l.status !== 'resolved').length;

  const activityRows = useMemo(
    () =>
      recentActivity.map(r => ({
        ...r,
        dotColor: r.typeLabel === 'Delivered' ? colors.accent : colors.good,
        branchName: branchName(r.branchId),
        itemName: itemName(r.itemId),
      })),
    [recentActivity, branchName, itemName]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Overview"
        right={
          <Pressable onPress={signOut} hitSlop={8}>
            <Text style={styles.signOut}>Sign Out</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statGrid}>
          <StatCard label="Open deliveries" value={openDeliveries} />
          <StatCard label="Open pickups" value={openPickups} />
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
            data={activityRows}
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
  signOut: { fontSize: 13, fontWeight: '600', color: colors.accent, marginBottom: 4 },
});
