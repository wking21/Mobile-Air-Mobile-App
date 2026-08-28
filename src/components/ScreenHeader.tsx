import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '../theme';

export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>Ancillary Reconciliation</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { ...type.eyebrow, color: colors.sub },
  title: { ...type.header, color: colors.ink, marginTop: 2 },
});
