import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { LineItem } from '../types';
import { ActionButton } from './ActionButton';
import { QuantityStepper } from './QuantityStepper';
import { ScanAssetSheet } from './ScanAssetSheet';
import { StatusPill } from './StatusPill';

interface Props {
  visible: boolean;
  entry: LineItem | null;
  itemName: string;
  branchName: string;
  actionLabel: string; // "Delivery" or "Pickup"
  // Whether this item is tracked as individual QR-tagged assets — when
  // true, completing this entry offers an optional scan step so the
  // specific unit involved gets linked to this ticket and its live
  // location updated. See supabase/migrations/005_scan_based_assets.sql.
  isSerialized: boolean;
  onClose: () => void;
  onComplete: (confirmedQty: number, completionNotes: string, photoUri?: string, scannedAssetNumber?: string) => void;
}

export function CompleteEntrySheet({ visible, entry, itemName, branchName, actionLabel, isSerialized, onClose, onComplete }: Props) {
  const [confirmedQty, setConfirmedQty] = useState(1);
  const [completionNotes, setCompletionNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scannedAssetNumber, setScannedAssetNumber] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (visible && entry) {
      setConfirmedQty(entry.confirmedQty ?? entry.qty);
      setCompletionNotes(entry.completionNotes ?? '');
      setPhotoUri(null);
      setScannedAssetNumber(null);
    }
  }, [visible, entry]);

  if (!entry) return null;

  const isPlanned = entry.status === 'planned';
  const qtyMismatch = !isPlanned && entry.confirmedQty !== undefined && entry.confirmedQty !== entry.qty;

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to document this delivery/pickup.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>
                {branchName} · {entry.date}
              </Text>
            </View>
            <StatusPill status={isPlanned ? 'Planned' : 'Completed'} />
          </View>

          <Text style={styles.plannedLine}>Planned qty: {entry.qty}</Text>
          {!!entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}

          {isPlanned ? (
            <>
              <Text style={styles.fieldLabel}>Confirm quantity {actionLabel === 'Pickup' ? 'picked up' : 'delivered'}</Text>
              <View style={{ marginBottom: spacing.md }}>
                {/* min 0, not 1: confirming a completion can legitimately mean
                    "nothing was actually there" (e.g. a canceled pickup) —
                    unlike creating a new entry, which always requires at
                    least 1 to be worth logging in the first place. */}
                <QuantityStepper value={confirmedQty} onChange={setConfirmedQty} min={0} />
              </View>

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="e.g. 2 chairs damaged in transit"
                placeholderTextColor={colors.sub}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Photo (optional)</Text>
              {photoUri ? (
                <View style={styles.photoRow}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable style={styles.photoRetake} onPress={takePhoto}>
                    <Text style={styles.photoRetakeLabel}>Retake</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoButtonLabel}>Take Photo</Text>
                </Pressable>
              )}

              {isSerialized && (
                <>
                  <Text style={styles.fieldLabel}>
                    Scan asset {actionLabel === 'Pickup' ? '(confirms which unit came back)' : '(optional)'}
                  </Text>
                  {scannedAssetNumber ? (
                    <View style={styles.scannedRow}>
                      <Text style={styles.scannedNumber}>{scannedAssetNumber}</Text>
                      <Pressable style={styles.photoRetake} onPress={() => setShowScanner(true)}>
                        <Text style={styles.photoRetakeLabel}>Rescan</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.photoButton} onPress={() => setShowScanner(true)}>
                      <Text style={styles.photoButtonLabel}>Scan Asset</Text>
                    </Pressable>
                  )}
                </>
              )}

              <View style={styles.buttonRow}>
                <ActionButton label="Cancel" variant="outline" onPress={onClose} />
                <ActionButton
                  label="Mark Completed"
                  variant="filled"
                  onPress={() => onComplete(confirmedQty, completionNotes, photoUri ?? undefined, scannedAssetNumber ?? undefined)}
                />
              </View>

              <ScanAssetSheet
                visible={showScanner}
                onCancel={() => setShowScanner(false)}
                onScanned={number => {
                  setShowScanner(false);
                  setScannedAssetNumber(number);
                }}
              />
            </>
          ) : (
            <>
              <Text style={styles.confirmedLine}>
                Confirmed qty: {entry.confirmedQty} {qtyMismatch ? '(differs from planned)' : ''}
              </Text>
              {!!entry.completedAt && <Text style={styles.notes}>Completed {entry.completedAt}</Text>}
              {!!entry.completionNotes && <Text style={styles.notes}>{entry.completionNotes}</Text>}
              {!!entry.completionPhotoUrl && <Image source={{ uri: entry.completionPhotoUrl }} style={styles.completedPhoto} />}

              <View style={styles.buttonRow}>
                <ActionButton label="Close" variant="outline" onPress={onClose} />
              </View>
            </>
          )}
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
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  plannedLine: { fontSize: 14, color: colors.ink, marginTop: spacing.sm },
  confirmedLine: { fontSize: 14, color: colors.ink, marginTop: spacing.sm, fontWeight: '600' },
  notes: { fontSize: 13, color: colors.sub, marginTop: 4, fontStyle: 'italic' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginTop: spacing.lg, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 15,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  photoButtonLabel: { fontSize: 14, fontWeight: '600', color: colors.accent },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoPreview: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.card },
  photoRetake: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoRetakeLabel: { fontSize: 13, fontWeight: '600', color: colors.accent },
  completedPhoto: { width: '100%', height: 180, borderRadius: radii.lg, marginTop: spacing.md, backgroundColor: colors.card },
  scannedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  scannedNumber: { fontSize: 15, fontWeight: '700', color: colors.ink },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
});
