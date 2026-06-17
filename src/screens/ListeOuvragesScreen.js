import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Searchbar, Text } from 'react-native-paper';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import { FlowSmallFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { getOuvragesByEntrepriseLocal } from '../db/querries';
import { getMetierColor } from '../utils/metierColors';
import { chantierColors } from '../styles/theme';

export default function ListeOuvragesScreen({ entrepriseId, refreshToken = 0, onOuvragePress }) {
  const [loading, setLoading] = useState(false);
  const [ouvrages, setOuvrages] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadOuvrages = useCallback(async () => {
    if (!entrepriseId) {
      setOuvrages([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getOuvragesByEntrepriseLocal(entrepriseId);
      setOuvrages(data || []);
    } catch (error) {
      console.error('Erreur chargement ouvrages:', error);
      setOuvrages([]);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    loadOuvrages();
  }, [loadOuvrages, refreshToken]);

  const filteredOuvrages = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return ouvrages;
    return ouvrages.filter((ouvrage) => {
      const haystack = [ouvrage.nom, ouvrage.metier_nom].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [ouvrages, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Ouvrages
        </Text>
      </View>

      <FlatList
        data={filteredOuvrages}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOuvrages} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: getFabColumnPadding(1) + 24 }]}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOuvragePress?.(item)}>
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <Text variant="titleMedium" style={styles.ouvrageName}>
                  {item.nom}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.metierName, { color: getMetierColor(item.metier_id) }]}
                >
                  {item.metier_nom || '—'}
                </Text>
              </Card.Content>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <LosangeLogoLoader size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>
                Aucun ouvrage enregistré.
              </Text>
            </View>
          )
        }
      />

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
              placeholder="Rechercher un ouvrage"
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
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
    paddingTop: 4,
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
    marginBottom: 6,
  },
  metierName: {
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
