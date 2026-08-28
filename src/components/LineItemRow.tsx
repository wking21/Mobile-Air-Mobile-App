import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  itemName: string;
  qty: number;
  branchName: string;
  date: string;
  notes?: string;
}

export function LineItemRow({ itemName, qty, branchName, date, notes }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.topLine}>
        <Text style={styles.name}>{itemName}</Text>
        <Text style={styles.qty}>×{qty}</Text>
      </View>
      <Text style={styles.sub}>
        {branchName} · {date}
      </Text>
      {!!notes && <Text style={styles.notes}>{notes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 14, paddingVertical: spacing.md },
  topLine: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  qty: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.sub, marginTop: 2 },
  notes: { fontSize: 13, color: colors.sub, marginTop: 2, fontStyle: 'italic' },
});
