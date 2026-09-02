import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>Ancillary Reconciliation</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  textCol: { flex: 1 },
  eyebrow: { ...type.eyebrow, color: colors.sub },
  title: { ...type.header, color: colors.ink, marginTop: 2 },
});
