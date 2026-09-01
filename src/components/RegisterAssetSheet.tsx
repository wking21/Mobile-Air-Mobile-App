import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { Branch, ItemMaster } from '../types';
import { ActionButton } from './ActionButton';

// The sheet only ever produces a local device photo URI — uploading it to
// Storage and turning it into the photoUrl NewAssetInput expects is the
// caller's job (see AssetsScreen), since that's a network operation the
// sheet itself shouldn't need to know about.
export interface RegisterAssetForm {
  itemId: number;
  currentBranchId?: number;
  manufacturerSerial?: string;
  photoUri?: string;
}

interface Props {
  visible: boolean;
  branches: Branch[];
  items: ItemMaster[];
  onCancel: () => void;
  onSave: (input: RegisterAssetForm) => Promise<void>;
}

export function RegisterAssetSheet({ visible, branches, items, onCancel, onSave }: Props) {
  const [itemId, setItemId] = useState<number>(items[0]?.id ?? 0);
  const [branchId, setBranchId] = useState<number>(branches[0]?.id ?? 0);
  const [manufacturerSerial, setManufacturerSerial] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setItemId(items[0]?.id ?? 0);
      setBranchId(branches[0]?.id ?? 0);
      setManufacturerSerial('');
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
      await onSave({
        itemId,
        currentBranchId: branchId || undefined,
        manufacturerSerial: manufacturerSerial.trim() || undefined,
        photoUri: photoUri ?? undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Register Asset</Text>
          <Text style={styles.subtitle}>
            Creates a QR-taggable record for one physical unit. The asset number is a placeholder until this is
            reconciled with Infor's real asset registry.
          </Text>

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

          <Text style={styles.fieldLabel}>Manufacturer serial (optional)</Text>
          <TextInput
            value={manufacturerSerial}
            onChangeText={setManufacturerSerial}
            placeholder="e.g. printed on the equipment's own tag"
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

          <View style={styles.buttonRow}>
            <ActionButton label="Cancel" variant="outline" onPress={onCancel} disabled={saving} />
            {saving ? (
              <View style={styles.savingButton}>
                <ActivityIndicator color={colors.white} />
              </View>
            ) : (
              <ActionButton label="Register" variant="filled" onPress={handleSave} disabled={!itemId} />
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
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 13, color: colors.sub, marginTop: 4, marginBottom: spacing.md + 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginBottom: 5 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
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
