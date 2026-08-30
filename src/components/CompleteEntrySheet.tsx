import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { LineItem } from '../types';
import { ActionButton } from './ActionButton';
import { QuantityStepper } from './QuantityStepper';
import { StatusPill } from './StatusPill';

interface Props {
  visible: boolean;
  entry: LineItem | null;
  itemName: string;
  branchName: string;
  actionLabel: string; // "Delivery" or "Pickup"
  onClose: () => void;
  onComplete: (confirmedQty: number, completionNotes: string) => void;
}

export function CompleteEntrySheet({ visible, entry, itemName, branchName, actionLabel, onClose, onComplete }: Props) {
  const [confirmedQty, setConfirmedQty] = useState(1);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    if (visible && entry) {
      setConfirmedQty(entry.confirmedQty ?? entry.qty);
      setCompletionNotes(entry.completionNotes ?? '');
    }
  }, [visible, entry]);

  if (!entry) return null;

  const isPlanned = entry.status === 'planned';
  const qtyMismatch = !isPlanned && entry.confirmedQty !== undefined && entry.confirmedQty !== entry.qty;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>
                {branchName} · {entry.date}
              </Text>
            </View>
            <StatusPill status={isPlanned ? 'Planned' : 'Completed'} />
          </View>

          <Text style={styles.plannedLine}>Planned qty: {entry.qty}</Text>
          {!!entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}

          {isPlanned ? (
            <>
              <Text style={styles.fieldLabel}>Confirm quantity {actionLabel === 'Pickup' ? 'picked up' : 'delivered'}</Text>
              <View style={{ marginBottom: spacing.md }}>
                <QuantityStepper value={confirmedQty} onChange={setConfirmedQty} />
              </View>

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="e.g. 2 chairs damaged in transit"
                placeholderTextColor={colors.sub}
                style={styles.input}
              />

              <View style={styles.buttonRow}>
                <ActionButton label="Cancel" variant="outline" onPress={onClose} />
                <ActionButton label="Mark Completed" variant="filled" onPress={() => onComplete(confirmedQty, completionNotes)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.confirmedLine}>
                Confirmed qty: {entry.confirmedQty} {qtyMismatch ? '(differs from planned)' : ''}
              </Text>
              {!!entry.completedAt && <Text style={styles.notes}>Completed {entry.completedAt}</Text>}
              {!!entry.completionNotes && <Text style={styles.notes}>{entry.completionNotes}</Text>}

              <View style={styles.buttonRow}>
                <ActionButton label="Close" variant="outline" onPress={onClose} />
              </View>
            </>
          )}
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
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  plannedLine: { fontSize: 14, color: colors.ink, marginTop: spacing.sm },
  confirmedLine: { fontSize: 14, color: colors.ink, marginTop: spacing.sm, fontWeight: '600' },
  notes: { fontSize: 13, color: colors.sub, marginTop: 4, fontStyle: 'italic' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginTop: spacing.lg, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 15,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
});
