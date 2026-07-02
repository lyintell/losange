import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomNavButton from './src/components/terrain/BottomNavButton';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MasterScreen from './src/screens/web/MasterScreen';
import ChantierDetails from './src/screens/ChantierDetails';
import ChantierRelevesListScreen from './src/screens/ChantierRelevesListScreen';
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
import ListeSectionsScreen from './src/screens/ListeSectionsScreen';
import RapportsScreen from './src/screens/RapportsScreen';
import ClientDetailsScreen from './src/screens/ClientDetailsScreen';
import ListeOuvragesScreen from './src/screens/ListeOuvragesScreen';
import OuvrageDetailsScreen from './src/screens/OuvrageDetailsScreen';
import SelecteurMetierOuvrage from './src/screens/SelecteurMetierOuvrage';
import PreselectionMetiersModal from './src/components/terrain/PreselectionMetiersModal';
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
  getLignesByReleveIdLocal,
  getSectionOrderByReleveIdLocal,
  getLoggedInProfilViewLocal,
  getReleveByIdLocal,
  getRelevesByChantierLocal,
  getReleveIdByChantierLocal,
  isLoggedInAdminLocal,
  getMetierPreselectionRequiredLocal,
} from './src/db/querries';
import { ensureTerrainDeviceFromSession } from './src/db/terrainSync';
import LosangeLogoLoader from './src/components/terrain/LosangeLogoLoader';
import {
  canAccessDatabaseOuvrages,
  canCreateReleveOrLigne,
  canManageDatabaseOuvrages,
} from './src/utils/terrainAccess';
import { appTheme, chantierColors } from './src/styles/theme';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('chantiers');
  const [selection, setSelection] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [selectedReleveId, setSelectedReleveId] = useState(null);
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
  const [isLoggedInAdmin, setIsLoggedInAdmin] = useState(false);
  const [canManageOuvrages, setCanManageOuvrages] = useState(false);
  const [canAccessOuvragesDb, setCanAccessOuvragesDb] = useState(false);
  const [profilSaveRequestId, setProfilSaveRequestId] = useState(0);
  const [canModifySelectedChantier, setCanModifySelectedChantier] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientsListRefreshToken, setClientsListRefreshToken] = useState(0);
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);
  const [ouvragesListRefreshToken, setOuvragesListRefreshToken] = useState(0);
  const [clientEditRequestId, setClientEditRequestId] = useState(0);
  const [ouvrageEditRequestId, setOuvrageEditRequestId] = useState(0);
  const [metierPreselectionVisible, setMetierPreselectionVisible] = useState(false);
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
      const isEditMode = Boolean(draft?.editMode);
      await finalizeDimensionDraftLocal({
        entrepriseId,
        ...payload,
        clientId: payload.clientId ?? draft?.clientId ?? null,
        chantierId: payload.chantierId ?? draft?.chantierId ?? null,
        releveId: isEditMode ? payload.releveId ?? draft?.releveId ?? null : payload.releveId ?? null,
        lignes: draft?.lignes || [],
        sectionOrder: draft?.sectionOrder || [],
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
    screen === 'chantierReleves' ||
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
    screen === 'listeSections' ||
    screen === 'rapports' ||
    screen === 'clientDetails' ||
    screen === 'listeOuvrages' ||
    screen === 'ouvrageDetails';
  const isPlusHomeScreen = screen === 'plus';
  const isPlusSubScreen = isPlusNavActive && !isPlusHomeScreen;
  const isChantierDetailsScreen = screen === 'chantierDetails';
  const isChantierRelevesScreen = screen === 'chantierReleves';
  const isProfilScreen = screen === 'profil';
  const isDatabaseScreen = screen === 'database';
  const isListeClientsScreen = screen === 'listeClients';
  const isListeMetiersScreen = screen === 'listeMetiers';
  const isListeSectionsScreen = screen === 'listeSections';
  const isRapportsScreen = screen === 'rapports';
  const isClientDetailsScreen = screen === 'clientDetails';
  const isListeOuvragesScreen = screen === 'listeOuvrages';
  const isOuvrageDetailsScreen = screen === 'ouvrageDetails';
  const canModifyPlusDetail =
    (isClientDetailsScreen && isLoggedInAdmin) ||
    (isOuvrageDetailsScreen && (isLoggedInAdmin || canManageOuvrages));
  const leftNavIsRetour = isPlusSubScreen || isChantierRelevesScreen || isChantierDetailsScreen;

  useEffect(() => {
    if (!isProfilScreen) {
      setProfilEditing(false);
    }
  }, [isProfilScreen]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoggedInAdmin(false);
      return undefined;
    }

    let cancelled = false;

    const loadAdminAccess = async () => {
      try {
        const [isAdmin, profil] = await Promise.all([
          isLoggedInAdminLocal(),
          getLoggedInProfilViewLocal(),
        ]);
        if (!cancelled) {
          setIsLoggedInAdmin(isAdmin);
          setCanManageOuvrages(canManageDatabaseOuvrages(profil));
          setCanAccessOuvragesDb(canAccessDatabaseOuvrages(profil));
        }
      } catch (error) {
        console.error('Erreur verification role admin:', error);
        if (!cancelled) {
          setIsLoggedInAdmin(false);
          setCanManageOuvrages(false);
          setCanAccessOuvragesDb(false);
        }
      }
    };

    loadAdminAccess();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, screen]);

  useEffect(() => {
    if (!isLoggedIn) return;

    const isDatabaseSubtreeScreen =
      screen === 'database' ||
      screen === 'listeClients' ||
      screen === 'listeMetiers' ||
      screen === 'listeSections' ||
      screen === 'listeOuvrages' ||
      screen === 'ouvrageDetails' ||
      screen === 'clientDetails';

    if (!isLoggedInAdmin && isDatabaseSubtreeScreen) {
      if (screen === 'clientDetails') {
        setSelectedClient(null);
      }
      if (screen === 'ouvrageDetails') {
        setSelectedOuvrage(null);
      }
      setScreen('plus');
    }
  }, [isLoggedIn, isLoggedInAdmin, screen]);

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
          const catalogue = await ensureCatalogueLocal(session.entrepriseId);
          if (!catalogue.ok) {
            try {
              const { refreshCatalogueFromCloudLocal } = await import('./src/db/terrainSyncPro');
              await refreshCatalogueFromCloudLocal();
            } catch (catalogueError) {
              console.warn('Catalogue non recharge au demarrage:', catalogueError);
            }
          }
          setIsLoggedIn(true);
          setEntrepriseId(session.entrepriseId);
          const needsPreselection = await getMetierPreselectionRequiredLocal();
          if (needsPreselection) {
            setMetierPreselectionVisible(true);
          } else {
            setScreen('chantiers');
          }
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
      if (authResult.needsMetierPreselection) {
        setMetierPreselectionVisible(true);
        return { ok: true };
      }
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

  const handleCreatePress = async () => {
    const profil = await getLoggedInProfilViewLocal();
    if (!canCreateReleveOrLigne(profil)) {
      Alert.alert('Accès refusé', 'Votre compte ne peut pas créer de nouveau relevé.');
      return;
    }
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
    setMetierPreselectionVisible(false);
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

  const handleEditChantier = useCallback(async (chantier) => {
    if (!chantier?.id) return;

    try {
      if (!(await canCurrentUserModifyChantierLocal(chantier.id))) {
        Alert.alert(
          'Modification refusée',
          "Vous ne pouvez pas modifier un chantier que vous n'avez pas pris."
        );
        return;
      }

      let releveId = selectedReleveId;
      let targetReleve = releveId ? await getReleveByIdLocal(releveId) : null;

      if (!releveId) {
        const releves = await getRelevesByChantierLocal(chantier.id);
        targetReleve = releves.length ? releves[0] : null;
        releveId = targetReleve?.id || (await getReleveIdByChantierLocal(chantier.id));
      }

      const resolvedLignes = releveId ? (await getLignesByReleveIdLocal(releveId)) || [] : [];
      const sectionOrder = releveId ? await getSectionOrderByReleveIdLocal(releveId) : [];
      const draft = startDraftFromChantierEdit({
        chantier,
        lignes: resolvedLignes,
        releveId,
        releveRemise: targetReleve?.remise ?? 0,
        releveIndTva: targetReleve?.ind_tva ?? 0,
        sectionOrder,
      });
      setSelection(draft);
      setScreen('nouvelleDimension');
    } catch (error) {
      console.error('Erreur ouverture modification chantier:', error);
      Alert.alert('Erreur', error.message || "Impossible d'ouvrir la modification.");
    }
  }, [selectedReleveId]);

  const openChantierFromList = useCallback(async (chantier) => {
    if (!chantier?.id) return;

    setSelectedChantier(chantier);
    const releves = await getRelevesByChantierLocal(chantier.id);

    if (releves.length > 1) {
      setSelectedReleveId(null);
      setScreen('chantierReleves');
      return;
    }

    setSelectedReleveId(releves[0]?.id || null);
    setScreen('chantierDetails');
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

  const showMobileMain = isLoggedIn && Platform.OS !== 'web' && !metierPreselectionVisible;

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
                <MasterScreen
                  onLogout={() => {
                    logoutMasterAdmin();
                    setIsLoggedIn(false);
                    setEntrepriseId(null);
                    setScreen('chantiers');
                  }}
                />
              )}
              {authReady && isLoggedIn && metierPreselectionVisible && Platform.OS !== 'web' && (
                <View style={styles.webAuthLoading}>
                  <LosangeLogoLoader size="large" />
                  <Text style={styles.webAuthLoadingText}>Choisissez vos métiers pour continuer</Text>
                </View>
              )}
              {showMobileMain && screen === 'chantiers' && (
                <ListeChantiers
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  refreshToken={chantierListRefreshToken}
                  onSyncFromSupabase={handleSyncFromSupabase}
                  onCreatePress={handleCreatePress}
                  onChantierPress={openChantierFromList}
                  onDeleteChantier={handleDeleteChantier}
                />
              )}
              {showMobileMain && screen === 'chantierReleves' && (
                <ChantierRelevesListScreen
                  chantier={selectedChantier}
                  onRelevePress={(releve) => {
                    setSelectedReleveId(releve.id);
                    setScreen('chantierDetails');
                  }}
                  onRelevesChanged={(count) => {
                    setSelectedChantier((prev) =>
                      prev ? { ...prev, releve_count: count } : prev
                    );
                    setChantierListRefreshToken((value) => value + 1);
                    if (count <= 1) {
                      setSelectedReleveId(null);
                      setScreen('chantiers');
                    }
                  }}
                />
              )}
              {showMobileMain && screen === 'nouvelleDimension' && (
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
              {showMobileMain && screen === 'clientChantier' && (
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
              {showMobileMain && screen === 'plus' && (
                <PlusScreen
                  bottomOffset={bottomNavHeight}
                  onProfilPress={() => setScreen('profil')}
                  onDatabasePress={() => setScreen('database')}
                  onRapportsPress={() => setScreen('rapports')}
                  onLogout={handleMobileLogout}
                  onSyncFromSupabase={handleSyncFromSupabase}
                />
              )}
              {showMobileMain && screen === 'rapports' && (
                <RapportsScreen
                  entrepriseId={entrepriseId}
                  refreshToken={chantierListRefreshToken}
                />
              )}
              {showMobileMain && screen === 'database' && (
                <DatabaseScreen
                  onListeClientsPress={() => setScreen('listeClients')}
                  onListeMetiersPress={() => setScreen('listeMetiers')}
                  onListeSectionsPress={() => setScreen('listeSections')}
                  onListeOuvragesPress={() => setScreen('listeOuvrages')}
                />
              )}
              {showMobileMain && screen === 'listeClients' && (
                <ListeClientsScreen
                  entrepriseId={entrepriseId}
                  refreshToken={clientsListRefreshToken}
                  onSyncFromSupabase={handleSyncFromSupabase}
                  onClientPress={(client) => {
                    setSelectedClient(client);
                    setScreen('clientDetails');
                  }}
                />
              )}
              {showMobileMain && screen === 'listeMetiers' && (
                <ListeMetiersScreen
                  entrepriseId={entrepriseId}
                  onSyncFromSupabase={handleSyncFromSupabase}
                />
              )}
              {showMobileMain && screen === 'listeSections' && (
                <ListeSectionsScreen
                  entrepriseId={entrepriseId}
                  onSyncFromSupabase={handleSyncFromSupabase}
                />
              )}
              {showMobileMain && screen === 'clientDetails' && (
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
              {showMobileMain && screen === 'listeOuvrages' && (
                <ListeOuvragesScreen
                  entrepriseId={entrepriseId}
                  refreshToken={ouvragesListRefreshToken}
                  onSyncFromSupabase={handleSyncFromSupabase}
                  onOuvragePress={(ouvrage) => {
                    setSelectedOuvrage(ouvrage);
                    setScreen('ouvrageDetails');
                  }}
                />
              )}
              {showMobileMain && screen === 'ouvrageDetails' && (
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
              {showMobileMain && screen === 'profil' && (
                <ProfilScreen
                  entrepriseId={entrepriseId}
                  editing={profilEditing}
                  saveRequestId={profilSaveRequestId}
                  bottomOffset={bottomNavHeight}
                  onAdminStatusChange={setProfilIsAdmin}
                  onEditingChange={setProfilEditing}
                  onSaveComplete={() => setProfilSaveRequestId(0)}
                />
              )}
              {showMobileMain && screen === 'chantierDetails' && (
                <ChantierDetails
                  chantier={selectedChantier}
                  releveId={selectedReleveId}
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  onChantierUpdated={handleChantierUpdated}
                />
              )}
              {showMobileMain && screen === 'selecteurOuvrage' && (
                <SelecteurMetierOuvrage
                  entrepriseId={entrepriseId}
                  bottomOffset={bottomNavHeight}
                  onSelectionComplete={(data) => {
                    setSelection((prev) => ({ ...prev, ...data }));
                    setScreen('saisieDimensions');
                  }}
                />
              )}
              {showMobileMain && screen === 'saisieDimensions' && (
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

            {showMobileMain && (
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
                    if (isListeMetiersScreen || isListeSectionsScreen) {
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
                      if ((Number(selectedChantier?.releve_count) || 0) > 1) {
                        setSelectedReleveId(null);
                        setScreen('chantierReleves');
                        return;
                      }
                      setSelectedReleveId(null);
                      setScreen('chantiers');
                      return;
                    }
                    if (isChantierRelevesScreen) {
                      setSelectedReleveId(null);
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
                        ? (Number(selectedChantier?.releve_count) || 0) > 1
                          ? 'Retour aux relevés'
                          : 'Retour aux chantiers'
                        : isChantierRelevesScreen
                          ? 'Retour aux chantiers'
                        : 'Chantiers'}
                </BottomNavButton>
                <BottomNavButton
                  mode={
                    isDimensionFlow
                      ? 'outlined'
                      : isPlusNavActive ||
                          canModifyPlusDetail ||
                          (isChantierDetailsScreen && canModifySelectedChantier) ||
                          isProfilScreen
                        ? 'contained'
                        : 'outlined'
                  }
                  icon={
                    isDimensionFlow
                      ? 'close'
                      : isProfilScreen
                        ? profilEditing
                          ? 'content-save'
                          : 'pencil'
                        : canModifyPlusDetail || (isChantierDetailsScreen && canModifySelectedChantier)
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
                    if (isProfilScreen) {
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
                      if (isLoggedInAdmin) {
                        setClientEditRequestId((value) => value + 1);
                      }
                      return;
                    }
                    if (isOuvrageDetailsScreen) {
                      if (isLoggedInAdmin || canManageOuvrages) {
                        setOuvrageEditRequestId((value) => value + 1);
                      }
                      return;
                    }
                    setScreen('plus');
                  }}
                >
                  {isDimensionFlow
                    ? 'Annuler'
                    : isProfilScreen
                      ? profilEditing
                        ? 'Enregistrer'
                        : 'Modifier'
                      : canModifyPlusDetail
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
        {Platform.OS !== 'web' ? (
          <PreselectionMetiersModal
            visible={metierPreselectionVisible}
            entrepriseId={entrepriseId}
            onCompleted={() => {
              setMetierPreselectionVisible(false);
              setScreen('chantiers');
            }}
          />
        ) : null}
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
