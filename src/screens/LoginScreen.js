import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { HelperText, Surface, Text, TextInput } from 'react-native-paper';
import MobileButton from '../components/terrain/MobileButton';
import { LosangeLogo } from '../components/terrain/LosangeLogoLoader';
import { APP_NAME, chantierColors } from '../styles/theme';

const IDENTIFIANT_PATTERN = /^[A-Z][0-9]{2}[A-Z]$/;

export default function LoginScreen({ onLogin, variant = 'terrain' }) {
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const isMasterLogin = variant === 'master';
  const normalizedIdentifiant = useMemo(() => identifiant.trim().toUpperCase(), [identifiant]);
  const hasValidIdentifiant = IDENTIFIANT_PATTERN.test(normalizedIdentifiant);
  const canSubmit = hasValidIdentifiant && motDePasse.trim().length > 0;

  const handleLogin = async () => {
    setSubmitted(true);
    setAuthError('');
    if (!canSubmit) return;

    setLoading(true);
    try {
      const result = await onLogin?.({
        identifiant: normalizedIdentifiant,
        motDePasse,
      });

      if (result && result.ok === false && result.error) {
        setAuthError(result.error);
      }
    } catch (error) {
      setAuthError(error.message || 'Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={24}
    >
      <View style={styles.logoWrap}>
        <LosangeLogo size={120} />
        <Text variant="headlineLarge" style={styles.appName}>
          {APP_NAME}
        </Text>
      </View>

      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          {isMasterLogin ? 'Admin MASTER' : 'Connexion'}
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          {isMasterLogin
            ? 'Accès réservé au compte administrateur principal.'
            : 'Entrez votre identifiant et mot de passe.'}
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
        <HelperText type="error" visible={Boolean(authError)}>
          {authError}
        </HelperText>
      </Surface>

      <View style={styles.bottomAction}>
        <MobileButton
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Se connecter
        </MobileButton>
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
  logoWrap: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  appName: {
    color: chantierColors.text,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  header: {
    gap: 8,
    marginBottom: 24,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '700',
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
    minHeight: 60,
  },
});
