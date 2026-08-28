import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  name: string;
  category: string;
  unitCost: number;
}

export function ItemRow({ name, category, unitCost }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.category}>{category}</Text>
      </View>
      <Text style={styles.cost}>${unitCost}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  category: { fontSize: 13, color: colors.sub, marginTop: 1 },
  cost: { fontSize: 14, fontWeight: '600', color: colors.sub },
});
