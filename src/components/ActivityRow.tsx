import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  dotColor: string;
  itemName: string;
  branchName: string;
  typeLabel: string;
  qty: number;
  date: string;
}

export function ActivityRow({ dotColor, itemName, branchName, typeLabel, qty, date }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <View style={styles.body}>
        <Text style={styles.name}>{itemName}</Text>
        <Text style={styles.sub}>
          {branchName} · {typeLabel} · qty {qty}
        </Text>
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  sub: { fontSize: 13, color: colors.sub, marginTop: 1 },
  date: { fontSize: 12, color: colors.sub, flexShrink: 0 },
});
