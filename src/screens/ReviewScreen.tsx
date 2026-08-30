import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { LossCaseSheet } from '../components/LossCaseSheet';
import { ReconciliationDetailSheet } from '../components/ReconciliationDetailSheet';
import { ReconciliationRow } from '../components/ReconciliationRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { colors, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { ReviewFilter } from '../types';

const LOSS_STATUS_LABEL = {
  open: 'Open' as const,
  pending_approval: 'Pending Approval' as const,
  resolved: 'Resolved' as const,
};

export function ReviewScreen() {
  const {
    branches,
    reconciliation,
    deliveries,
    pickups,
    lossCases,
    branchName,
    itemName,
    toggleReviewed,
    assignLoss,
    submitLoss,
    approveLossCase,
    rejectLossCase,
  } = useAppData();
  const [filter, setFilter] = useState<ReviewFilter>('All');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeLossFor = (branchId: number, itemId: number) =>
    lossCases.find(l => l.branchId === branchId && l.itemId === itemId && l.status !== 'resolved') ??
    lossCases.find(l => l.branchId === branchId && l.itemId === itemId) ??
    null;

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

  const selectedRow = reconciliation.find(r => r.key === selectedKey) ?? null;
  const selectedLoss = selectedRow?.isDiscrepancy ? activeLossFor(selectedRow.branchId, selectedRow.itemId) : null;

  const sortByDateDesc = (a: { date: string }, b: { date: string }) => (a.date < b.date ? 1 : -1);
  const selectedDeliveries =
    selectedRow && !selectedRow.isDiscrepancy
      ? deliveries
          .filter(d => d.status === 'completed' && d.branchId === selectedRow.branchId && d.itemId === selectedRow.itemId)
          .map(d => ({ ...d, qty: d.confirmedQty ?? d.qty }))
          .sort(sortByDateDesc)
      : [];
  const selectedPickups =
    selectedRow && !selectedRow.isDiscrepancy
      ? pickups
          .filter(p => p.status === 'completed' && p.branchId === selectedRow.branchId && p.itemId === selectedRow.itemId)
          .map(p => ({ ...p, qty: p.confirmedQty ?? p.qty }))
          .sort(sortByDateDesc)
      : [];

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
                  renderItem={({ item: row }) => {
                    const loss = row.isDiscrepancy ? activeLossFor(row.branchId, row.itemId) : null;
                    const displayStatus = loss ? LOSS_STATUS_LABEL[loss.status] : row.status;
                    return (
                      <ReconciliationRow
                        itemName={itemName(row.itemId)}
                        delivered={row.delivered}
                        picked={row.picked}
                        onHand={row.onHand}
                        status={displayStatus}
                        canReview={!row.isDiscrepancy}
                        onToggleReview={() => toggleReviewed(row.key)}
                        onPress={() => setSelectedKey(row.key)}
                      />
                    );
                  }}
                />
              </Card>
            </View>
          )}
        />
      </View>

      <ReconciliationDetailSheet
        visible={!!selectedRow && !selectedRow.isDiscrepancy}
        onClose={() => setSelectedKey(null)}
        branchName={selectedRow ? branchName(selectedRow.branchId) : ''}
        itemName={selectedRow ? itemName(selectedRow.itemId) : ''}
        delivered={selectedRow?.delivered ?? 0}
        picked={selectedRow?.picked ?? 0}
        onHand={selectedRow?.onHand ?? 0}
        status={selectedRow?.status ?? 'Pending'}
        canReview={!!selectedRow && !selectedRow.isDiscrepancy}
        onToggleReview={() => selectedRow && toggleReviewed(selectedRow.key)}
        deliveryEntries={selectedDeliveries}
        pickupEntries={selectedPickups}
      />

      <LossCaseSheet
        visible={!!selectedRow && selectedRow.isDiscrepancy}
        onClose={() => setSelectedKey(null)}
        branchName={selectedRow ? branchName(selectedRow.branchId) : ''}
        itemName={selectedRow ? itemName(selectedRow.itemId) : ''}
        lossCase={selectedLoss}
        onAssign={assignedTo => selectedLoss && assignLoss(selectedLoss.id, assignedTo)}
        onSubmit={notes => selectedLoss && submitLoss(selectedLoss.id, notes)}
        onApprove={approvedBy => selectedLoss && approveLossCase(selectedLoss.id, approvedBy)}
        onReject={notes => selectedLoss && rejectLossCase(selectedLoss.id, notes)}
      />
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
