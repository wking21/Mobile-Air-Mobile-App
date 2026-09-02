import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { useAuth } from '../state/AuthContext';
import { colors, radii, spacing, type } from '../theme';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Ancillary Reconciliation</Text>
        <Text style={styles.title}>Sign in</Text>

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor={colors.sub}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.sub}
          secureTextEntry
          style={styles.input}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.buttonRow}>
          {submitting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <ActionButton label="Sign In" variant="filled" onPress={handleSignIn} disabled={!email || !password} />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radii.xl, padding: spacing.xl },
  eyebrow: { ...type.eyebrow, color: colors.sub },
  title: { ...type.header, color: colors.ink, marginTop: 2, marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.sub, marginTop: spacing.md, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.background,
    color: colors.ink,
  },
  error: { color: colors.bad, fontSize: 13, marginTop: spacing.md },
  buttonRow: { flexDirection: 'row', marginTop: spacing.lg },
});
