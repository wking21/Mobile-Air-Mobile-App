import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { ReconciliationRow } from '../components/ReconciliationRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { colors, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { ReviewFilter } from '../types';

export function ReviewScreen() {
  const { branches, reconciliation, branchName, itemName, toggleReviewed } = useAppData();
  const [filter, setFilter] = useState<ReviewFilter>('All');

  const filteredRows = useMemo(() => {
    if (filter === 'Pending') return reconciliation.filter(r => r.status === 'Pending');
    if (filter === 'Discrepancy') return reconciliation.filter(r => r.isDiscrepancy);
    return reconciliation;
  }, [reconciliation, filter]);

  const groups = useMemo(
    () =>
      branches
        .map(b => ({
          branchName: b.name,
          rows: filteredRows.filter(r => r.branchId === b.id),
        }))
        .filter(g => g.rows.length > 0),
    [branches, filteredRows]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Reconciliation" />
      <View style={styles.content}>
        <View style={styles.filterRow}>
          <SegmentedControl<ReviewFilter> options={['All', 'Pending', 'Discrepancy']} value={filter} onChange={setFilter} />
        </View>
        <FlatList
          data={groups}
          keyExtractor={g => g.branchName}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item: group }) => (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>{group.branchName}</Text>
              <Card>
                <FlatList
                  data={group.rows}
                  keyExtractor={r => r.key}
                  scrollEnabled={false}
                  ItemSeparatorComponent={Divider}
                  renderItem={({ item: row }) => (
                    <ReconciliationRow
                      itemName={itemName(row.itemId)}
                      delivered={row.delivered}
                      picked={row.picked}
                      onHand={row.onHand}
                      status={row.status}
                      canReview={!row.isDiscrepancy}
                      onToggleReview={() => toggleReviewed(row.key)}
                    />
                  )}
                />
              </Card>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  filterRow: { marginBottom: spacing.lg - 2 },
  group: { marginBottom: spacing.lg },
  groupLabel: { ...type.sectionLabel, color: colors.sub, marginHorizontal: 4, marginBottom: spacing.sm },
});
