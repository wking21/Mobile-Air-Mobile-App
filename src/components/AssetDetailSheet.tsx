import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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

          <View style={styles.qrWrap}>
            <QRCode value={asset.assetNumber} size={180} />
          </View>
          <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
          <Text style={styles.assetNumberHint}>Print and affix to the equipment — scan or read this number to identify it.</Text>

          {!!asset.manufacturerSerial && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Manufacturer serial</Text>
              <Text style={styles.rowValue}>{asset.manufacturerSerial}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Infor sync</Text>
            <Text style={styles.rowValue}>{asset.inforSyncedAt ? 'Verified' : 'Not yet synced'}</Text>
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
  qrWrap: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radii.lg, paddingVertical: spacing.lg },
  assetNumber: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.ink, marginTop: spacing.md },
  assetNumberHint: { textAlign: 'center', fontSize: 12, color: colors.sub, marginTop: 4, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.sub },
  rowValue: { fontSize: 13, fontWeight: '600', color: colors.ink },
  photo: { width: '100%', height: 180, borderRadius: radii.lg, marginTop: spacing.lg, backgroundColor: colors.card },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
});
