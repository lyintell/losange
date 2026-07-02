import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, FAB, Searchbar, Text } from 'react-native-paper';
import {
  FAB_SIZES,
  FlowSmallFab,
  flowFabColors,
  getFabColumnPadding,
  getMainFabBottom,
} from '../components/terrain/TerrainFlowFabs';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import ChantierStatutBadge from '../components/terrain/ChantierStatutBadge';
import TerrainSyncOverlay from '../components/terrain/TerrainSyncOverlay';
import { useTerrainSyncRefresh } from '../hooks/useTerrainSyncRefresh';
import { canCurrentUserModifyChantierLocal, getChantiersWithClientLocal, getLoggedInProfilViewLocal, updateChantierStatusLocal } from '../db/querries';
import { canCreateReleveOrLigne, canChangeChantierStatus } from '../utils/terrainAccess';
import { formatPriseParLine, formatReleveCountLabel } from '../utils/releveDisplay';
import { chantierColors } from '../styles/theme';

const CARD_PRESS_DELAY_MS = 350;

const formatClientPhoneLine = (name, phone) => {
  const parts = [name, phone].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Non renseigné';
};

function ChantierListCard({ item, onPress, onDelete, onStatusChange, canEditChantierStatus }) {
  const pressCountRef = useRef(0);
  const pressTimerRef = useRef(null);
  const releveCount = Number(item.releve_count) || 0;
  const releveCountLabel = formatReleveCountLabel(releveCount);
  const priseParLine = formatPriseParLine(item.prise_le, item.prise_par_nom);
  const metaLine = releveCountLabel || priseParLine;

  useEffect(
    () => () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    },
    []
  );

  const handleCardPress = () => {
    pressCountRef.current += 1;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      const pressCount = pressCountRef.current;
      pressCountRef.current = 0;
      pressTimerRef.current = null;

      if (pressCount >= 2) {
        onDelete?.(item);
        return;
      }

      if (pressCount === 1) {
        onPress?.(item);
      }
    }, CARD_PRESS_DELAY_MS);
  };

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.titleRow}>
          <Pressable style={styles.cardPressArea} onPress={handleCardPress}>
            <Text variant="titleMedium" style={styles.chantierName}>
              {item.nom}
            </Text>
          </Pressable>
          <ChantierStatutBadge
            status={item.status || 'D'}
            disabled={!canEditChantierStatus}
            onStatusChange={(nextStatus) => onStatusChange?.(item, nextStatus)}
          />
        </View>
        <Pressable onPress={handleCardPress}>
          <Text variant="bodyLarge" style={styles.clientLine} numberOfLines={1}>
            {formatClientPhoneLine(item.client_nom, item.client_telephone_1)}
          </Text>
          {metaLine ? <Text style={styles.priseLeText}>{metaLine}</Text> : null}
        </Pressable>
      </Card.Content>
    </Card>
  );
}

