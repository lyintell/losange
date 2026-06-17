import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LosangeLogoBackground } from '../components/terrain/LosangeLogoLoader';
import PlusMenuButton from '../components/terrain/PlusMenuButton';
import { FlowActionFab, FlowSmallFab, flowFabColors } from '../components/terrain/TerrainFlowFabs';
import { getLoggedInProfilViewLocal, isLoggedInAdminLocal } from '../db/querries';
import { canAccessRapports } from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';

const buildSyncSuccessMessage = (result) => {
  const pending = Number(result?.pendingAfter || 0);
  if (pending > 0) {
    return `${pending} modification${pending > 1 ? 's' : ''} en attente. Réessayez avec internet.`;
  }
  return 'Données à jour.';
};

export default function PlusScreen({ onProfilPress, onDatabasePress, onRapportsPress, onLogout, onSyncFromSupabase }) {
  const [syncing, setSyncing] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [canShowRapports, setCanShowRapports] = useState(false);
  const [canSync, setCanSync] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAccountType = async () => {
      try {
        const [profil, isAdmin] = await Promise.all([
          getLoggedInProfilViewLocal(),
          isLoggedInAdminLocal(),
        ]);
        if (!cancelled) {
          setIsPro(Boolean(profil?.is_pro));
          setCanShowRapports(canAccessRapports(profil));
          setCanSync(Boolean(profil?.is_pro) || isAdmin);
        }
      } catch (error) {
        console.error('Erreur chargement type de compte:', error);
        if (!cancelled) {
          setIsPro(false);
          setCanShowRapports(false);
          setCanSync(false);
        }
      }
    };

    loadAccountType();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSync = useCallback(async () => {
    if (!onSyncFromSupabase || syncing) return;

    setSyncing(true);
    try {
      const result = await onSyncFromSupabase();
      if (result?.forcedLogout) {
        return;
      }
      if (result?.ok) {
        Alert.alert('Synchronisation', buildSyncSuccessMessage(result));
      } else if (result?.error) {
        Alert.alert('Erreur', result.error);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Synchronisation impossible.');
    } finally {
      setSyncing(false);
    }
  }, [onSyncFromSupabase, syncing]);

  return (
    <View style={styles.container}>
      <LosangeLogoBackground opacity={0.1} />
      <View style={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Plus
        </Text>
      </View>

      <PlusMenuButton icon="account" onPress={onProfilPress}>
        Profil
      </PlusMenuButton>

      <PlusMenuButton icon="database" onPress={onDatabasePress}>
        Base de données
      </PlusMenuButton>

      {canShowRapports ? (
        <PlusMenuButton icon="chart-pie" onPress={onRapportsPress}>
          Rapports
        </PlusMenuButton>
      ) : null}

      <View style={styles.spacer} />

      {canSync ? (
        <FlowSmallFab
          icon="sync"
          side="left"
          tierFromBottom={0}
          color="#6B7280"
          disabled={syncing}
          onPress={runSync}
        />
      ) : null}

      <FlowActionFab
        icon="logout"
        color={flowFabColors.danger}
        smallCountBelow={0}
        onPress={onLogout}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    zIndex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 8,
  },
  spacer: {
    flex: 1,
  },
});
