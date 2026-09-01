import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AssetDetailSheet } from '../components/AssetDetailSheet';
import { AssetRow } from '../components/AssetRow';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { RegisterAssetForm, RegisterAssetSheet } from '../components/RegisterAssetSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { uploadPhoto } from '../api/dataService';

export function AssetsScreen() {
  const { branches, items, assets, branchName, itemName, addAsset } = useAppData();
  const [query, setQuery] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return assets;
    return assets.filter(
      a =>
        a.assetNumber.toLowerCase().includes(q) ||
        itemName(a.itemId).toLowerCase().includes(q) ||
        (a.manufacturerSerial ?? '').toLowerCase().includes(q)
    );
  }, [assets, query, itemName]);

  const selected = assets.find(a => a.id === selectedAssetId) ?? null;

  async function handleRegister(form: RegisterAssetForm) {
    try {
      const photoUrl = form.photoUri ? await uploadPhoto(form.photoUri, 'assets') : undefined;
      await addAsset({
        itemId: form.itemId,
        currentBranchId: form.currentBranchId,
        manufacturerSerial: form.manufacturerSerial,
        photoUrl,
      });
      setShowRegister(false);
    } catch (err) {
      console.error('Failed to register asset', err);
      Alert.alert('Could not register asset', 'Please try again.');
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Assets" />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search asset number, item, serial"
            placeholderTextColor={colors.sub}
            style={styles.search}
          />
          <Pressable style={styles.newButton} onPress={() => setShowRegister(true)}>
            <Text style={styles.newButtonLabel}>+ New</Text>
          </Pressable>
        </View>

        {assets.length === 0 ? (
          <Text style={styles.emptyHint}>
            No individually tracked assets yet. Register one to generate its QR code — any item can become
            serialized this way.
          </Text>
        ) : (
          <Card>
            <FlatList
              data={filtered}
              keyExtractor={a => a.id}
              ItemSeparatorComponent={Divider}
              renderItem={({ item: a }) => (
                <AssetRow
                  assetNumber={a.assetNumber}
                  itemName={itemName(a.itemId)}
                  manufacturerSerial={a.manufacturerSerial}
                  branchName={a.currentBranchId ? branchName(a.currentBranchId) : 'Unassigned'}
                  status={a.status}
                  photoUrl={a.photoUrl}
                  onPress={() => setSelectedAssetId(a.id)}
                />
              )}
            />
          </Card>
        )}
      </View>

      <RegisterAssetSheet
        visible={showRegister}
        branches={branches}
        items={items}
        onCancel={() => setShowRegister(false)}
        onSave={handleRegister}
      />

      <AssetDetailSheet
        visible={!!selected}
        asset={selected}
        itemName={selected ? itemName(selected.itemId) : ''}
        branchName={selected?.currentBranchId ? branchName(selected.currentBranchId) : 'Unassigned'}
        onClose={() => setSelectedAssetId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  topRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  newButton: {
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  newButtonLabel: { ...type.body, fontSize: 14, color: colors.white },
  emptyHint: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
});
