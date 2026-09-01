import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { Branch, ItemMaster } from '../types';
import { ActionButton } from './ActionButton';

// Confirms the details for an asset number just read off its Infor QR tag
// (see ScanAssetSheet) — the sheet never invents an asset number itself,
// it only asks which catalog item this scanned tag belongs to and where
// it currently is.
export interface ScannedAssetForm {
  assetNumber: string;
  itemId: number;
  currentBranchId?: number;
  photoUri?: string;
}

interface Props {
  visible: boolean;
  assetNumber: string;
  branches: Branch[];
  items: ItemMaster[];
  onCancel: () => void;
  onSave: (input: ScannedAssetForm) => Promise<void>;
}

export function RegisterAssetSheet({ visible, assetNumber, branches, items, onCancel, onSave }: Props) {
  const [itemId, setItemId] = useState<number>(items[0]?.id ?? 0);
  const [branchId, setBranchId] = useState<number>(branches[0]?.id ?? 0);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setItemId(items[0]?.id ?? 0);
      setBranchId(branches[0]?.id ?? 0);
      setPhotoUri(null);
      setSaving(false);
    }
  }, [visible, items, branches]);

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to photograph this asset.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ assetNumber, itemId, currentBranchId: branchId || undefined, photoUri: photoUri ?? undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Confirm Scanned Asset</Text>
          <View style={styles.assetNumberBox}>
            <Text style={styles.assetNumberLabel}>Scanned asset number</Text>
            <Text style={styles.assetNumberValue}>{assetNumber}</Text>
          </View>

          <Text style={styles.fieldLabel}>Item</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={itemId} onValueChange={v => setItemId(Number(v))}>
              {items.map(it => (
                <Picker.Item key={it.id} label={it.name} value={it.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Branch</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={branchId} onValueChange={v => setBranchId(Number(v))}>
              {branches.map(b => (
                <Picker.Item key={b.id} label={b.name} value={b.id} />
              ))}
            </Picker>
          </View>

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

          <View style={styles.buttonRow}>
            <ActionButton label="Cancel" variant="outline" onPress={onCancel} disabled={saving} />
            {saving ? (
              <View style={styles.savingButton}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : (
              <ActionButton label="Save" variant="filled" onPress={handleSave} disabled={!itemId} />
            )}
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
  title: { ...type.sheetTitle, color: colors.ink, marginBottom: spacing.md + 2 },
  assetNumberBox: {
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  assetNumberLabel: { fontSize: 11, fontWeight: '600', color: colors.sub, textTransform: 'uppercase' },
  assetNumberValue: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginBottom: 5 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  photoButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.card,
    marginBottom: spacing.lg + 2,
  },
  photoButtonLabel: { fontSize: 14, fontWeight: '600', color: colors.accent },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg + 2 },
  photoPreview: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.card },
  photoRetake: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  photoRetakeLabel: { fontSize: 13, fontWeight: '600', color: colors.accent },
  buttonRow: { flexDirection: 'row', gap: 10 },
  savingButton: {
    flex: 1,
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
