import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Checkbox, Chip, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import TerrainSyncOverlay from '../components/terrain/TerrainSyncOverlay';
import { FlowSmallFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { useTerrainSyncRefresh } from '../hooks/useTerrainSyncRefresh';
import {
  getMetiersForEntrepriseLocal,
  getOuvragesByEntrepriseLocal,
  saveOuvragesOrderLocal,
  setOuvrageActifLocal,
} from '../db/querries';
import { formatArticleNomAvecFournisseur } from '../utils/formatLigneMesures';
import { getMetierColor } from '../utils/metierColors';
import { chantierColors } from '../styles/theme';

export default function ListeOuvragesScreen({
  entrepriseId,
  refreshToken = 0,
  onOuvragePress,
  onSyncFromSupabase,
}) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [metiers, setMetiers] = useState([]);
  const [ouvrages, setOuvrages] = useState([]);
  const [selectedMetierId, setSelectedMetierId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const loadData = useCallback(async () => {
    if (!entrepriseId) {
      setMetiers([]);
      setOuvrages([]);
      return;
    }
    try {
      const [metiersData, ouvragesData] = await Promise.all([
        getMetiersForEntrepriseLocal(entrepriseId),
        getOuvragesByEntrepriseLocal(entrepriseId),
      ]);
      setMetiers(metiersData || []);
      setOuvrages(ouvragesData || []);
      setSelectedMetierId((prev) => {
        if (prev && (metiersData || []).some((m) => m.id === prev)) return prev;
        return metiersData?.[0]?.id || null;
      });
    } catch (error) {
      console.error('Erreur chargement ouvrages:', error);
      setMetiers([]);
      setOuvrages([]);
    }
  }, [entrepriseId]);

  const { syncing, handleRefresh } = useTerrainSyncRefresh({
    onSyncFromSupabase,
    onReload: loadData,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      await loadData();
      if (!cancelled) {
        setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadData, refreshToken]);

  const ouvragesForMetier = useMemo(() => {
    if (!selectedMetierId) return [];
    return ouvrages.filter((item) => item.metier_id === selectedMetierId);
  }, [ouvrages, selectedMetierId]);

  const filteredOuvrages = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const source = searchQuery.trim() ? ouvrages : ouvragesForMetier;
    if (!term) return source;
    return source.filter((ouvrage) => {
      const isArticle = Number(ouvrage.ind_article) === 1;
      const haystack = [
        ouvrage.nom,
        ouvrage.metier_nom,
        isArticle ? ouvrage.fournisseur_nom : null,
        isArticle ? 'article' : 'ouvrage',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [ouvrages, ouvragesForMetier, searchQuery]);

  const getDisplayName = (item) => {
    if (Number(item.ind_article) === 1) {
      return formatArticleNomAvecFournisseur(item.nom, item.fournisseur_nom);
    }
    return item.nom;
  };

  const handleToggleActif = async (item) => {
    if (togglingId) return;

    const nextActif = Number(item.ind_actif) === 1 ? 0 : 1;
    try {
      setTogglingId(item.id);
      await setOuvrageActifLocal(item.id, nextActif);
      setOuvrages((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, ind_actif: nextActif } : row))
      );
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Impossible de modifier cet élément.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDragEnd = async ({ data }) => {
    if (!entrepriseId || !selectedMetierId || searchQuery.trim()) return;

    setOuvrages((prev) => {
      const other = prev.filter((item) => item.metier_id !== selectedMetierId);
      return [...other, ...data];
    });

    try {
      setSavingOrder(true);
      await saveOuvragesOrderLocal(
        entrepriseId,
        selectedMetierId,
        data.map((item) => item.id)
      );
    } catch (error) {
      console.error('Erreur sauvegarde ordre ouvrages:', error);
      loadData();
    } finally {
      setSavingOrder(false);
    }
  };

  const renderItem = ({ item, drag, isActive }) => {
    const isArticle = Number(item.ind_article) === 1;
    const isActif = Number(item.ind_actif) !== 0;
    const isSearching = Boolean(searchQuery.trim());
    const dragEnabled = !isSearching && !savingOrder && !togglingId;

    const card = (
      <View style={[styles.rowInner, !isActif && styles.rowInactive, isActive && styles.rowActive]}>
        {dragEnabled ? (
          <MaterialCommunityIcons
            name="drag-vertical"
            size={22}
            color={chantierColors.muted}
            style={styles.dragIcon}
          />
        ) : null}
        <Pressable style={styles.cardPressable} onPress={() => onOuvragePress?.(item)}>
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.ouvrageName}>
                  {getDisplayName(item)}
                </Text>
                <View style={[styles.typeBadge, isArticle && styles.typeBadgeArticle]}>
                  <Text style={styles.typeBadgeText}>{isArticle ? 'Article' : 'Ouvrage'}</Text>
                </View>
              </View>
              {isSearching ? (
                <Text
                  variant="bodyMedium"
                  style={[styles.metierName, { color: getMetierColor(item.metier_id) }]}
                >
                  {item.metier_nom || '—'}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        </Pressable>
        <Pressable
          onPress={() => handleToggleActif(item)}
          disabled={togglingId === item.id || savingOrder}
          hitSlop={8}
          style={styles.checkboxWrap}
        >
          <Checkbox
            status={isActif ? 'checked' : 'unchecked'}
            onPress={() => handleToggleActif(item)}
            disabled={togglingId === item.id || savingOrder}
          />
        </Pressable>
      </View>
    );

    if (!dragEnabled) {
      return <View style={styles.row}>{card}</View>;
    }

    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={180}
          disabled={!dragEnabled}
          style={styles.row}
        >
          {card}
        </Pressable>
      </ScaleDecorator>
    );
  };

  const listEmpty = initialLoading ? (
    <View style={styles.loadingState}>
      <LosangeLogoLoader size="large" />
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Text variant="titleMedium" style={styles.emptyText}>
        {searchQuery.trim()
          ? 'Aucun résultat.'
          : selectedMetierId
            ? 'Aucun ouvrage ni article pour ce métier.'
            : 'Aucun ouvrage ni article enregistré.'}
      </Text>
    </View>
  );

  const canDrag = !searchQuery.trim();

  return (
    <View style={styles.container}>
      <TerrainSyncOverlay visible={syncing} />
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Ouvrages / Articles
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choisissez un métier, maintenez une ligne pour réordonner. Cochez pour la prise de cotes.
        </Text>
        {!searchQuery.trim() && metiers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metierChips}
          >
            {metiers.map((metier) => (
              <Chip
                key={metier.id}
                selected={metier.id === selectedMetierId}
                onPress={() => setSelectedMetierId(metier.id)}
                style={styles.metierChip}
                textStyle={styles.metierChipText}
                showSelectedOverlay
              >
                {metier.nom}
              </Chip>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {canDrag ? (
        <DraggableFlatList
          style={styles.list}
          containerStyle={styles.listContainer}
          data={filteredOuvrages}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
          activationDistance={12}
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={handleRefresh} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getFabColumnPadding(1) + 24 },
            filteredOuvrages.length === 0 && styles.listContentEmpty,
          ]}
          renderItem={renderItem}
          ListEmptyComponent={listEmpty}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={filteredOuvrages}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={syncing} onRefresh={handleRefresh} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: getFabColumnPadding(1) + 24 },
            filteredOuvrages.length === 0 && styles.listContentEmpty,
          ]}
          renderItem={({ item }) => renderItem({ item, drag: () => {}, isActive: false })}
          ListEmptyComponent={listEmpty}
        />
      )}

      <FlowSmallFab
        icon="magnify"
        tierFromBottom={0}
        onPress={() => setSearchVisible((prev) => !prev)}
      />

      {searchVisible ? (
        <View style={styles.searchOverlay}>
          <Pressable style={styles.blur} onPress={() => setSearchVisible(false)} />
          <View style={styles.searchContainer} pointerEvents="box-none">
            <Searchbar
              placeholder="Rechercher un ouvrage ou article"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor="#4B5563"
              placeholderTextColor="#6B7280"
              onIconPress={() => setSearchVisible(false)}
            />
          </View>
        </View>
      ) : null}
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
    marginBottom: 8,
  },
  metierChips: {
    gap: 8,
    paddingBottom: 10,
  },
  metierChip: {
    backgroundColor: chantierColors.surface,
  },
  metierChipText: {
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    marginHorizontal: -12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingTop: 4,
    paddingHorizontal: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  row: {
    marginBottom: 0,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowInactive: {
    opacity: 0.72,
  },
  rowActive: {
    opacity: 0.92,
    transform: [{ scale: 1.01 }],
  },
  dragIcon: {
    marginRight: 2,
  },
  cardPressable: {
    flex: 1,
    minWidth: 0,
  },
  checkboxWrap: {
    paddingLeft: 2,
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: chantierColors.border,
    paddingVertical: 6,
  },
  ouvrageName: {
    color: chantierColors.text,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: '#E8EEF9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeArticle: {
    backgroundColor: '#FFF3E8',
  },
  typeBadgeText: {
    color: chantierColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  metierName: {
    fontWeight: '700',
    marginTop: 6,
  },
  loadingState: {
    marginTop: 48,
    alignItems: 'center',
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    zIndex: 20,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.81)',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
  },
  searchInput: {
    fontSize: 18,
    minHeight: 52,
  },
});
