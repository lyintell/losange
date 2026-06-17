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
import { canCurrentUserModifyChantierLocal, getChantiersWithClientLocal, getLoggedInProfilViewLocal, updateChantierStatusLocal } from '../db/querries';
import { canCreateReleveOrLigne } from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';
import {
  getChantierStatusColor,
  getChantierStatusLabel,
  getNextChantierStatusOnDoubleTap,
  getNextChantierStatusOnTripleTap,
} from '../utils/chantierStatus';

const MULTI_PRESS_DELAY_MS = 350;

const formatClientPhoneLine = (name, phone) => {
  const parts = [name, phone].filter(Boolean);
  return parts.length ? parts.join(' / ') : 'Non renseigné';
};

const formatPriseLe = (dateValue) => {
  if (!dateValue) return '';
  const normalized = String(dateValue).includes('T')
    ? dateValue
    : String(dateValue).replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPriseParLine = (dateValue, priseParNom) => {
  const date = formatPriseLe(dateValue);
  const prisePar = String(priseParNom || '').trim();
  if (date && prisePar) return `${date} (prise par ${prisePar})`;
  if (date) return date;
  if (prisePar) return `(prise par ${prisePar})`;
  return '';
};

function StatutBadge({ statut }) {
  const bgColor = getChantierStatusColor(statut);
  const label = getChantierStatusLabel(statut);
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
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
  entrepriseId = null,
  bottomOffset = 0,
  creating = false,
  refreshToken = 0,
}) {
  const [loading, setLoading] = useState(false);
  const [chantiers, setChantiers] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canCreateReleve, setCanCreateReleve] = useState(true);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const pressCountRef = useRef(0);
  const pressTimerRef = useRef(null);

  const loadChantiers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChantiersWithClientLocal(entrepriseId);
      setChantiers(data || []);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    loadChantiers();
  }, [loadChantiers, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanCreateReleve(canCreateReleveOrLigne(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces creation releve:', error);
        if (!cancelled) {
          setCanCreateReleve(true);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    },
    []
  );

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
      if (!(await canCurrentUserModifyChantierLocal(chantier.id))) {
        Alert.alert(
          'Modification refusée',
          "Vous ne pouvez pas modifier un chantier que vous n'avez pas pris."
        );
        return;
      }
      await updateChantierStatusLocal(chantier.id, nextStatus);
      setChantiers((prev) =>
        prev.map((item) => (item.id === chantier.id ? { ...item, status: nextStatus } : item))
      );
    } catch (error) {
      console.error('Erreur mise a jour status chantier:', error);
    }
  }, []);

  const handleChantierPress = useCallback(
    (chantier) => {
      pressCountRef.current += 1;
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

      pressTimerRef.current = setTimeout(() => {
        const pressCount = pressCountRef.current;
        pressCountRef.current = 0;
        pressTimerRef.current = null;

        if (pressCount >= 3) {
          const nextStatus = getNextChantierStatusOnTripleTap(chantier.status);
          applyChantierStatus(chantier, nextStatus);
          return;
        }

        if (pressCount === 2) {
          const nextStatus = getNextChantierStatusOnDoubleTap(chantier.status);
          applyChantierStatus(chantier, nextStatus);
          return;
        }

        if (pressCount === 1) {
          onChantierPress?.(chantier);
        }
      }, MULTI_PRESS_DELAY_MS);
    },
    [applyChantierStatus, onChantierPress]
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
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Chantiers
        </Text>
      </View>

      <FlatList
        data={filteredChantiers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadChantiers} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: getFabColumnPadding(canCreateReleve ? 1 : 0) + 24 },
        ]}
        renderItem={({ item }) => {
          const priseParLine = formatPriseParLine(item.prise_le, item.prise_par_nom);

          return (
            <Pressable onPress={() => handleChantierPress(item)}>
              <Card style={styles.card} mode="elevated">
                <Card.Content>
                  <View style={styles.titleRow}>
                    <Text variant="titleMedium" style={styles.chantierName}>
                      {item.nom}
                    </Text>
                    <StatutBadge statut={item.status || 'D'} />
                  </View>
                  <Text variant="bodyLarge" style={styles.clientLine} numberOfLines={1}>
                    {formatClientPhoneLine(item.client_nom, item.client_telephone_1)}
                  </Text>
                  {priseParLine ? (
                    <Text style={styles.priseLeText}>{priseParLine}</Text>
                  ) : null}
                </Card.Content>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
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
  chantierName: {
    flex: 1,
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
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
