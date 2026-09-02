import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { Asset } from '../types';
import { ActionButton } from './ActionButton';
import { ASSET_STATUS_LABEL } from './AssetRow';
import { StatusPill } from './StatusPill';

interface Props {
  visible: boolean;
  asset: Asset | null;
  itemName: string;
  branchName: string;
  onClose: () => void;
}

// No QR code here to generate or print — Infor already owns the tag on
// the equipment; this just shows what we know locally about that asset
// number from having scanned it.
export function AssetDetailSheet({ visible, asset, itemName, branchName, onClose }: Props) {
  if (!asset) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>{branchName}</Text>
            </View>
            <StatusPill status={ASSET_STATUS_LABEL[asset.status]} />
          </View>

          <View style={styles.assetNumberBox}>
            <Text style={styles.assetNumberLabel}>Asset number (scanned)</Text>
            <Text style={styles.assetNumberValue}>{asset.assetNumber}</Text>
          </View>

          {!!asset.photoUrl && <Image source={{ uri: asset.photoUrl }} style={styles.photo} />}

          <View style={styles.buttonRow}>
            <ActionButton label="Close" variant="outline" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: 18,
    paddingBottom: 32,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  assetNumberBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  assetNumberLabel: { fontSize: 11, fontWeight: '600', color: colors.sub, textTransform: 'uppercase' },
  assetNumberValue: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 2 },
  photo: { width: '100%', height: 180, borderRadius: radii.lg, marginTop: spacing.lg, backgroundColor: colors.card },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
});
