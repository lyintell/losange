import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, FAB, Searchbar, Text } from 'react-native-paper';
import {
  FAB_SIZES,
  FlowSmallFab,
  flowFabColors,
  getFabColumnPadding,
  getMainFabBottom,
} from '../components/terrain/TerrainFlowFabs';
import { getChantiersWithClientLocal, updateChantierStatusLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';
import {
  getChantierStatusColor,
  getChantierStatusLabel,
  getNextChantierStatusOnDoubleTap,
  getNextChantierStatusOnTripleTap,
} from '../utils/chantierStatus';

const MULTI_PRESS_DELAY_MS = 350;

function StatutBadge({ statut }) {
  const bgColor = getChantierStatusColor(statut);
  const label = getChantierStatusLabel(statut);
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

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

  useEffect(
    () => () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    },
    []
  );

  useEffect(() => {
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
  }, [pulseAnim]);

  const applyChantierStatus = useCallback(async (chantier, nextStatus) => {
    if (!chantier?.id || chantier.status === nextStatus) return;

    try {
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
    const term = searchQuery.trim().toLowerCase();
    if (!term) return chantiers;
    return chantiers.filter((item) =>
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
        contentContainerStyle={[styles.listContent, { paddingBottom: getFabColumnPadding(1) + 24 }]}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleChantierPress(item)}>
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={styles.chantierName}>
                  {item.nom}
                </Text>
                <Text variant="bodyLarge" style={styles.clientName}>
                  Client: {item.client_nom || 'Non renseigne'}
                </Text>
                <View style={styles.badgeRow}>
                  <StatutBadge statut={item.status || 'D'} />
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>
                Aucun chantier pour le moment.
              </Text>
            </View>
          ) : null
        }
      />

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
  chantierName: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 6,
  },
  clientName: {
    color: chantierColors.text,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
