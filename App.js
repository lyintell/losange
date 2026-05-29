import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Button, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AdminScreen from './src/screens/web/AdminScreen';
import ChantierDetails from './src/screens/ChantierDetails';
import ListeChantiers from './src/screens/ListeChantiers';
import LoginScreen from './src/screens/LoginScreen';
import PaveSaisieOneHand from './src/screens/PaveSaisieOneHand';
import SelecteurMetierOuvrage from './src/screens/SelecteurMetierOuvrage';
import { initLocalDatabase } from './src/db/localDb';
import { createClientChantierReleveFlowLocal, ensureCatalogueLocal, ensureEntrepriseLocale } from './src/db/querries';
import { appTheme, chantierColors } from './src/styles/theme';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [screen, setScreen] = useState('chantiers');
  const [selection, setSelection] = useState(null);
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [entrepriseId, setEntrepriseId] = useState(null);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const bottomNavHeight = 84;

  useEffect(() => {
    const bootstrap = async () => {
      if (Platform.OS === 'web') return;
      try {
        await initLocalDatabase();
        await ensureCatalogueLocal();
      } catch (error) {
        console.error('Erreur initialisation SQLite:', error);
      }
    };
    bootstrap();
  }, []);

  const handleLogin = async () => {
    setIsLoggedIn(true);
    if (Platform.OS !== 'web') {
      try {
        const id = await ensureEntrepriseLocale();
        setEntrepriseId(id);
      } catch (error) {
        console.error('Erreur resolution entreprise locale:', error);
        setEntrepriseId(null);
      }
    }
    setScreen(Platform.OS === 'web' ? 'admin' : 'chantiers');
  };

  const handleCreatePress = async () => {
    if (!entrepriseId) {
      Alert.alert('Erreur', 'Aucune entreprise locale. Synchronisez les donnees depuis Supabase.');
      return;
    }
    try {
      setIsCreatingFlow(true);
      const context = await createClientChantierReleveFlowLocal({ entrepriseId });
      setSelection(context);
      setScreen('selecteurOuvrage');
    } catch (error) {
      console.error('Erreur creation flux client/chantier/releve:', error);
      Alert.alert('Erreur', "Impossible de preparer le releve. Reessayez.");
    } finally {
      setIsCreatingFlow(false);
    }
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.container}>
            <View style={styles.screenContainer}>
              {!isLoggedIn && (
                <LoginScreen
                  onLogin={handleLogin}
                />
              )}
              {isLoggedIn && Platform.OS === 'web' && (
                <AdminScreen
                  onLogout={() => {
                    setIsLoggedIn(false);
                    setEntrepriseId(null);
                    setScreen('chantiers');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'chantiers' && (
                <ListeChantiers
                  bottomOffset={bottomNavHeight}
                  creating={isCreatingFlow}
                  onCreatePress={handleCreatePress}
                  onChantierPress={(chantier) => {
                    setSelectedChantier(chantier);
                    setScreen('chantierDetails');
                  }}
                />
              )}
              {isLoggedIn && Platform.OS !== 'web' && screen === 'chantierDetails' && (
                <ChantierDetails chantier={selectedChantier} bottomOffset={bottomNavHeight} />
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
                  isUnitaire={Number(selection?.ouvrageUnite?.ind_unitaire) === 1}
                  uniteFormule={selection?.ouvrageUnite?.formule || ''}
                  onSaved={() => setScreen('chantierDetails')}
                />
              )}
            </View>

            {isLoggedIn && Platform.OS !== 'web' && (
              <View style={styles.navBottom}>
                <Button
                  mode={screen === 'chantiers' || screen === 'chantierDetails' ? 'contained' : 'outlined'}
                  icon={({ size, color }) => <MaterialCommunityIcons name="briefcase" size={size} color={color} />}
                  style={styles.navButton}
                  contentStyle={styles.navButtonContent}
                  onPress={() => setScreen('chantiers')}
                >
                  Chantiers
                </Button>
                <Button
                  mode={screen === 'selecteurOuvrage' || screen === 'saisieDimensions' ? 'contained' : 'outlined'}
                  icon={({ size, color }) => <MaterialCommunityIcons name="plus-circle" size={size} color={color} />}
                  loading={isCreatingFlow}
                  style={styles.navButton}
                  contentStyle={styles.navButtonContent}
                  onPress={handleCreatePress}
                >
                  Plus
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
