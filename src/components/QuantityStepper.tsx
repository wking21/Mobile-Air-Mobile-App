import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export function QuantityStepper({ value, onChange, min = 1 }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.button} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={styles.buttonLabel}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable style={styles.button} onPress={() => onChange(value + 1)}>
        <Text style={styles.buttonLabel}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  button: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 18, fontWeight: '700', color: colors.ink },
  value: { fontSize: 17, fontWeight: '700', color: colors.ink, minWidth: 24, textAlign: 'center' },
});
