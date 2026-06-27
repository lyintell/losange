import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Checkbox, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import AjouterMetierModal from '../components/terrain/AjouterMetierModal';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import TerrainSyncOverlay from '../components/terrain/TerrainSyncOverlay';
import { FlowSmallFab, flowFabColors } from '../components/terrain/TerrainFlowFabs';
import { useTerrainSyncRefresh } from '../hooks/useTerrainSyncRefresh';
import {
  getLoggedInProfilViewLocal,
  getMetiersForEntrepriseLocal,
  saveMetiersOrderLocal,
  setMetierActifLocal,
} from '../db/querries';
import { FREE_TIER_LIMITS } from '../utils/freeTierLimits';
import { getMetierColor } from '../utils/metierColors';
import { chantierColors } from '../styles/theme';

const MetiersList = ({ metiers, refreshing, savingOrder, onRefresh, onDragEnd, renderItem, ListEmptyComponent }) => {
  return (
    <DraggableFlatList
      style={styles.list}
      containerStyle={styles.listContainer}
      data={metiers}
      keyExtractor={(item) => item.id}
      onDragEnd={onDragEnd}
      activationDistance={12}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={[styles.listContent, metiers.length === 0 && styles.listContentEmpty]}
      showsVerticalScrollIndicator
      renderItem={renderItem}
      ListEmptyComponent={ListEmptyComponent}
    />
  );
};

export default function ListeMetiersScreen({ entrepriseId, refreshToken = 0, onSyncFromSupabase }) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [metiers, setMetiers] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [isPro, setIsPro] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadMetiers = useCallback(async () => {
    try {
      setLoadError('');
      const data = await getMetiersForEntrepriseLocal(entrepriseId);
      setMetiers(data || []);
      if (!data?.length) {
        setLoadError('Catalogue vide. Vérifiez votre connexion puis tirez pour actualiser.');
      }
    } catch (error) {
      console.error('Erreur chargement métiers:', error);
      setMetiers([]);
      setLoadError(error.message || 'Impossible de charger les métiers.');
    }
  }, [entrepriseId]);

  const { syncing, handleRefresh } = useTerrainSyncRefresh({
    onSyncFromSupabase,
    onReload: loadMetiers,
  });

  useEffect(() => {
    let cancelled = false;

    const loadAccountType = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setIsPro(Boolean(profil?.is_pro));
        }
      } catch (error) {
        if (!cancelled) setIsPro(true);
      }
    };

    loadAccountType();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      await loadMetiers();
      if (!cancelled) {
        setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadMetiers, refreshToken]);

  const handleDragEnd = async ({ data }) => {
    setMetiers(data);
    if (!entrepriseId) return;
    try {
      setSavingOrder(true);
      await saveMetiersOrderLocal(entrepriseId, data.map((item) => item.id));
    } catch (error) {
      console.error('Erreur sauvegarde ordre métiers:', error);
      loadMetiers();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleToggleActif = async (item) => {
    if (!entrepriseId || togglingId) return;

    const nextActif = Number(item.ind_actif) === 1 ? 0 : 1;
    try {
      setTogglingId(item.id);
      await setMetierActifLocal(entrepriseId, item.id, nextActif);
      setMetiers((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ind_actif: nextActif } : row))
      );
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier ce métier.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleMetierCreated = async () => {
    await loadMetiers();
  };

  const renderItem = ({ item, drag, isActive }) => {
    const isActif = Number(item.ind_actif) !== 0;

    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={180}
          disabled={isActive || savingOrder || Boolean(togglingId)}
          style={[styles.cardWrap, isActive && styles.cardWrapActive, !isActif && styles.cardWrapInactive]}
        >
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <MaterialCommunityIcons
                name="drag-vertical"
                size={24}
                color={chantierColors.muted}
                style={styles.dragIcon}
              />
              <View style={styles.cardTextWrap}>
                <Text variant="titleMedium" style={[styles.metierName, { color: getMetierColor(item.id) }]}>
                  {item.nom}
                </Text>
                {item.ind_custom ? (
                  <Text variant="bodySmall" style={styles.customBadge}>
                    Métier personnalisé
                  </Text>
                ) : item.abbrev ? (
                  <Text variant="bodyMedium" style={styles.metierAbbrev}>
                    {item.abbrev}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleToggleActif(item)}
                disabled={savingOrder || togglingId === item.id}
                hitSlop={8}
                style={styles.checkboxWrap}
              >
                <Checkbox
                  status={isActif ? 'checked' : 'unchecked'}
                  onPress={() => handleToggleActif(item)}
                  disabled={savingOrder || togglingId === item.id}
                />
              </Pressable>
            </Card.Content>
          </Card>
        </Pressable>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      <TerrainSyncOverlay visible={syncing} />
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Métiers
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Maintenez une carte pour la déplacer. Cochez un métier pour l&apos;utiliser à la prise de cotes.
          {!isPro
            ? ` Compte gratuit : métiers du catalogue uniquement, ${FREE_TIER_LIMITS.maxMetiersSelection} actifs maximum.`
            : ''}
        </Text>
      </View>

      <View style={styles.listWrap}>
        <MetiersList
          metiers={metiers}
          refreshing={syncing}
          savingOrder={savingOrder}
          onRefresh={handleRefresh}
          onDragEnd={handleDragEnd}
          renderItem={renderItem}
          ListEmptyComponent={
            initialLoading ? (
              <View style={styles.loadingState}>
                <LosangeLogoLoader size="large" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text variant="titleMedium" style={styles.emptyText}>
                  {loadError || 'Aucun métier disponible. Synchronisez le catalogue depuis Supabase.'}
                </Text>
              </View>
            )
          }
        />
      </View>

      {isPro ? (
        <FlowSmallFab
          icon="plus"
          tierFromBottom={0}
          color={flowFabColors.primary}
          onPress={() => setAddModalVisible(true)}
          disabled={!entrepriseId || savingOrder || Boolean(togglingId)}
        />
      ) : null}

      {isPro ? (
        <AjouterMetierModal
          visible={addModalVisible}
          entrepriseId={entrepriseId}
          onDismiss={() => setAddModalVisible(false)}
          onCreated={handleMetierCreated}
        />
      ) : null}
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
  listWrap: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 88,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  cardWrap: {
    marginBottom: 10,
  },
  cardWrapActive: {
    opacity: 0.92,
    transform: [{ scale: 1.02 }],
  },
  cardWrapInactive: {
    opacity: 0.72,
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  dragIcon: {
    marginRight: 4,
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metierName: {
    fontWeight: '800',
  },
  metierAbbrev: {
    color: chantierColors.muted,
    marginTop: 2,
  },
  customBadge: {
    color: chantierColors.primary,
    marginTop: 2,
    fontWeight: '700',
  },
  checkboxWrap: {
    marginRight: -4,
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
