import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { ItemRow } from '../components/ItemRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radii, spacing } from '../theme';
import { useAppData } from '../state/AppContext';

export function ItemsScreen() {
  const { items } = useAppData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => items.filter(it => it.name.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Item Master" />
      <View style={styles.content}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items"
          placeholderTextColor={colors.sub}
          style={styles.search}
        />
        <Card>
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <ItemRow name={item.name} category={item.category} unitCost={item.unitCost} />
            )}
          />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    color: colors.ink,
  },
});
