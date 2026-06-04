import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  FAB_SIZES,
  FlowActionFab,
  FlowSmallFab,
  flowFabColors,
} from '../components/terrain/TerrainFlowFabs';
import { chantierColors } from '../styles/theme';

const buildSyncSuccessMessage = (result) => {
  const lines = [];

  if (result?.mode === 'pull') {
    lines.push('Donnees Supabase telechargees vers le telephone.');
  } else {
    const pushed = result?.pushedCounts || {};
    lines.push(
      `Envoi: ${pushed.clients ?? 0} client(s), ${pushed.chantiers ?? 0} chantier(s), ${pushed.releves ?? 0} releve(s), ${pushed.ligne_releves ?? 0} ligne(s).`
    );
    lines.push('Puis mise a jour depuis Supabase si le cloud est plus recent.');
  }

  if (result?.pendingAfter > 0) {
    lines.push(`\n${result.pendingAfter} modification(s) encore en attente.`);
  } else if (result?.mode !== 'pull') {
    lines.push('\nToutes les modifications sont synchronisees.');
  }

  const catalogue = result?.catalogue;
  if (catalogue) {
    lines.push(
      `\nCatalogue: ${catalogue.metiersCount ?? 0} metier(s), ${catalogue.unitesCount ?? 0} unite(s), ${catalogue.ouvragesCount ?? 0} ouvrage(s).`
    );
  }

  return lines.join('');
};

export default function PlusScreen({ onProfilPress, onLogout, onSyncFromSupabase }) {
  const [syncing, setSyncing] = useState(false);

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
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Plus
        </Text>
      </View>

      <Button
        mode="contained"
        icon="account"
        onPress={onProfilPress}
        style={styles.profilButton}
        contentStyle={styles.profilButtonContent}
        buttonColor={chantierColors.primary}
      >
        Profil
      </Button>

      <View style={styles.spacer} />

      <FlowSmallFab
        icon="sync"
        side="left"
        tierFromBottom={0}
        color="#6B7280"
        disabled={syncing}
        onPress={runSync}
      />

      <FlowActionFab
        icon="logout"
        color={flowFabColors.danger}
        smallCountBelow={0}
        onPress={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
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
  profilButton: {
    borderRadius: 12,
  },
  profilButtonContent: {
    minHeight: FAB_SIZES.main,
  },
  spacer: {
    flex: 1,
  },
});
