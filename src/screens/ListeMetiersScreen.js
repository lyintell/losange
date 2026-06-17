import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import { getLoggedInProfilViewLocal, getMetiersForEntrepriseLocal, saveMetiersOrderLocal } from '../db/querries';
import { FREE_TIER_LIMITS } from '../utils/freeTierLimits';
import { getMetierColor } from '../utils/metierColors';
import { chantierColors } from '../styles/theme';

const MetiersList = ({ metiers, loading, savingOrder, onRefresh, onDragEnd, renderItem }) => {
  if (metiers.length === 0) return null;

  return (
    <DraggableFlatList
      style={styles.list}
      containerStyle={styles.listContainer}
      data={metiers}
      keyExtractor={(item) => item.id}
      onDragEnd={onDragEnd}
      activationDistance={12}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator
      renderItem={renderItem}
    />
  );
};

export default function ListeMetiersScreen({ entrepriseId, refreshToken = 0 }) {
  const [loading, setLoading] = useState(false);
  const [metiers, setMetiers] = useState([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [isPro, setIsPro] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadMetiers = useCallback(async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

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
    loadMetiers();
  }, [loadMetiers, refreshToken]);

  const handleDragEnd = async ({ data }) => {
    setMetiers(data);
    try {
      setSavingOrder(true);
      await saveMetiersOrderLocal(data.map((item) => item.id));
    } catch (error) {
      console.error('Erreur sauvegarde ordre métiers:', error);
      loadMetiers();
    } finally {
      setSavingOrder(false);
    }
  };

  const renderItem = ({ item, drag, isActive }) => (
    <ScaleDecorator>
      <Pressable
        onLongPress={drag}
        delayLongPress={180}
        disabled={isActive || savingOrder}
        style={[styles.cardWrap, isActive && styles.cardWrapActive]}
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
              {item.abbrev ? (
                <Text variant="bodyMedium" style={styles.metierAbbrev}>
                  {item.abbrev}
                </Text>
              ) : null}
            </View>
          </Card.Content>
        </Card>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Métiers
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Maintenez une carte pour la déplacer et définir l'ordre d'affichage.
          {!isPro
            ? ` Compte gratuit : seuls les ${FREE_TIER_LIMITS.maxMetiersSelection} premiers métiers sont utilisables.`
            : ''}
        </Text>
      </View>

      {loading && metiers.length === 0 ? (
        <View style={styles.loadingState}>
          <LosangeLogoLoader size="large" />
        </View>
      ) : metiers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={styles.emptyText}>
            {loadError || 'Aucun métier disponible. Synchronisez le catalogue depuis Supabase.'}
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <MetiersList
            metiers={metiers}
            loading={loading}
            savingOrder={savingOrder}
            onRefresh={loadMetiers}
            onDragEnd={handleDragEnd}
            renderItem={renderItem}
          />
        </View>
      )}
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
  cardWrap: {
    marginBottom: 10,
  },
  cardWrapActive: {
    opacity: 0.92,
    transform: [{ scale: 1.02 }],
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
