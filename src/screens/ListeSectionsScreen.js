import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import AjouterSectionModal from '../components/terrain/AjouterSectionModal';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import TerrainSyncOverlay from '../components/terrain/TerrainSyncOverlay';
import { FlowSmallFab, flowFabColors, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { useTerrainSyncRefresh } from '../hooks/useTerrainSyncRefresh';
import { getSectionsByEntrepriseLocal } from '../db/querries';
import { isDefaultSectionNom } from '../utils/defaultSection';
import { chantierColors } from '../styles/theme';

export default function ListeSectionsScreen({ entrepriseId, refreshToken = 0, onSyncFromSupabase }) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);

  const loadSections = useCallback(async () => {
    if (!entrepriseId) {
      setSections([]);
      return;
    }
    try {
      setLoadError('');
      const data = await getSectionsByEntrepriseLocal(entrepriseId);
      setSections(data || []);
    } catch (error) {
      console.error('Erreur chargement sections:', error);
      setSections([]);
      setLoadError(error.message || 'Impossible de charger les sections.');
    }
  }, [entrepriseId]);

  const { syncing, handleRefresh } = useTerrainSyncRefresh({
    onSyncFromSupabase,
    onReload: loadSections,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      await loadSections();
      if (!cancelled) {
        setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadSections, refreshToken]);

  const handleSectionCreated = async () => {
    await loadSections();
  };

  const renderItem = ({ item }) => {
    const isDefault = isDefaultSectionNom(item.nom);

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium" style={styles.sectionName}>
            {item.nom}
          </Text>
          {isDefault ? (
            <Text variant="bodySmall" style={styles.defaultBadge}>
              Section par défaut
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <TerrainSyncOverlay visible={syncing} />
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Sections
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Regroupez vos cotes par section lors de la prise de mesures. La section « Pas de section » est
          toujours disponible en premier.
        </Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={handleRefresh} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFabColumnPadding(1) + 24 },
          sections.length === 0 && styles.listContentEmpty,
        ]}
        renderItem={renderItem}
        ListEmptyComponent={
          initialLoading ? (
            <View style={styles.loadingState}>
              <LosangeLogoLoader size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>
                {loadError || 'Aucune section. Tirez pour actualiser ou ajoutez-en une.'}
              </Text>
            </View>
          )
        }
      />

      <FlowSmallFab
        icon="plus"
        tierFromBottom={0}
        color={flowFabColors.primary}
        onPress={() => setAddModalVisible(true)}
        disabled={!entrepriseId || syncing}
      />

      <AjouterSectionModal
        visible={addModalVisible}
        entrepriseId={entrepriseId}
        existingSections={sections}
        onDismiss={() => setAddModalVisible(false)}
        onCreated={handleSectionCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    marginBottom: 8,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 6,
  },
  subtitle: {
    color: chantierColors.muted,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardContent: {
    paddingVertical: 6,
  },
  sectionName: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  defaultBadge: {
    color: chantierColors.primary,
    marginTop: 4,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
  },
});
