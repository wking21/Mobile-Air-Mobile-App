import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radii, spacing, type } from '../theme';
import { EquipmentLoss } from '../types';
import { ActionButton } from './ActionButton';
import { StatusPill } from './StatusPill';

interface Props {
  visible: boolean;
  onClose: () => void;
  branchName: string;
  itemName: string;
  lossCase: EquipmentLoss | null;
  onAssign: (assignedTo: string) => void;
  onSubmit: (resolutionNotes: string) => void;
  onApprove: (approvedBy: string) => void;
  onReject: (rejectionNotes: string) => void;
}

const STATUS_LABEL: Record<EquipmentLoss['status'], 'Open' | 'Pending Approval' | 'Resolved'> = {
  open: 'Open',
  pending_approval: 'Pending Approval',
  resolved: 'Resolved',
};

export function LossCaseSheet({
  visible,
  onClose,
  branchName,
  itemName,
  lossCase,
  onAssign,
  onSubmit,
  onApprove,
  onReject,
}: Props) {
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [approverName, setApproverName] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    if (visible && lossCase) {
      setAssignedTo(lossCase.assignedTo ?? '');
      setResolutionNotes(lossCase.resolutionNotes ?? '');
      setApproverName('');
      setRejecting(false);
      setRejectionNotes('');
    }
  }, [visible, lossCase]);

  if (!lossCase) return null;

  const hasOwner = !!lossCase.assignedTo;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{itemName}</Text>
              <Text style={styles.subtitle}>{branchName}</Text>
            </View>
            <StatusPill status={STATUS_LABEL[lossCase.status]} />
          </View>

          <Text style={styles.summary}>
            Missing {lossCase.quantityMissing} · Estimated loss ${lossCase.estimatedCost.toFixed(2)}
          </Text>

          <ScrollView style={styles.scroll}>
            {!!lossCase.rejectionNotes && lossCase.status === 'open' && (
              <View style={styles.rejectionBanner}>
                <Text style={styles.rejectionLabel}>Sent back for more info</Text>
                <Text style={styles.rejectionText}>{lossCase.rejectionNotes}</Text>
              </View>
            )}

            {lossCase.status === 'open' && (
              <>
                <Text style={styles.fieldLabel}>Assigned to</Text>
                <View style={styles.assignRow}>
                  <TextInput
                    value={assignedTo}
                    onChangeText={setAssignedTo}
                    placeholder="Name or email"
                    placeholderTextColor={colors.sub}
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  <Pressable
                    style={[styles.smallButton, !assignedTo.trim() && styles.smallButtonDisabled]}
                    disabled={!assignedTo.trim()}
                    onPress={() => onAssign(assignedTo.trim())}
                  >
                    <Text style={styles.smallButtonLabel}>{hasOwner ? 'Update' : 'Assign'}</Text>
                  </Pressable>
                </View>

                {hasOwner && (
                  <>
                    <Text style={styles.fieldLabel}>Resolution notes</Text>
                    <TextInput
                      value={resolutionNotes}
                      onChangeText={setResolutionNotes}
                      placeholder="What happened to the missing units?"
                      placeholderTextColor={colors.sub}
                      multiline
                      style={[styles.input, styles.textArea]}
                    />
                    <ActionButton
                      label="Submit for Approval"
                      variant="filled"
                      onPress={() => onSubmit(resolutionNotes.trim())}
                      disabled={!resolutionNotes.trim()}
                    />
                  </>
                )}
              </>
            )}

            {lossCase.status === 'pending_approval' && (
              <>
                <Text style={styles.fieldLabel}>Assigned to</Text>
                <Text style={styles.readOnlyValue}>{lossCase.assignedTo}</Text>
                <Text style={styles.fieldLabel}>Resolution notes</Text>
                <Text style={styles.readOnlyValue}>{lossCase.resolutionNotes}</Text>

                {!rejecting ? (
                  <>
                    <Text style={styles.fieldLabel}>Approver name</Text>
                    <TextInput
                      value={approverName}
                      onChangeText={setApproverName}
                      placeholder="Name or email"
                      placeholderTextColor={colors.sub}
                      style={styles.input}
                    />
                    <View style={styles.buttonRow}>
                      <ActionButton label="Reject" variant="outline" onPress={() => setRejecting(true)} />
                      <ActionButton
                        label="Approve"
                        variant="filled"
                        onPress={() => onApprove(approverName.trim())}
                        disabled={!approverName.trim()}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.fieldLabel}>Why is this being sent back?</Text>
                    <TextInput
                      value={rejectionNotes}
                      onChangeText={setRejectionNotes}
                      placeholder="Explain what's missing or unclear"
                      placeholderTextColor={colors.sub}
                      multiline
                      style={[styles.input, styles.textArea]}
                    />
                    <View style={styles.buttonRow}>
                      <ActionButton label="Cancel" variant="outline" onPress={() => setRejecting(false)} />
                      <ActionButton
                        label="Confirm Reject"
                        variant="filled"
                        onPress={() => onReject(rejectionNotes.trim())}
                        disabled={!rejectionNotes.trim()}
                      />
                    </View>
                  </>
                )}
              </>
            )}

            {lossCase.status === 'resolved' && (
              <>
                <Text style={styles.fieldLabel}>Assigned to</Text>
                <Text style={styles.readOnlyValue}>{lossCase.assignedTo}</Text>
                <Text style={styles.fieldLabel}>Resolution notes</Text>
                <Text style={styles.readOnlyValue}>{lossCase.resolutionNotes}</Text>
                <Text style={styles.fieldLabel}>Approved by</Text>
                <Text style={styles.readOnlyValue}>
                  {lossCase.approvedBy}
                  {lossCase.approvedAt ? ` · ${lossCase.approvedAt.slice(0, 10)}` : ''}
                </Text>
              </>
            )}
          </ScrollView>

          <View style={styles.closeRow}>
            <ActionButton label="Close" variant="outline" onPress={onClose} />
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
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  title: { ...type.sheetTitle, color: colors.ink },
  subtitle: { fontSize: 14, color: colors.sub, marginTop: 2 },
  summary: { fontSize: 14, fontWeight: '600', color: colors.bad, marginTop: spacing.sm, marginBottom: spacing.md },
  scroll: { flexGrow: 0 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginTop: spacing.md, marginBottom: 5 },
  readOnlyValue: { fontSize: 15, color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.ink,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
  assignRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  smallButton: { borderRadius: radii.sm, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: colors.accent },
  smallButtonDisabled: { opacity: 0.4 },
  smallButtonLabel: { fontSize: 14, fontWeight: '600', color: colors.white },
  rejectionBanner: {
    backgroundColor: colors.badBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rejectionLabel: { fontSize: 12, fontWeight: '700', color: colors.bad, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: colors.bad },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  closeRow: { marginTop: spacing.lg },
});
