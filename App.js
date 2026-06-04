import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AdminScreen from './src/screens/web/AdminScreen';
import ChantierDetails from './src/screens/ChantierDetails';
import ListeChantiers from './src/screens/ListeChantiers';
import LoginScreen from './src/screens/LoginScreen';
import ClientChantierFormScreen from './src/screens/ClientChantierFormScreen';
import NouvelleDimensionScreen from './src/screens/NouvelleDimensionScreen';
import PaveSaisieOneHand from './src/screens/PaveSaisieOneHand';
import PlusScreen from './src/screens/PlusScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import SelecteurMetierOuvrage from './src/screens/SelecteurMetierOuvrage';
import { loginMasterAdmin, logoutMasterAdmin, verifyMasterSession } from './src/auth/masterAdminAuth';
import {
  assessTerrainLogin,
  ensureTerrainSessionAllowed,
  loginTerrain,
  logoutTerrain,
  restoreTerrainSession,
  syncTerrainDataFromSupabase,
} from './src/auth/terrainAuth';
import { INACTIVE_ENTREPRISE_ERROR } from './src/db/terrainSync';
import { initLocalDatabase } from './src/db/localDb';
import { clearDraftDimensionFlow, getDraftDimensionFlow, setDraftUiStep, startDraftDimensionFlow, startDraftFromChantierEdit } from './src/db/mockData';
import { deleteChantierLocal, ensureCatalogueLocal, finalizeDimensionDraftLocal, getLignesByChantierLocal, getReleveIdByChantierLocal } from './src/db/querries';
import { ensureTerrainDeviceFromSession } from './src/db/terrainSync';
import { appTheme, chantierColors } from './src/styles/theme';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('chantiers');
  const [selection, setSelection] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [chantierListRefreshToken, setChantierListRefreshToken] = useState(0);
  const [entrepriseId, setEntrepriseId] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const dimensionFlowNavRef = useRef(null);
  const [dimensionNavUi, setDimensionNavUi] = useState({ saveDisabled: true, saving: false });
  const bottomNavHeight = 84;

  const handleDimensionNavHandlersChange = useCallback((handlers) => {
    dimensionFlowNavRef.current = handlers;
    if (!handlers) {
      setDimensionNavUi({ saveDisabled: true, saving: false });
      return;
    }
    setDimensionNavUi((prev) => {
      if (prev.saveDisabled === handlers.saveDisabled && prev.saving === handlers.saving) {
        return prev;
      }
      return { saveDisabled: handlers.saveDisabled, saving: handlers.saving };
    });
  }, []);

  const handleDimensionFlowFinish = useCallback(() => {
    setScreen('clientChantier');
  }, []);

  const handleClientChantierSave = useCallback(
    async (payload) => {
      const draft = getDraftDimensionFlow();
      await finalizeDimensionDraftLocal({
        entrepriseId,
        ...payload,
        clientId: payload.clientId ?? draft?.clientId ?? null,
        chantierId: draft?.chantierId ?? null,
        releveId: draft?.releveId ?? null,
        lignes: draft?.lignes || [],
      });
      clearDraftDimensionFlow();
      setSelection(null);
      dimensionFlowNavRef.current = null;
      setDimensionNavUi({ saveDisabled: true, saving: false });
      setScreen('chantiers');
    },
    [entrepriseId]
  );

  const isDimensionFlow = screen === 'nouvelleDimension' || screen === 'clientChantier';

  const isChantiersNavActive =
    screen === 'chantiers' ||
    screen === 'chantierDetails' ||
    screen === 'nouvelleDimension' ||
    screen === 'clientChantier' ||
    screen === 'selecteurOuvrage' ||
    screen === 'saisieDimensions';

  const isPlusNavActive = screen === 'plus' || screen === 'profil';

  const handleForcedInactiveLogout = useCallback((message = INACTIVE_ENTREPRISE_ERROR) => {
    clearDraftDimensionFlow();
    dimensionFlowNavRef.current = null;
    setDimensionNavUi({ saveDisabled: true, saving: false });
    setSelection(null);
    setSelectedChantier(null);
    setEntrepriseId(null);
    setIsLoggedIn(false);
    setScreen('chantiers');
    Alert.alert('Compte inactif', message);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoggedIn) return undefined;

    const intervalId = setInterval(async () => {
      try {
        const { isProEntrepriseLocal, runTerrainSyncPushPull } = await import('./src/db/terrainSyncPro');
        if (await isProEntrepriseLocal()) {
          const result = await runTerrainSyncPushPull();
          if (result.forcedLogout) {
            handleForcedInactiveLogout(result.error);
          }
        }
      } catch (error) {
        console.warn('Sync periodique:', error);
      }
    }, 60000);

    return () => clearInterval(intervalId);
  }, [isLoggedIn, handleForcedInactiveLogout]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoggedIn) return undefined;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState !== 'active') return;

      try {
        const check = await ensureTerrainSessionAllowed({ verifyRemote: true });
        if (!check.ok && check.forcedLogout) {
          handleForcedInactiveLogout(check.error);
        }
      } catch (error) {
        console.warn('Verification compte au retour app:', error);
      }
    });

    return () => subscription.remove();
  }, [isLoggedIn, handleForcedInactiveLogout]);

  useEffect(() => {
    const bootstrap = async () => {
      if (Platform.OS === 'web') {
        try {
          const session = await verifyMasterSession();
          if (session.ok) {
            setIsLoggedIn(true);
            setScreen('admin');
          }
        } catch (error) {
          console.error('Erreur verification session MASTER:', error);
        } finally {
          setAuthReady(true);
        }
        return;
      }

      try {
        await initLocalDatabase();
        await ensureCatalogueLocal();
        const session = await restoreTerrainSession();
        if (session.ok) {
          await ensureTerrainDeviceFromSession();
          setIsLoggedIn(true);
          setEntrepriseId(session.entrepriseId);
          setScreen('chantiers');
        }
      } catch (error) {
        console.error('Erreur initialisation SQLite:', error);
      } finally {
        setAuthReady(true);
      }
    };
    bootstrap();
  }, []);

  const handleLogin = async ({ identifiant, motDePasse }) => {
    if (Platform.OS === 'web') {
      const authResult = await loginMasterAdmin(identifiant, motDePasse);
      if (!authResult.ok) {
        return authResult;
      }
      setIsLoggedIn(true);
      setScreen('admin');
      return { ok: true };
    }

    const completeMobileLogin = async (wipeLocal = false) => {
      const authResult = await loginTerrain(identifiant, motDePasse, { wipeLocal });
      if (!authResult.ok) {
        return authResult;
      }

      setIsLoggedIn(true);
      setEntrepriseId(authResult.entrepriseId);
      setScreen('chantiers');
      return { ok: true };
    };

    const assessment = await assessTerrainLogin(identifiant);
    if (!assessment.canProceed && assessment.error) {
      return { ok: false, error: assessment.error };
    }

    if (assessment.needsAccountSwitchConfirm) {
      return new Promise((resolve) => {
        Alert.alert(
          'Autre compte',
          'Un AUTRE COMPTE etait connecté à cet appareil. Ses données seront effacées du téléphone.',
          [
            { text: 'Non', style: 'cancel', onPress: () => resolve({ ok: false }) },
            {
              text: 'Oui',
              style: 'destructive',
              onPress: async () => {
                clearDraftDimensionFlow();
                resolve(await completeMobileLogin(true));
              },
            },
          ],
          { cancelable: false }
        );
      });
    }

    return completeMobileLogin(false);
  };

  const handleChantierUpdated = useCallback((updatedChantier) => {
    setSelectedChantier(updatedChantier);
    setChantierListRefreshToken((value) => value + 1);
  }, []);

  const handleCreatePress = () => {
    const draft = startDraftDimensionFlow();
    setSelection(draft);
    setScreen('nouvelleDimension');
  };

  const handleCancelDimensionFlow = () => {
    clearDraftDimensionFlow();
    setSelection(null);
    dimensionFlowNavRef.current = null;
    setDimensionNavUi({ saveDisabled: true, saving: false });
    setScreen('chantiers');
  };

  const confirmCancelDimensionFlow = () => {
    Alert.alert('Annuler', 'Voulez-vous vraiment annuler tout?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Oui', style: 'destructive', onPress: handleCancelDimensionFlow },
    ]);
  };

  const handleMobileLogout = async () => {
    handleCancelDimensionFlow();
    try {
      await logoutTerrain();
    } catch (error) {
      console.error('Erreur deconnexion terrain:', error);
    }
    setIsLoggedIn(false);
    setEntrepriseId(null);
    setSelectedChantier(null);
  };

  const handleSyncFromSupabase = useCallback(async () => {
    const result = await syncTerrainDataFromSupabase();
    if (result.forcedLogout) {
      handleForcedInactiveLogout(result.error);
      return result;
    }
    if (result.ok) {
      setEntrepriseId(result.entrepriseId);
    }
    return result;
  }, [handleForcedInactiveLogout]);

  const handleEditChantier = useCallback(async (chantier, lignes = []) => {
    const resolvedLignes =
      lignes.length > 0 ? lignes : (await getLignesByChantierLocal(chantier.id)) || [];
    const releveId =
      resolvedLignes[0]?.releve_id || (await getReleveIdByChantierLocal(chantier.id));
    const draft = startDraftFromChantierEdit({ chantier, lignes: resolvedLignes, releveId });
    setSelection(draft);
    setScreen('nouvelleDimension');
  }, []);

  const handleDeleteChantier = useCallback(async (chantier) => {
    if (!chantier?.id) return;
    try {
      await deleteChantierLocal(chantier.id);
      clearDraftDimensionFlow();
      setSelection(null);
      dimensionFlowNavRef.current = null;
      setDimensionNavUi({ saveDisabled: true, saving: false });
      setSelectedChantier(null);
      setScreen('chantiers');
    } catch (error) {
      console.error('Erreur suppression chantier:', error);
      Alert.alert('Erreur', 'Impossible de supprimer ce chantier.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.container}>
            <View style={styles.screenContainer}>
              {!authReady && (
                <View style={styles.webAuthLoading}>
                  <ActivityIndicator size="large" color={chantierColors.primary} />
                  <Text style={styles.webAuthLoadingText}>Verification de la session...</Text>
                </View>
              )}
              {authReady && !isLoggedIn && (
                <LoginScreen
                  variant={Platform.OS === 'web' ? 'master' : 'terrain'}
                  onLogin={handleLogin}
                />
              )}
              {authReady && isLoggedIn && Platform.OS === 'web' && (
                <AdminScreen
                  onLogout={() => {
                    logoutMasterAdmin();
                    setIsLoggedIn(false);
                    setEntrepriseId(null);
                    setScreen('chantiers');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'chantiers' && (
                <ListeChantiers
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  refreshToken={chantierListRefreshToken}
                  onCreatePress={handleCreatePress}
                  onChantierPress={(chantier) => {
                    setSelectedChantier(chantier);
                    setScreen('chantierDetails');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'nouvelleDimension' && (
                <NouvelleDimensionScreen
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  onCancel={confirmCancelDimensionFlow}
                  onBackToChantiers={confirmCancelDimensionFlow}
                  onFinish={handleDimensionFlowFinish}
                  onDeleteChantier={handleDeleteChantier}
                  onNavHandlersChange={handleDimensionNavHandlersChange}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'clientChantier' && (
                <ClientChantierFormScreen
                  entrepriseId={entrepriseId}
                  onBack={() => {
                    setDraftUiStep('recap');
                    setScreen('nouvelleDimension');
                  }}
                  onNext={handleClientChantierSave}
                  onNavHandlersChange={handleDimensionNavHandlersChange}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'plus' && (
                <PlusScreen
                  bottomOffset={bottomNavHeight}
                  onProfilPress={() => setScreen('profil')}
                  onLogout={handleMobileLogout}
                  onSyncFromSupabase={handleSyncFromSupabase}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'profil' && (
                <ProfilScreen
                  bottomOffset={bottomNavHeight}
                  onBack={() => setScreen('plus')}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'chantierDetails' && (
                <ChantierDetails
                  chantier={selectedChantier}
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  onModify={handleEditChantier}
                  onChantierUpdated={handleChantierUpdated}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'selecteurOuvrage' && (
                <SelecteurMetierOuvrage
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  onSelectionComplete={(data) => {
                    setSelection((prev) => ({ ...prev, ...data }));
                    setScreen('saisieDimensions');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'saisieDimensions' && (
                <PaveSaisieOneHand
                  bottomOffset={bottomNavHeight}
                  releveId={selection?.releveId || ''}
                  ouvrageUniteId={selection?.ouvrageUnite?.ouvrage_unite_id || ''}
                  prixUnitaireApplique={selection?.ouvrageUnite?.prix_unitaire || 0}
                  isDimension={Number(selection?.ouvrageUnite?.ind_dimension) === 1}
                  uniteFormule={selection?.ouvrageUnite?.formule || ''}
                  onSaved={() => setScreen('chantierDetails')}
                />
              )}
            </View>

            {isLoggedIn && Platform.OS !== 'web' && (
              <View style={styles.navBottom}>
                <Button
                  mode={isDimensionFlow || isChantiersNavActive ? 'contained' : 'outlined'}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name={isDimensionFlow ? 'content-save' : 'briefcase'}
                      size={size}
                      color={color}
                    />
                  )}
                  style={styles.navButton}
                  contentStyle={styles.navButtonContent}
                  loading={isDimensionFlow && dimensionNavUi.saving}
                  disabled={isDimensionFlow && dimensionNavUi.saveDisabled}
                  onPress={() => {
                    if (isDimensionFlow) {
                      dimensionFlowNavRef.current?.onSave?.();
                      return;
                    }
                    setScreen('chantiers');
                  }}
                >
                  {isDimensionFlow ? 'Enregistrer' : 'Chantiers'}
                </Button>
                <Button
                  mode={isDimensionFlow ? 'outlined' : isPlusNavActive ? 'contained' : 'outlined'}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name={isDimensionFlow ? 'close' : 'dots-horizontal'}
                      size={size}
                      color={color}
                    />
                  )}
                  style={styles.navButton}
                  contentStyle={styles.navButtonContent}
                  textColor={isDimensionFlow ? chantierColors.danger : undefined}
                  onPress={() => {
                    if (isDimensionFlow) {
                      confirmCancelDimensionFlow();
                      return;
                    }
                    setScreen('plus');
                  }}
                >
                  {isDimensionFlow ? 'Annuler' : 'Plus'}
                </Button>
              </View>
            )}
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
  screenContainer: {
    flex: 1,
    minHeight: 0,
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
  navBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    backgroundColor: chantierColors.background,
    borderTopWidth: 1,
    borderTopColor: chantierColors.border,
    padding: 8,
    marginHorizontal: 0,
    marginBottom: 0,
    minHeight: 88,
  },
  navButton: {
    flex: 1,
  },
  navButtonContent: {
    minHeight: 64,
  },
});
