import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import ReleveStatutBadge from '../components/terrain/ReleveStatutBadge';
import { getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import {
  canCurrentUserModifyChantierLocal,
  deleteChantierLocal,
  deleteReleveLocal,
  getLoggedInProfilViewLocal,
  getRelevesByChantierLocal,
  updateReleveStatusLocal,
} from '../db/querries';
import { chantierColors } from '../styles/theme';
import { canModifyReleveForProfil, canChangeReleveStatus } from '../utils/terrainAccess';
import { formatPriseLe, formatPriseParLine } from '../utils/releveDisplay';

const CARD_PRESS_DELAY_MS = 350;

function ReleveListCard({ item, position, profil, onPress, onDelete, onStatusChange }) {
  const pressCountRef = useRef(0);
  const pressTimerRef = useRef(null);
  const canModify = canModifyReleveForProfil(profil, item);
  const canEditStatus = canChangeReleveStatus(profil) && canModify;
  const priseParLine = formatPriseParLine(item.cree_le, item.prise_par_nom);

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
            <Text variant="titleMedium" style={styles.releveTitle}>
              Relevé {position}
            </Text>
          </Pressable>
          <ReleveStatutBadge
            status={item.status}
            disabled={!canEditStatus}
            onStatusChange={(nextStatus) => onStatusChange?.(item, nextStatus)}
          />
        </View>
        <Pressable onPress={handleCardPress}>
          {priseParLine ? (
            <Text style={styles.priseLeText}>{priseParLine}</Text>
          ) : (
            <Text style={styles.priseLeText}>Date non renseignée</Text>
          )}
        </Pressable>
      </Card.Content>
    </Card>
  );
}

export default function ChantierRelevesListScreen({
  chantier,
  onRelevePress,
  onRelevesChanged,
  onChantierDeleted,
}) {
  const [loading, setLoading] = useState(false);
  const [releves, setReleves] = useState([]);
  const [profil, setProfil] = useState(null);

  useEffect(() => {
    const loadProfil = async () => {
      try {
        const data = await getLoggedInProfilViewLocal();
        setProfil(data);
      } catch (error) {
        console.error('Erreur chargement profil:', error);
        setProfil(null);
      }
    };
    loadProfil();
  }, []);

  const loadReleves = useCallback(async () => {
    if (!chantier?.id) {
      setReleves([]);
      return [];
    }

    try {
      setLoading(true);
      const data = await getRelevesByChantierLocal(chantier.id);
      const rows = data || [];
      setReleves(rows);
      return rows;
    } catch (error) {
      console.error('Erreur chargement relevés:', error);
      setReleves([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [chantier?.id]);

  const handleReleveStatusChange = useCallback(async (releve, nextStatus) => {
    if (!releve?.id) return;

    try {
      if (!canChangeReleveStatus(profil)) {
        return;
      }

      if (!canModifyReleveForProfil(profil, releve)) {
        Alert.alert(
          'Modification refusée',
          "Vous ne pouvez pas modifier un relevé que vous n'avez pas pris."
        );
        return;
      }

      const savedStatus = await updateReleveStatusLocal(releve.id, nextStatus);
      setReleves((prev) =>
        prev.map((item) => (item.id === releve.id ? { ...item, status: savedStatus } : item))
      );
    } catch (error) {
      console.error('Erreur mise a jour status releve:', error);
      Alert.alert('Modification refusée', error.message || 'Action impossible.');
    }
  }, [profil]);

  const handleDeleteReleve = useCallback(
    async (releve) => {
      if (!releve?.id) return;

      const dateLabel = formatPriseLe(releve.cree_le) || 'ce relevé';
      const chantierNom = chantier?.nom || 'ce chantier';

      Alert.alert(
        'Supprimer',
        `Que souhaitez-vous supprimer ?\nRelevé du ${dateLabel}`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ce relevé',
            onPress: async () => {
              try {
                if (!canModifyReleveForProfil(profil, releve)) {
                  Alert.alert(
                    'Modification refusée',
                    "Vous ne pouvez pas supprimer un relevé que vous n'avez pas pris."
                  );
                  return;
                }

                await deleteReleveLocal(releve.id);
                const rows = await loadReleves();
                onRelevesChanged?.(rows.length);
              } catch (error) {
                console.error('Erreur suppression releve:', error);
                Alert.alert('Erreur', error.message || 'Impossible de supprimer ce relevé.');
              }
            },
          },
          {
            text: 'Le chantier',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Supprimer le chantier',
                `Confirmer la suppression définitive du chantier "${chantierNom}" et de tous ses relevés ?`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Supprimer le chantier',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        if (!(await canCurrentUserModifyChantierLocal(chantier?.id))) {
                          Alert.alert(
                            'Modification refusée',
                            "Vous ne pouvez pas supprimer un chantier que vous n'avez pas pris."
                          );
                          return;
                        }

                        await deleteChantierLocal(chantier.id);
                        onChantierDeleted?.(chantier);
                      } catch (error) {
                        console.error('Erreur suppression chantier:', error);
                        Alert.alert(
                          'Erreur',
                          error.message || 'Impossible de supprimer ce chantier.'
                        );
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    },
    [chantier, loadReleves, onChantierDeleted, onRelevesChanged, profil]
  );

  useEffect(() => {
    loadReleves();
  }, [loadReleves]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {chantier?.nom || 'Chantier'}
        </Text>
        <Text variant="bodyMedium" style={styles.subTitle}>
          Client : {chantier?.client_nom || 'Non renseigné'}
        </Text>
      </View>

      <FlatList
        data={releves}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReleves} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: getFabColumnPadding(0) + 24 }]}
        renderItem={({ item, index }) => (
          <ReleveListCard
            item={item}
            position={item.numero ?? 1}
            profil={profil}
            onPress={onRelevePress}
            onDelete={handleDeleteReleve}
            onStatusChange={handleReleveStatusChange}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <LosangeLogoLoader size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text variant="titleMedium" style={styles.emptyText}>
                Aucun relevé pour ce chantier.
              </Text>
            </View>
          )
        }
      />
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
    fontSize: 28,
  },
  subTitle: {
    color: chantierColors.muted,
    marginTop: 4,
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
  cardPressArea: {
    flex: 1,
    marginRight: 8,
  },
  releveTitle: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priseLeText: {
    color: chantierColors.muted,
    fontSize: 12,
    lineHeight: 16,
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
});
