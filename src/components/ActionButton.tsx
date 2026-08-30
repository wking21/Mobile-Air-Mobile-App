import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii, type } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outline';
  style?: ViewStyle;
  disabled?: boolean;
}

export function ActionButton({ label, onPress, variant = 'filled', style, disabled = false }: Props) {
  const filled = variant === 'filled';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        filled ? styles.filled : styles.outline,
        pressed ? { opacity: 0.8 } : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.label, filled ? styles.filledLabel : styles.outlineLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.accent },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  label: { ...type.button },
  filledLabel: { color: colors.white },
  outlineLabel: { color: colors.accent },
  disabled: { opacity: 0.4 },
});
