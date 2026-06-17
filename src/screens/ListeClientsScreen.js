import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Searchbar, Text } from 'react-native-paper';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import { FlowSmallFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { getClientsByEntrepriseLocal, getLoggedInProfilViewLocal } from '../db/querries';
import { canManageClients } from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';

const formatClientPhoneLine = (name, phone) => {
  const parts = [name, phone].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
};

export default function ListeClientsScreen({ entrepriseId, refreshToken = 0, onClientPress }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [canOpenClientDetails, setCanOpenClientDetails] = useState(false);

  const loadClients = useCallback(async () => {
    if (!entrepriseId) {
      setClients([]);
      return;
    }
    try {
      setLoading(true);
      const data = await getClientsByEntrepriseLocal(entrepriseId);
      setClients(data || []);
    } catch (error) {
      console.error('Erreur chargement clients:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    loadClients();
  }, [loadClients, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanOpenClientDetails(canManageClients(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces clients:', error);
        if (!cancelled) {
          setCanOpenClientDetails(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) => {
      const haystack = [
        client.nom_complet,
        client.telephone_1,
        client.telephone_2,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, searchQuery]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Clients
        </Text>
      </View>

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadClients} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: getFabColumnPadding(1) + 24 }]}
        renderItem={({ item }) => (
          <Pressable
            disabled={!canOpenClientDetails}
            onPress={() => {
              if (canOpenClientDetails) {
                onClientPress?.(item);
              }
            }}
          >
            <Card style={styles.card} mode="elevated">
              <Card.Content>
                <Text variant="bodyLarge" style={styles.clientLine}>
                  {formatClientPhoneLine(item.nom_complet, item.telephone_1)}
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
                Aucun client enregistré.
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
              placeholder="Rechercher un client"
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
  clientLine: {
    color: chantierColors.text,
    fontWeight: '600',
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
