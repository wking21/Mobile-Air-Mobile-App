import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { LineItemStatus } from '../types';
import { StatusPill } from './StatusPill';

interface Props {
  itemName: string;
  qty: number;
  branchName: string;
  date: string;
  notes?: string;
  status: LineItemStatus;
  onPress: () => void;
}

export function LineItemRow({ itemName, qty, branchName, date, notes, status, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}>
      <View style={styles.topLine}>
        <Text style={styles.name}>{itemName}</Text>
        <Text style={styles.qty}>×{qty}</Text>
      </View>
      <View style={styles.subLine}>
        <Text style={styles.sub}>
          {branchName} · {date}
        </Text>
        <StatusPill status={status === 'planned' ? 'Planned' : 'Completed'} />
      </View>
      {!!notes && <Text style={styles.notes}>{notes}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: spacing.md },
  rowPressed: { backgroundColor: colors.background },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  qty: { fontSize: 15, fontWeight: '600', color: colors.ink },
  subLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sub: { fontSize: 13, color: colors.sub },
  notes: { fontSize: 13, color: colors.sub, marginTop: 4, fontStyle: 'italic' },
});
