import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { Branch, ItemMaster, NewLineItemInput } from '../types';
import { ActionButton } from './ActionButton';
import { QuantityStepper } from './QuantityStepper';

interface Props {
  visible: boolean;
  title: string;
  branches: Branch[];
  items: ItemMaster[];
  onCancel: () => void;
  onSave: (input: NewLineItemInput) => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EntrySheet({ visible, title, branches, items, onCancel, onSave }: Props) {
  const [branchId, setBranchId] = useState<number>(branches[0]?.id ?? 0);
  const [itemId, setItemId] = useState<number>(items[0]?.id ?? 0);
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset the draft whenever the sheet re-opens, matching the design's
  // "pre-filled with the first branch/item and quantity 1" behavior.
  React.useEffect(() => {
    if (visible) {
      setBranchId(branches[0]?.id ?? 0);
      setItemId(items[0]?.id ?? 0);
      setQty(1);
      setDate(todayIso());
      setNotes('');
    }
  }, [visible, branches, items]);

  const handleSave = () => {
    onSave({ branchId, itemId, qty, date, notes });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.fieldLabel}>Branch</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={branchId} onValueChange={v => setBranchId(Number(v))}>
              {branches.map(b => (
                <Picker.Item key={b.id} label={b.name} value={b.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Item</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={itemId} onValueChange={v => setItemId(Number(v))}>
              {items.map(it => (
                <Picker.Item key={it.id} label={it.name} value={it.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <View style={{ marginBottom: spacing.md }}>
            <QuantityStepper value={qty} onChange={setQty} />
          </View>

          <Text style={styles.fieldLabel}>Date</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={new Date(date)}
              mode="date"
              display="compact"
              onChange={(_, selected) => selected && setDate(selected.toISOString().slice(0, 10))}
              style={styles.iosDatePicker}
            />
          ) : (
            <>
              <Pressable style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonLabel}>{date}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(date)}
                  mode="date"
                  onChange={(_, selected) => {
                    setShowDatePicker(false);
                    if (selected) setDate(selected.toISOString().slice(0, 10));
                  }}
                />
              )}
            </>
          )}

          <Text style={styles.fieldLabel}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Event setup"
            placeholderTextColor={colors.sub}
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <ActionButton label="Cancel" variant="outline" onPress={onCancel} />
            <ActionButton label="Save" variant="filled" onPress={handleSave} />
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
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginBottom: 5 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  dateButtonLabel: { fontSize: 15, color: colors.ink },
  iosDatePicker: { alignSelf: 'flex-start', marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 15,
    marginBottom: spacing.lg + 2,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  buttonRow: { flexDirection: 'row', gap: 10 },
});
