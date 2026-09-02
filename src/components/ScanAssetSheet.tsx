import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';

interface Props {
  visible: boolean;
  onScanned: (assetNumber: string) => void;
  onCancel: () => void;
}

// Reads the QR tag Infor already prints and affixes to serialized
// equipment — this app never generates its own asset numbers or QR codes,
// it only needs to read the ones that already exist.
export function ScanAssetSheet({ visible, onScanned, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  function handleBarcodeScanned(result: { data: string }) {
    // Guard against the camera firing repeatedly while still pointed at
    // the same tag — only the first read in a session counts.
    if (scanned) return;
    setScanned(true);
    onScanned(result.data);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} onShow={() => setScanned(false)}>
      <View style={styles.screen}>
        {!permission ? (
          <View style={styles.center} />
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.permissionText}>Camera access is needed to scan an asset's QR code.</Text>
            <Pressable style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonLabel}>Allow Camera Access</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.frame} />
              <Text style={styles.hint}>Point the camera at the asset's QR tag</Text>
            </View>
          </>
        )}

        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  permissionText: { color: colors.white, fontSize: 15, textAlign: 'center', marginBottom: spacing.lg },
  permissionButton: { backgroundColor: colors.accent, borderRadius: radii.lg, paddingVertical: 12, paddingHorizontal: 20 },
  permissionButtonLabel: { ...type.button, color: colors.white },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderRadius: radii.lg, borderWidth: 3, borderColor: colors.white, opacity: 0.85 },
  hint: { color: colors.white, fontSize: 14, marginTop: spacing.lg, fontWeight: '600' },
  cancelButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  cancelLabel: { ...type.button, color: colors.white },
});
