import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNavButton from './src/components/terrain/BottomNavButton';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AdminScreen from './src/screens/web/AdminScreen';
import ChantierDetails from './src/screens/ChantierDetails';
import ListeChantiers from './src/screens/ListeChantiers';
import LoginScreen from './src/screens/LoginScreen';
import ClientChantierFormScreen from './src/screens/ClientChantierFormScreen';
import NouvelleDimensionScreen from './src/screens/NouvelleDimensionScreen';
import PaveSaisieOneHand from './src/screens/PaveSaisieOneHand';
import PlusScreen from './src/screens/PlusScreen';
import ProfilScreen from './src/screens/ProfilScreen';
import DatabaseScreen from './src/screens/DatabaseScreen';
import ListeClientsScreen from './src/screens/ListeClientsScreen';
import ListeMetiersScreen from './src/screens/ListeMetiersScreen';
import RapportsScreen from './src/screens/RapportsScreen';
import ClientDetailsScreen from './src/screens/ClientDetailsScreen';
import ListeOuvragesScreen from './src/screens/ListeOuvragesScreen';
import OuvrageDetailsScreen from './src/screens/OuvrageDetailsScreen';
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
import {
  canCurrentUserModifyChantierLocal,
  deleteChantierLocal,
  ensureCatalogueLocal,
  finalizeDimensionDraftLocal,
  getLignesByChantierLocal,
  getReleveIdByChantierLocal,
} from './src/db/querries';
import { ensureTerrainDeviceFromSession } from './src/db/terrainSync';
import LosangeLogoLoader from './src/components/terrain/LosangeLogoLoader';
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
  const [dimensionNavUi, setDimensionNavUi] = useState({
    saveDisabled: true,
    saving: false,
    primaryLabel: 'Enregistrer',
    primaryIcon: 'content-save',
  });
  const [profilEditing, setProfilEditing] = useState(false);
  const [profilIsAdmin, setProfilIsAdmin] = useState(false);
  const [profilSaveRequestId, setProfilSaveRequestId] = useState(0);
  const [canModifySelectedChantier, setCanModifySelectedChantier] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientsListRefreshToken, setClientsListRefreshToken] = useState(0);
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);
  const [ouvragesListRefreshToken, setOuvragesListRefreshToken] = useState(0);
  const [clientEditRequestId, setClientEditRequestId] = useState(0);
  const [ouvrageEditRequestId, setOuvrageEditRequestId] = useState(0);
  const bottomNavHeight = 84;

  const handleDimensionNavHandlersChange = useCallback((handlers) => {
    dimensionFlowNavRef.current = handlers;
    if (!handlers) {
      setDimensionNavUi({
        saveDisabled: true,
        saving: false,
        primaryLabel: 'Enregistrer',
        primaryIcon: 'content-save',
      });
      return;
    }
    setDimensionNavUi((prev) => {
      const next = {
        saveDisabled: handlers.saveDisabled,
        saving: handlers.saving,
        primaryLabel: handlers.primaryLabel ?? 'Enregistrer',
        primaryIcon: handlers.primaryIcon ?? 'content-save',
      };
      if (
        prev.saveDisabled === next.saveDisabled &&
        prev.saving === next.saving &&
        prev.primaryLabel === next.primaryLabel &&
        prev.primaryIcon === next.primaryIcon
      ) {
        return prev;
      }
      return next;
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
      setDimensionNavUi({
        saveDisabled: true,
        saving: false,
        primaryLabel: 'Enregistrer',
        primaryIcon: 'content-save',
      });
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

  const isPlusNavActive =
    screen === 'plus' ||
    screen === 'profil' ||
    screen === 'database' ||
    screen === 'listeClients' ||
    screen === 'listeMetiers' ||
    screen === 'rapports' ||
    screen === 'clientDetails' ||
    screen === 'listeOuvrages' ||
    screen === 'ouvrageDetails';
  const isPlusHomeScreen = screen === 'plus';
  const isPlusSubScreen = isPlusNavActive && !isPlusHomeScreen;
  const isChantierDetailsScreen = screen === 'chantierDetails';
  const isProfilScreen = screen === 'profil';
  const isDatabaseScreen = screen === 'database';
  const isListeClientsScreen = screen === 'listeClients';
  const isListeMetiersScreen = screen === 'listeMetiers';
  const isRapportsScreen = screen === 'rapports';
  const isClientDetailsScreen = screen === 'clientDetails';
  const isListeOuvragesScreen = screen === 'listeOuvrages';
  const isOuvrageDetailsScreen = screen === 'ouvrageDetails';
  const isPlusDetailScreen = isClientDetailsScreen || isOuvrageDetailsScreen;
  const leftNavIsRetour = isPlusSubScreen || isChantierDetailsScreen;

  useEffect(() => {
    if (!isProfilScreen) {
      setProfilEditing(false);
    }
  }, [isProfilScreen]);

  useEffect(() => {
    let cancelled = false;

    const loadChantierAccess = async () => {
      if (!selectedChantier?.id) {
        if (!cancelled) setCanModifySelectedChantier(false);
        return;
      }

      try {
        const allowed = await canCurrentUserModifyChantierLocal(selectedChantier.id);
        if (!cancelled) setCanModifySelectedChantier(allowed);
      } catch (error) {
        console.error('Erreur verification acces chantier:', error);
        if (!cancelled) setCanModifySelectedChantier(false);
      }
    };

    loadChantierAccess();
    return () => {
      cancelled = true;
    };
  }, [selectedChantier?.id, chantierListRefreshToken]);

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
        const { runTerrainSyncPushOnly } = await import('./src/db/terrainSyncPro');
        const result = await runTerrainSyncPushOnly();
        if (result.forcedLogout) {
          handleForcedInactiveLogout(result.error);
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
          "Un AUTRE COMPTE était connecté à cet appareil. Ses données seront effacées du téléphone.",
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
    Alert.alert('Annuler', 'Voulez-vous vraiment annuler tout ?', [
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
    if (!chantier?.id) return;

    try {
      if (!(await canCurrentUserModifyChantierLocal(chantier.id))) {
        Alert.alert(
          'Modification refusée',
          "Vous ne pouvez pas modifier un chantier que vous n'avez pas pris."
        );
        return;
      }

      const resolvedLignes =
        lignes.length > 0 ? lignes : (await getLignesByChantierLocal(chantier.id)) || [];
      const releveId =
        resolvedLignes[0]?.releve_id || (await getReleveIdByChantierLocal(chantier.id));
      const draft = startDraftFromChantierEdit({ chantier, lignes: resolvedLignes, releveId });
      setSelection(draft);
      setScreen('nouvelleDimension');
    } catch (error) {
      console.error('Erreur ouverture modification chantier:', error);
      Alert.alert('Erreur', error.message || "Impossible d'ouvrir la modification.");
    }
  }, []);

  const handleDeleteChantier = useCallback(async (chantier) => {
    if (!chantier?.id) return;
    try {
      await deleteChantierLocal(chantier.id);
      clearDraftDimensionFlow();
      setSelection(null);
      dimensionFlowNavRef.current = null;
      setDimensionNavUi({
        saveDisabled: true,
        saving: false,
        primaryLabel: 'Enregistrer',
        primaryIcon: 'content-save',
      });
      setSelectedChantier(null);
      setScreen('chantiers');
    } catch (error) {
      console.error('Erreur suppression chantier:', error);
      Alert.alert('Erreur', error.message || 'Impossible de supprimer ce chantier.');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <GestureHandlerRootView style={styles.gestureRoot}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.container}>
            <View style={styles.screenContainer}>
              {!authReady && (
                <View style={styles.webAuthLoading}>
                  <LosangeLogoLoader size="large" />
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
                  onDatabasePress={() => setScreen('database')}
                  onRapportsPress={() => setScreen('rapports')}
                  onLogout={handleMobileLogout}
                  onSyncFromSupabase={handleSyncFromSupabase}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'rapports' && (
                <RapportsScreen
                  entrepriseId={entrepriseId}
                  refreshToken={chantierListRefreshToken}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'database' && (
                <DatabaseScreen
                  onListeClientsPress={() => setScreen('listeClients')}
                  onListeMetiersPress={() => setScreen('listeMetiers')}
                  onListeOuvragesPress={() => setScreen('listeOuvrages')}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'listeClients' && (
                <ListeClientsScreen
                  entrepriseId={entrepriseId}
                  refreshToken={clientsListRefreshToken}
                  onClientPress={(client) => {
                    setSelectedClient(client);
                    setScreen('clientDetails');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'listeMetiers' && (
                <ListeMetiersScreen entrepriseId={entrepriseId} />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'clientDetails' && (
                <ClientDetailsScreen
                  clientId={selectedClient?.id}
                  editRequestId={clientEditRequestId}
                  onClientUpdated={(updatedClient) => {
                    setSelectedClient(updatedClient);
                    setClientsListRefreshToken((value) => value + 1);
                  }}
                  onClientDeleted={() => {
                    setSelectedClient(null);
                    setClientsListRefreshToken((value) => value + 1);
                    setScreen('listeClients');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'listeOuvrages' && (
                <ListeOuvragesScreen
                  entrepriseId={entrepriseId}
                  refreshToken={ouvragesListRefreshToken}
                  onOuvragePress={(ouvrage) => {
                    setSelectedOuvrage(ouvrage);
                    setScreen('ouvrageDetails');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'ouvrageDetails' && (
                <OuvrageDetailsScreen
                  ouvrageId={selectedOuvrage?.id}
                  editRequestId={ouvrageEditRequestId}
                  onOuvrageUpdated={(updatedOuvrage) => {
                    setSelectedOuvrage(updatedOuvrage);
                    setOuvragesListRefreshToken((value) => value + 1);
                  }}
                  onOuvrageDeleted={() => {
                    setSelectedOuvrage(null);
                    setOuvragesListRefreshToken((value) => value + 1);
                    setScreen('listeOuvrages');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'profil' && (
                <ProfilScreen
                  entrepriseId={entrepriseId}
                  editing={profilEditing}
                  saveRequestId={profilSaveRequestId}
                  onAdminStatusChange={setProfilIsAdmin}
                  onEditingChange={setProfilEditing}
                  onSaveComplete={() => setProfilSaveRequestId(0)}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'chantierDetails' && (
                <ChantierDetails
                  chantier={selectedChantier}
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
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
                <BottomNavButton
                  mode={
                    isDimensionFlow || leftNavIsRetour || isChantiersNavActive
                      ? 'contained'
                      : 'outlined'
                  }
                  buttonColor={
                    leftNavIsRetour && !isDimensionFlow ? '#9CA3AF' : undefined
                  }
                  textColor={
                    leftNavIsRetour && !isDimensionFlow ? '#FFFFFF' : undefined
                  }
                  icon={
                    isDimensionFlow
                      ? dimensionNavUi.primaryIcon
                      : leftNavIsRetour
                        ? 'arrow-left'
                        : 'briefcase'
                  }
                  loading={isDimensionFlow && dimensionNavUi.saving}
                  disabled={isDimensionFlow && dimensionNavUi.saveDisabled}
                  onPress={() => {
                    if (isDimensionFlow) {
                      dimensionFlowNavRef.current?.onSave?.();
                      return;
                    }
                    if (isOuvrageDetailsScreen) {
                      setScreen('listeOuvrages');
                      return;
                    }
                    if (isListeOuvragesScreen) {
                      setScreen('database');
                      return;
                    }
                    if (isClientDetailsScreen) {
                      setScreen('listeClients');
                      return;
                    }
                    if (isListeClientsScreen) {
                      setScreen('database');
                      return;
                    }
                    if (isListeMetiersScreen) {
                      setScreen('database');
                      return;
                    }
                    if (isRapportsScreen) {
                      setScreen('plus');
                      return;
                    }
                    if (isDatabaseScreen) {
                      setScreen('plus');
                      return;
                    }
                    if (isProfilScreen) {
                      setProfilEditing(false);
                      setScreen('plus');
                      return;
                    }
                    if (isChantierDetailsScreen) {
                      setScreen('chantiers');
                      return;
                    }
                    setScreen('chantiers');
                  }}
                >
                  {isDimensionFlow
                    ? dimensionNavUi.primaryLabel
                    : isPlusSubScreen
                      ? 'Retour'
                      : isChantierDetailsScreen
                        ? 'Retour aux chantiers'
                        : 'Chantiers'}
                </BottomNavButton>
                <BottomNavButton
                  mode={
                    isDimensionFlow
                      ? 'outlined'
                      : isPlusNavActive ||
                          isPlusDetailScreen ||
                          (isChantierDetailsScreen && canModifySelectedChantier) ||
                          (isProfilScreen && profilIsAdmin)
                        ? 'contained'
                        : 'outlined'
                  }
                  icon={
                    isDimensionFlow
                      ? 'close'
                      : isProfilScreen && profilIsAdmin
                        ? profilEditing
                          ? 'content-save'
                          : 'pencil'
                        : isPlusDetailScreen || (isChantierDetailsScreen && canModifySelectedChantier)
                          ? 'pencil'
                          : 'dots-horizontal'
                  }
                  textColor={isDimensionFlow ? chantierColors.danger : undefined}
                  onPress={() => {
                    if (isDimensionFlow) {
                      const cancelEdit = dimensionFlowNavRef.current?.onCancel;
                      if (cancelEdit) {
                        cancelEdit();
                        return;
                      }
                      confirmCancelDimensionFlow();
                      return;
                    }
                    if (isProfilScreen && profilIsAdmin) {
                      if (profilEditing) {
                        setProfilSaveRequestId((value) => value + 1);
                      } else {
                        setProfilEditing(true);
                      }
                      return;
                    }
                    if (isChantierDetailsScreen) {
                      if (selectedChantier && canModifySelectedChantier) {
                        handleEditChantier(selectedChantier);
                      }
                      return;
                    }
                    if (isClientDetailsScreen) {
                      setClientEditRequestId((value) => value + 1);
                      return;
                    }
                    if (isOuvrageDetailsScreen) {
                      setOuvrageEditRequestId((value) => value + 1);
                      return;
                    }
                    setScreen('plus');
                  }}
                >
                  {isDimensionFlow
                    ? 'Annuler'
                    : isProfilScreen && profilIsAdmin
                      ? profilEditing
                        ? 'Enregistrer'
                        : 'Modifier'
                      : isPlusDetailScreen
                        ? 'Modifier'
                        : isChantierDetailsScreen
                          ? canModifySelectedChantier
                            ? 'Modifier'
                            : 'Plus'
                          : 'Plus'}
                </BottomNavButton>
              </View>
            )}
            <StatusBar style="dark" />
          </View>
        </SafeAreaView>
        </GestureHandlerRootView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
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
    alignItems: 'stretch',
    gap: 8,
    backgroundColor: chantierColors.background,
    borderTopWidth: 1,
    borderTopColor: chantierColors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginHorizontal: 0,
    marginBottom: 0,
    minHeight: 96,
  },
});
