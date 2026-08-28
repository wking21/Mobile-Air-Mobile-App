import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

interface Props {
  label: string;
  value: number;
  valueColor?: string;
}

export function StatCard({ label, value, valueColor }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.md + 2,
  },
  label: { ...type.statLabel, color: colors.sub },
  value: { ...type.statValue, color: colors.ink, marginTop: spacing.xs },
});
