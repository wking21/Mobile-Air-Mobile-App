import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';
import { AssetStatus } from '../types';
import { StatusPill } from './StatusPill';

export const ASSET_STATUS_LABEL: Record<AssetStatus, 'At Branch' | 'Out on Delivery' | 'Lost' | 'Retired'> = {
  at_branch: 'At Branch',
  out_on_delivery: 'Out on Delivery',
  lost: 'Lost',
  retired: 'Retired',
};

interface Props {
  assetNumber: string;
  itemName: string;
  branchName: string;
  status: AssetStatus;
  photoUrl?: string;
  onPress: () => void;
}

export function AssetRow({ assetNumber, itemName, branchName, status, photoUrl, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>{itemName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.itemName}>{itemName}</Text>
        <Text style={styles.assetNumber}>{assetNumber}</Text>
      </View>
      <View style={styles.meta}>
        <StatusPill status={ASSET_STATUS_LABEL[status]} />
        <Text style={styles.branchName}>{branchName}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: spacing.md, gap: spacing.md },
  thumb: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.background },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 16, fontWeight: '700', color: colors.sub },
  info: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  assetNumber: { fontSize: 12, color: colors.sub, marginTop: 2 },
  serial: { fontSize: 12, color: colors.sub, marginTop: 1 },
  meta: { alignItems: 'flex-end', gap: 5 },
  branchName: { fontSize: 12, color: colors.sub },
});