const parsePriseLeTimestamp = (value) => {
  if (!value) return 0;
  const normalized = String(value).includes('T')
    ? value
    : String(value).replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const sortChantiersByPriseLeDesc = (rows) =>
  [...rows].sort(
    (a, b) => parsePriseLeTimestamp(b.prise_le) - parsePriseLeTimestamp(a.prise_le)
  );

export default function ListeChantiers({
  onCreatePress,
  onChantierPress,
  onDeleteChantier,
  onSyncFromSupabase,
  entrepriseId = null,
  bottomOffset = 0,
  creating = false,
  refreshToken = 0,
}) {
  const [initialLoading, setInitialLoading] = useState(true);
  const [chantiers, setChantiers] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canCreateReleve, setCanCreateReleve] = useState(true);
  const [canEditChantierStatus, setCanEditChantierStatus] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const loadChantiers = useCallback(async () => {
    try {
      const data = await getChantiersWithClientLocal(entrepriseId);
      setChantiers(data || []);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
    }
  }, [entrepriseId]);

  const { syncing, handleRefresh } = useTerrainSyncRefresh({
    onSyncFromSupabase,
    onReload: loadChantiers,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setInitialLoading(true);
      await loadChantiers();
      if (!cancelled) {
        setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [loadChantiers, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanCreateReleve(canCreateReleveOrLigne(profil));
          setCanEditChantierStatus(canChangeChantierStatus(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces creation releve:', error);
        if (!cancelled) {
          setCanCreateReleve(true);
          setCanEditChantierStatus(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canCreateReleve) return undefined;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [pulseAnim, canCreateReleve]);

  const applyChantierStatus = useCallback(async (chantier, nextStatus) => {
    if (!chantier?.id || chantier.status === nextStatus) return;

    try {
      const profil = await getLoggedInProfilViewLocal();
      if (!canChangeChantierStatus(profil)) {
        Alert.alert('Modification refusée', 'Vous ne pouvez pas modifier le statut du chantier.');
        return;
      }
      await updateChantierStatusLocal(chantier.id, nextStatus);
      setChantiers((prev) =>
        prev.map((item) => (item.id === chantier.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.error('Erreur mise a jour status chantier:', error);
      Alert.alert('Modification refusée', error.message || 'Action impossible.');
    }
  }, []);

  const handleDeleteChantierPress = useCallback(
    async (chantier) => {
      if (!chantier?.id) return;

      try {
        if (!(await canCurrentUserModifyChantierLocal(chantier.id))) {
          Alert.alert(
            'Modification refusée',
            "Vous ne pouvez pas supprimer un chantier que vous n'avez pas pris."
          );
          return;
        }
      } catch (error) {
        console.error('Erreur verification suppression chantier:', error);
        return;
      }

      Alert.alert(
        'Supprimer',
        `Voulez-vous supprimer le chantier "${chantier.nom || ''}" ?`,
        [
          { text: 'Non', style: 'cancel' },
          {
            text: 'Oui',
            style: 'destructive',
            onPress: async () => {
              try {
                await onDeleteChantier?.(chantier);
                setChantiers((prev) => prev.filter((item) => item.id !== chantier.id));
              } catch (error) {
                console.error('Erreur suppression chantier:', error);
                Alert.alert('Erreur', error.message || 'Impossible de supprimer ce chantier.');
              }
            },
          },
        ]
      );
    },
    [onDeleteChantier]
  );

  const filteredChantiers = React.useMemo(() => {
    const sorted = sortChantiersByPriseLeDesc(chantiers);
    const term = searchQuery.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((item) =>
      [
        item.nom,
        item.adresse,
        item.client_nom,
        item.client_telephone_1,
        item.client_telephone_2,
      ].some((value) => String(value || '').toLowerCase().includes(term))
    );
  }, [chantiers, searchQuery]);

  return (
    <View style={styles.container}>
      <TerrainSyncOverlay visible={syncing} />
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Chantiers
        </Text>
      </View>

      <FlatList
        data={filteredChantiers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={handleRefresh} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFabColumnPadding(canCreateReleve ? 1 : 0) + 24 },
        ]}
        renderItem={({ item }) => (
          <ChantierListCard
            item={item}
            onPress={onChantierPress}
            onDelete={handleDeleteChantierPress}
            onStatusChange={applyChantierStatus}
            canEditChantierStatus={canEditChantierStatus}
          />
        )}
        ListEmptyComponent={
          initialLoading ? (
            <View style={styles.loadingState}>
              <LosangeLogoLoader size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>
                Aucun chantier pour le moment.
              </Text>
            </View>
          )
        }
      />

      {canCreateReleve ? (
        <Animated.View
          style={[
            styles.pulseWrapper,
            { bottom: getMainFabBottom(1) },
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <FAB
            icon="plus"
            style={styles.fab}
            color="#FFFFFF"
            customSize={FAB_SIZES.main}
            loading={creating}
            disabled={creating}
            onPress={onCreatePress}
          />
        </Animated.View>
      ) : null}
      <FlowSmallFab
        icon="magnify"
        tierFromBottom={0}
        onPress={() => setSearchVisible((prev) => !prev)}
      />

      {searchVisible && (
        <View style={styles.searchOverlay}>
          <Pressable style={styles.blur} onPress={() => setSearchVisible(false)} />
          <View style={styles.searchContainer} pointerEvents="box-none">
            <Searchbar
              placeholder="Rechercher un client ou un chantier"
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
      )}
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
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 8,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: chantierColors.border,
    paddingVertical: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cardPressArea: {
    flex: 1,
  },
  chantierName: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  clientLine: {
    color: chantierColors.text,
    marginBottom: 4,
  },
  priseLeText: {
    color: chantierColors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
  fab: {
    right: 14,
    backgroundColor: flowFabColors.primary,
    borderRadius: 999,
  },
  pulseWrapper: {
    position: 'absolute',
    right: 0,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.81)',
  },
  searchContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  searchBar: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchInput: {
    color: '#1F2937',
  },
});
