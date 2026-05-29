import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { chantierColors } from '../styles/theme';

const IDENTIFIANT_PATTERN = /^[A-Z][0-9]{2}[A-Z]$/;

export default function LoginScreen({ onLogin }) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const normalizedIdentifiant = useMemo(() => identifiant.trim().toUpperCase(), [identifiant]);
  const hasValidIdentifiant = IDENTIFIANT_PATTERN.test(normalizedIdentifiant);
  const canSubmit = hasValidIdentifiant && motDePasse.trim().length > 0;

  const handleLogin = () => {
    setSubmitted(true);
    if (!canSubmit) return;
    onLogin?.({
      identifiant: normalizedIdentifiant,
      motDePasse,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={24}
    >
      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>
          Connexion
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Entrez votre identifiant et mot de passe.
        </Text>
      </View>

      <Surface style={styles.formCard} elevation={2}>
        <TextInput
          label="Identifiant"
          mode="outlined"
          value={identifiant}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={4}
          onChangeText={(value) => setIdentifiant(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
          style={styles.input}
        />
        <HelperText type="error" visible={submitted && !hasValidIdentifiant}>
          L'identifiant est requis.
        </HelperText>

        <TextInput
          label="Mot de passe"
          mode="outlined"
          value={motDePasse}
          onChangeText={setMotDePasse}
          secureTextEntry
          style={styles.input}
        />
        <HelperText type="error" visible={submitted && motDePasse.trim().length === 0}>
          Le mot de passe est requis.
        </HelperText>
      </Surface>

      <View style={styles.bottomAction}>
        <Button mode="contained" onPress={handleLogin} style={styles.button} contentStyle={styles.buttonContent}>
          Se connecter
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  header: {
    gap: 8,
    marginBottom: 24,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: chantierColors.muted,
  },
  formCard: {
    borderRadius: 14,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    padding: 14,
  },
  input: {
    marginBottom: 2,
  },
  bottomAction: {
    marginTop: 10,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    minHeight: 56,
  },
});
