import React, { useCallback, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, FAB, Searchbar, Text } from 'react-native-paper';
import { getChantiersWithClientLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';

const STATUS_COLORS = {
  D: '#6C757D',
  V: '#1D4ED8',
  E: '#F59E0B',
  X: '#2B9348',
  Z: '#000000',
  Devis: '#1D4ED8',
  'En cours': '#F59E0B',
  Termine: '#2B9348',
  'Terminé': '#2B9348',
  Annule: '#000000',
  'Annulé': '#000000',
};

const STATUS_LABELS = {
  D: 'Dimension',
  V: 'Devis',
  E: 'En cours',
  X: 'Terminé',
  Z: 'Annulé',
};

function StatutBadge({ statut }) {
  const bgColor = STATUS_COLORS[statut] || chantierColors.muted;
  const label = STATUS_LABELS[statut] || statut;
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function ListeChantiers({
  onCreatePress,
  onChantierPress,
  bottomOffset = 0,
  creating = false,
}) {
  const [loading, setLoading] = useState(false);
  const [chantiers, setChantiers] = useState([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const loadChantiers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChantiersWithClientLocal();
      setChantiers(data || []);
    } catch (error) {
      console.error('Erreur chargement chantiers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadChantiers();
  }, [loadChantiers]);

  React.useEffect(() => {
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
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomOffset + 24 }]}
        renderItem={({ item }) => (
          <Card style={styles.card} mode="elevated" onPress={() => onChantierPress?.(item)}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.chantierName}>
                {item.nom}
              </Text>
              <Text variant="bodyLarge" style={styles.clientName}>
                Client: {item.client_nom || 'Non renseigne'}
              </Text>
              <View style={styles.badgeRow}>
                <StatutBadge statut={item.status || 'Devis'} />
              </View>
            </Card.Content>
          </Card>
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
          { bottom: bottomOffset + 20 },
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFFFFF"
          customSize={70}
          loading={creating}
          disabled={creating}
          onPress={onCreatePress}
        />
      </Animated.View>
      <FAB
        icon="magnify"
        style={[styles.searchFab, { bottom: bottomOffset - 44 }]}
        color="#FFFFFF"
        customSize={50}
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
    backgroundColor: '#FF5722',
    borderRadius: 999,
  },
  pulseWrapper: {
    position: 'absolute',
    right: 0,
  },
  searchFab: {
    position: 'absolute',
    right: 24,
    backgroundColor: '#9CA3AF',
    borderRadius: 999,
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
