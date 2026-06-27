import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import LosangeLogoLoader from './src/components/terrain/LosangeLogoLoader';
import LoginScreen from './src/screens/LoginScreen';
import MasterScreen from './src/screens/web/MasterScreen';
import { loginMasterAdmin, logoutMasterAdmin, verifyMasterSession } from './src/auth/masterAdminAuth';
import { appTheme, chantierColors } from './src/styles/theme';

/**
 * Entrée web isolée : pas de SQLite terrain, pas d'écrans mobiles natifs.
 * Évite le chargement du WASM expo-sqlite (crash Chrome STATUS_ILLEGAL_INSTRUCTION).
 */
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const session = await verifyMasterSession();
        if (!cancelled && session.ok) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Erreur verification session MASTER:', error);
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = useCallback(async ({ identifiant, motDePasse }) => {
    const authResult = await loginMasterAdmin(identifiant, motDePasse);
    if (!authResult.ok) {
      return authResult;
    }
    setIsLoggedIn(true);
    return { ok: true };
  }, []);

  const handleLogout = useCallback(() => {
    logoutMasterAdmin();
    setIsLoggedIn(false);
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.container}>
            {!authReady ? (
              <View style={styles.webAuthLoading}>
                <LosangeLogoLoader size="large" />
                <Text style={styles.webAuthLoadingText}>Verification de la session...</Text>
              </View>
            ) : null}
            {authReady && !isLoggedIn ? (
              <LoginScreen variant="master" onLogin={handleLogin} />
            ) : null}
            {authReady && isLoggedIn ? <MasterScreen onLogout={handleLogout} /> : null}
            <StatusBar style="dark" />
          </View>
        </SafeAreaView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: chantierColors.background,
  },
  container: {
    flex: 1,
  },
  webAuthLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: chantierColors.background,
  },
  webAuthLoadingText: {
    color: chantierColors.muted,
  },
});
