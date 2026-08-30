import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { StatusPill } from './StatusPill';

interface Props {
  itemName: string;
  delivered: number;
  picked: number;
  onHand: number;
  status: 'Pending' | 'Reviewed' | 'Discrepancy' | 'Open' | 'Pending Approval' | 'Resolved';
  canReview: boolean;
  onToggleReview: () => void;
  onPress: () => void;
}

export function ReconciliationRow({
  itemName,
  delivered,
  picked,
  onHand,
  status,
  canReview,
  onToggleReview,
  onPress,
}: Props) {
  const reviewed = status === 'Reviewed';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <View style={styles.topLine}>
        <Text style={styles.name}>{itemName}</Text>
        <StatusPill status={status} />
      </View>
      <Text style={styles.sub}>
        Delivered {delivered} · Picked up {picked} · On hand {onHand}
      </Text>
      {canReview && (
        <Pressable
          onPress={onToggleReview}
          style={[styles.reviewButton, { backgroundColor: reviewed ? colors.goodBg : colors.accent }]}
        >
          <Text style={[styles.reviewLabel, { color: reviewed ? colors.good : colors.white }]}>
            {reviewed ? 'Reviewed ✓' : 'Mark reviewed'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: spacing.md },
  rowPressed: { backgroundColor: colors.background },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink, flex: 1, marginRight: spacing.sm },
  sub: { fontSize: 13, color: colors.sub, marginTop: 4 },
  reviewButton: {
    marginTop: spacing.sm,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  reviewLabel: { fontSize: 12, fontWeight: '600' },
});
