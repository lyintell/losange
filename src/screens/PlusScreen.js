import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LosangeLogoBackground } from '../components/terrain/LosangeLogoLoader';
import TerrainSyncOverlay from '../components/terrain/TerrainSyncOverlay';
import PlusMenuButton from '../components/terrain/PlusMenuButton';
import { FlowActionFab, FlowSmallFab, flowFabColors } from '../components/terrain/TerrainFlowFabs';
import { useTerrainSyncRefresh } from '../hooks/useTerrainSyncRefresh';
import { getLoggedInProfilViewLocal } from '../db/querries';
import { canAccessRapports } from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';

export default function PlusScreen({ onProfilPress, onDatabasePress, onRapportsPress, onLogout, onSyncFromSupabase }) {
  const [isPro, setIsPro] = useState(false);
  const [canShowRapports, setCanShowRapports] = useState(false);
  const { syncing, canSync, runSync } = useTerrainSyncRefresh({ onSyncFromSupabase });

  useEffect(() => {
    let cancelled = false;

    const loadAccountType = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setIsPro(Boolean(profil?.is_pro));
          setCanShowRapports(canAccessRapports(profil));
        }
      } catch (error) {
        console.error('Erreur chargement type de compte:', error);
        if (!cancelled) {
          setIsPro(false);
          setCanShowRapports(false);
        }
      }
    };

    loadAccountType();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSyncPress = useCallback(() => {
    runSync({ showAlert: true });
  }, [runSync]);

  return (
    <View style={styles.container}>
      <TerrainSyncOverlay visible={syncing} />
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
          onPress={handleSyncPress}
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
