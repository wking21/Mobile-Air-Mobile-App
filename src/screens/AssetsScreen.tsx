import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AssetDetailSheet } from '../components/AssetDetailSheet';
import { AssetRow } from '../components/AssetRow';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { RegisterAssetSheet, ScannedAssetForm } from '../components/RegisterAssetSheet';
import { ScanAssetSheet } from '../components/ScanAssetSheet';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { uploadPhoto } from '../api/dataService';

export function AssetsScreen() {
  const { branches, items, assets, branchName, itemName, scanAsset } = useAppData();
  const [query, setQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedNumber, setScannedNumber] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return assets;
    return assets.filter(a => a.assetNumber.toLowerCase().includes(q) || itemName(a.itemId).toLowerCase().includes(q));
  }, [assets, query, itemName]);

  const selected = assets.find(a => a.id === selectedAssetId) ?? null;

  async function handleConfirm(form: ScannedAssetForm) {
    try {
      const photoUrl = form.photoUri ? await uploadPhoto(form.photoUri, 'assets') : undefined;
      await scanAsset({
        assetNumber: form.assetNumber,
        itemId: form.itemId,
        currentBranchId: form.currentBranchId,
        photoUrl,
      });
      setScannedNumber(null);
    } catch (err) {
      console.error('Failed to save scanned asset', err);
      Alert.alert('Could not save asset', 'Please try again.');
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
            placeholder="Search asset number or item"
            placeholderTextColor={colors.sub}
            style={styles.search}
          />
          <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
            <Text style={styles.scanButtonLabel}>Scan</Text>
          </Pressable>
        </View>

        {assets.length === 0 ? (
          <Text style={styles.emptyHint}>
            No scanned assets yet. Scan an item's Infor QR tag to start tracking its live location — any item can
            become individually tracked this way.
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

      <ScanAssetSheet
        visible={showScanner}
        onCancel={() => setShowScanner(false)}
        onScanned={number => {
          setShowScanner(false);
          setScannedNumber(number);
        }}
      />

      <RegisterAssetSheet
        visible={!!scannedNumber}
        assetNumber={scannedNumber ?? ''}
        branches={branches}
        items={items}
        onCancel={() => setScannedNumber(null)}
        onSave={handleConfirm}
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
  scanButton: {
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  scanButtonLabel: { ...type.body, fontSize: 14, color: colors.white },
  emptyHint: { fontSize: 14, color: colors.sub, textAlign: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
});
