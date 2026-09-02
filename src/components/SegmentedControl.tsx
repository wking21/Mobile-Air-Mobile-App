import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, type } from '../theme';

interface Props<T extends string> {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.segment, { backgroundColor: active ? colors.accent : colors.card }]}
          >
            <Text style={[styles.label, { color: active ? colors.white : colors.sub }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    borderRadius: radii.sm,
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: { fontSize: 13, fontWeight: '600' },
});
