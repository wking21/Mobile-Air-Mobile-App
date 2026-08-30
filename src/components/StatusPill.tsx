import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, type } from '../theme';

type Status = 'Pending' | 'Reviewed' | 'Discrepancy' | 'Planned' | 'Completed';

const STYLES: Record<Status, { bg: string; fg: string }> = {
  Pending: { bg: colors.warnBg, fg: colors.warn },
  Reviewed: { bg: colors.goodBg, fg: colors.good },
  Discrepancy: { bg: colors.badBg, fg: colors.bad },
  Planned: { bg: colors.warnBg, fg: colors.warn },
  Completed: { bg: colors.goodBg, fg: colors.good },
};

export function StatusPill({ status }: { status: Status }) {
  const s = STYLES[status];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.label, { color: s.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 9,
    alignSelf: 'flex-start',
  },
  label: { ...type.pill },
});
