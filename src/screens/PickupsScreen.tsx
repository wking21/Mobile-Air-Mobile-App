import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { CompleteEntrySheet } from '../components/CompleteEntrySheet';
import { Divider } from '../components/Divider';
import { LineItemRow } from '../components/LineItemRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchPickupsPage, linkAssetToPickup, uploadPhoto } from '../api/dataService';
import { LineItem } from '../types';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';

export function PickupsScreen() {
  const { branchName, itemName, items, completePickupEntry, scanAsset, dataVersion } = useAppData();
  const { openPickupSheet } = useSheet();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [entries, setEntries] = useState<LineItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Paginated rather than loaded in full — at millions of rows the app can't
  // hold the whole pickups table in memory. Resets to page 0 whenever the
  // shared data version bumps (a mutation from this screen or any other
  // device), so a newly created pickup still shows up at the top.
  useEffect(() => {
    let cancelled = false;
    fetchPickupsPage(0)
      .then(({ items, hasMore }) => {
        if (cancelled) return;
        setEntries(items);
        setPage(0);
        setHasMore(hasMore);
      })
      .catch(err => console.error('Failed to load pickups', err));
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items, hasMore: more } = await fetchPickupsPage(nextPage);
      setEntries(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(more);
    } catch (err) {
      console.error('Failed to load more pickups', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  const rows = useMemo(
    () => entries.map(p => ({ ...p, branchName: branchName(p.branchId), itemName: itemName(p.itemId) })),
    [entries, branchName, itemName]
  );

  const selected = entries.find(p => p.id === selectedId) ?? null;
  const selectedItemIsSerialized = selected ? (items.find(i => i.id === selected.itemId)?.isSerialized ?? false) : false;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Pickups" />
      <View style={styles.content}>
        <View style={styles.newRow}>
          <Pressable style={styles.newButton} onPress={openPickupSheet}>
            <Text style={styles.newButtonLabel}>+ New</Text>
          </Pressable>
        </View>
        <Card>
          <FlatList
            data={rows}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={Divider}
            onEndReachedThreshold={0.4}
            onEndReached={loadMore}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} color={colors.accent} /> : null}
            renderItem={({ item }) => (
              <LineItemRow
                itemName={item.itemName}
                qty={item.qty}
                branchName={item.branchName}
                date={item.date}
                notes={item.notes}
                status={item.status}
                onPress={() => setSelectedId(item.id)}
              />
            )}
          />
        </Card>
      </View>

      <CompleteEntrySheet
        visible={!!selected}
        entry={selected}
        itemName={selected ? itemName(selected.itemId) : ''}
        branchName={selected ? branchName(selected.branchId) : ''}
        actionLabel="Pickup"
        isSerialized={selectedItemIsSerialized}
        onClose={() => setSelectedId(null)}
        onComplete={async (confirmedQty, completionNotes, photoUri, scannedAssetNumber) => {
          if (!selected) return;
          const completionPhotoUrl = photoUri ? await uploadPhoto(photoUri, 'pickups') : undefined;
          const updated = await completePickupEntry({ id: selected.id, confirmedQty, completionNotes, completionPhotoUrl });
          if (scannedAssetNumber) {
            // A picked-up asset is back at the branch that picked it up —
            // this is the "live inventory" update neither Texada nor
            // Infor provides today.
            const asset = await scanAsset({
              assetNumber: scannedAssetNumber,
              itemId: selected.itemId,
              currentBranchId: selected.branchId,
              status: 'at_branch',
            });
            await linkAssetToPickup(updated.id, asset.id);
          }
          setEntries(prev => prev.map(p => (p.id === updated.id ? updated : p)));
          setSelectedId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  newRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  newButton: {
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: colors.accent,
  },
  newButtonLabel: { ...type.body, fontSize: 14, color: colors.white },
  loadingMore: { paddingVertical: spacing.md },
});
