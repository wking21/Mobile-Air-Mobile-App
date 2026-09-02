import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../components/Card';
import { CompleteEntrySheet } from '../components/CompleteEntrySheet';
import { Divider } from '../components/Divider';
import { LineItemRow } from '../components/LineItemRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { fetchDeliveriesPage, linkAssetToDelivery, uploadPhoto } from '../api/dataService';
import { LineItem } from '../types';
import { colors, radii, spacing, type } from '../theme';
import { useAppData } from '../state/AppContext';
import { useSheet } from '../state/SheetContext';

export function DeliveriesScreen() {
  const { branchName, itemName, items, completeDeliveryEntry, scanAsset, dataVersion } = useAppData();
  const { openDeliverSheet } = useSheet();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [entries, setEntries] = useState<LineItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Paginated rather than loaded in full — at millions of rows the app can't
  // hold the whole deliveries table in memory. Resets to page 0 whenever the
  // shared data version bumps (a mutation from this screen or any other
  // device), so a newly created delivery still shows up at the top.
  useEffect(() => {
    let cancelled = false;
    fetchDeliveriesPage(0)
      .then(({ items, hasMore }) => {
        if (cancelled) return;
        setEntries(items);
        setPage(0);
        setHasMore(hasMore);
      })
      .catch(err => console.error('Failed to load deliveries', err));
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items, hasMore: more } = await fetchDeliveriesPage(nextPage);
      setEntries(prev => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(more);
    } catch (err) {
      console.error('Failed to load more deliveries', err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  const rows = useMemo(
    () => entries.map(d => ({ ...d, branchName: branchName(d.branchId), itemName: itemName(d.itemId) })),
    [entries, branchName, itemName]
  );

  const selected = entries.find(d => d.id === selectedId) ?? null;
  const selectedItemIsSerialized = selected ? (items.find(i => i.id === selected.itemId)?.isSerialized ?? false) : false;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Deliveries" />
      <View style={styles.content}>
        <View style={styles.newRow}>
          <Pressable style={styles.newButton} onPress={openDeliverSheet}>
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
        actionLabel="Delivery"
        isSerialized={selectedItemIsSerialized}
        onClose={() => setSelectedId(null)}
        onComplete={async (confirmedQty, completionNotes, photoUri, scannedAssetNumber) => {
          if (!selected) return;
          const completionPhotoUrl = photoUri ? await uploadPhoto(photoUri, 'deliveries') : undefined;
          const updated = await completeDeliveryEntry({ id: selected.id, confirmedQty, completionNotes, completionPhotoUrl });
          if (scannedAssetNumber) {
            // A delivered asset isn't sitting at any of our branches right
            // now — currentBranchId stays unset until it's scanned again
            // on the way back in (see PickupsScreen).
            const asset = await scanAsset({ assetNumber: scannedAssetNumber, itemId: selected.itemId, status: 'out_on_delivery' });
            await linkAssetToDelivery(updated.id, asset.id);
          }
          setEntries(prev => prev.map(d => (d.id === updated.id ? updated : d)));
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
