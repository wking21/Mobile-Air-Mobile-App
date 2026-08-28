import React from 'react';
import { View } from 'react-native';

export type TabIconKind = 'circle' | 'triangleDown' | 'triangleUp' | 'square' | 'diamond';

export function TabIcon({ kind, color }: { kind: TabIconKind; color: string }) {
  switch (kind) {
    case 'circle':
      return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />;
    case 'triangleDown':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 9,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: color,
          }}
        />
      );
    case 'triangleUp':
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderBottomWidth: 9,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
      );
    case 'square':
      return <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: color }} />;
    case 'diamond':
      return (
        <View style={{ width: 9, height: 9, backgroundColor: color, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
      );
  }
}
