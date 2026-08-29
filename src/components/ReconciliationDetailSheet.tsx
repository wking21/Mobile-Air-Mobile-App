import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { LineItem } from '../types';
import { StatusPill } from './StatusPill';

interface Props {
  visible: boolean;
  onClose: () => void;
  branchName: string;
  itemName: string;
  delivered: number;
  picked: number;
  onHand: number;
  status: 'Pending' | 'Reviewed' | 'Discrepancy';
  canReview: boolean;
  onToggleReview: () => void;
  deliveryEntries: LineItem[];
  pickupEntries: LineItem[];
}

function EntryRow({ entry }: { entry: LineItem }) {
  return (
    <View style={styles.entryRow}>
      <Text style={styles.entryQty}>×{entry.qty}</Text>
      <View style={styles.entryBody}>
        <Text style={styles.entryDate}>{entry.date}</Text>
        {!!entry.notes && <Text style={styles.entryNotes}>{entry.notes}</Text>}
      </View>
    </View>
  );
}

export function ReconciliationDetailSheet({
  visible,
  onClose,
  branchName,
  itemName,
  delivered,
  picked,
  onHand,
  status,
  canReview,
  onToggleReview,
  deliveryEntries,
  pickupEntries,
}: Props) {
  const reviewed = status === 'Reviewed';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>{branchName}</Text>
            </View>
            <StatusPill status={status} />
          </View>

          <Text style={styles.summary}>
            Delivered {delivered} · Picked up {picked} · On hand {onHand}
          </Text>

          <ScrollView style={styles.scroll}>
            <Text style={styles.sectionLabel}>Deliveries ({deliveryEntries.length})</Text>
            <View style={styles.card}>
              {deliveryEntries.length === 0 ? (
                <Text style={styles.emptyText}>No deliveries recorded</Text>
              ) : (
                deliveryEntries.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <EntryRow entry={entry} />
                  </View>
                ))
              )}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>Pickups ({pickupEntries.length})</Text>
            <View style={styles.card}>
              {pickupEntries.length === 0 ? (
                <Text style={styles.emptyText}>No pickups recorded</Text>
              ) : (
                pickupEntries.map((entry, i) => (
                  <View key={entry.id}>
                    {i > 0 && <View style={styles.divider} />}
                    <EntryRow entry={entry} />
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable onPress={onClose} style={[styles.button, styles.closeButton]}>
              <Text style={styles.closeButtonLabel}>Close</Text>
            </Pressable>
            {canReview && (
              <Pressable
                onPress={onToggleReview}
                style={[styles.button, { backgroundColor: reviewed ? colors.goodBg : colors.accent }]}
              >
                <Text style={[styles.reviewButtonLabel, { color: reviewed ? colors.good : colors.white }]}>
                  {reviewed ? 'Reviewed ✓' : 'Mark reviewed'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: 18,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  summary: { fontSize: 13, color: colors.sub, marginTop: spacing.sm, marginBottom: spacing.md },
  scroll: { flexGrow: 0 },
  sectionLabel: { ...type.sectionLabel, color: colors.sub, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radii.lg, overflow: 'hidden' },
  emptyText: { fontSize: 14, color: colors.sub, padding: spacing.md, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: colors.border },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md },
  entryQty: { fontSize: 15, fontWeight: '600', color: colors.ink, minWidth: 40 },
  entryBody: { flex: 1 },
  entryDate: { fontSize: 14, color: colors.ink },
  entryNotes: { fontSize: 13, color: colors.sub, marginTop: 2, fontStyle: 'italic' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  button: { flex: 1, borderRadius: radii.lg, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  closeButton: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  closeButtonLabel: { ...type.button, color: colors.sub },
  reviewButtonLabel: { ...type.button },
});
