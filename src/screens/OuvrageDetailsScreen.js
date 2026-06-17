import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import OuvrageFormModal from '../components/terrain/OuvrageFormModal';
import { FlowSmallFab, flowFabColors, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { deleteOuvrageLocal, getOuvrageByIdLocal, getUnitesEtPrixParOuvrage } from '../db/querries';
import { formatMontant } from '../utils/formatLigneMesures';
import { getMetierColor } from '../utils/metierColors';
import { chantierColors } from '../styles/theme';

function InfoRow({ label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelLarge" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyLarge" style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>
        {value || '—'}
      </Text>
    </View>
  );
}

const formatUniteTypeLabel = (indDimension) =>
  Number(indDimension) === 1 ? 'Dimension (L x H x N)' : 'Unitaire (n)';

export default function OuvrageDetailsScreen({
  ouvrageId,
  editRequestId = 0,
  onOuvrageUpdated,
  onOuvrageDeleted,
}) {
  const [loading, setLoading] = useState(true);
  const [ouvrage, setOuvrage] = useState(null);
  const [unites, setUnites] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lastEditRequestIdRef = useRef(0);

  const loadOuvrage = useCallback(async () => {
    if (!ouvrageId) {
      setOuvrage(null);
      setUnites([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [ouvrageData, unitesData] = await Promise.all([
        getOuvrageByIdLocal(ouvrageId),
        getUnitesEtPrixParOuvrage(ouvrageId),
      ]);
      setOuvrage(ouvrageData);
      setUnites(unitesData || []);
    } catch (error) {
      console.error('Erreur chargement ouvrage:', error);
      setOuvrage(null);
      setUnites([]);
    } finally {
      setLoading(false);
    }
  }, [ouvrageId]);

  useEffect(() => {
    loadOuvrage();
  }, [loadOuvrage]);

  useEffect(() => {
    if (!editRequestId || editRequestId === lastEditRequestIdRef.current || !ouvrage) return;
    lastEditRequestIdRef.current = editRequestId;
    setEditModalVisible(true);
  }, [editRequestId, ouvrage]);

  const handleSaved = ({ ouvrage: updatedOuvrage, unites: updatedUnites }) => {
    if (updatedOuvrage) setOuvrage(updatedOuvrage);
    if (updatedUnites) setUnites(updatedUnites);
    onOuvrageUpdated?.(updatedOuvrage);
  };

  const handleDeletePress = () => {
    if (!ouvrage?.id || deleting) return;

    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer l'ouvrage "${ouvrage.nom || ''}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteOuvrageLocal(ouvrage.id);
              onOuvrageDeleted?.(ouvrage);
            } catch (error) {
              console.error('Erreur suppression ouvrage:', error);
              Alert.alert('Erreur', error.message || 'Impossible de supprimer cet ouvrage.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {ouvrage?.nom || 'Ouvrage'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <LosangeLogoLoader size="large" />
        </View>
      ) : ouvrage ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Surface style={styles.card} elevation={1}>
            <InfoRow label="Nom" value={ouvrage.nom} />
            <InfoRow
              label="Métier"
              value={ouvrage.metier_nom}
              valueColor={getMetierColor(ouvrage.metier_id)}
            />
          </Surface>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Ouvrages unités
          </Text>

          {unites.length === 0 ? (
            <Surface style={styles.card} elevation={1}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                Aucune unité associée.
              </Text>
            </Surface>
          ) : (
            unites.map((unite) => (
              <Surface key={unite.ouvrage_unite_id} style={styles.uniteCard} elevation={1}>
                <Text variant="titleMedium" style={styles.uniteName}>
                  {unite.nom}
                </Text>
                <InfoRow label="Formule" value={unite.formule} />
                <InfoRow label="Type" value={formatUniteTypeLabel(unite.ind_dimension)} />
                <InfoRow label="Prix unitaire" value={formatMontant(unite.prix_unitaire)} />
              </Surface>
            ))
          )}
        </ScrollView>
      ) : (
        <Surface style={styles.card} elevation={1}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Ouvrage introuvable.
          </Text>
        </Surface>
      )}

      {ouvrage ? (
        <FlowSmallFab
          icon="delete"
          tierFromBottom={0}
          color={flowFabColors.muted}
          disabled={deleting}
          onPress={handleDeletePress}
        />
      ) : null}

      <OuvrageFormModal
        visible={editModalVisible}
        ouvrage={ouvrage}
        unites={unites}
        onDismiss={() => setEditModalVisible(false)}
        onSaved={handleSaved}
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
    paddingBottom: getFabColumnPadding(0),
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    marginTop: 4,
  },
  uniteCard: {
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    padding: 16,
    gap: 10,
  },
  uniteName: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 2,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: chantierColors.muted,
    fontWeight: '700',
  },
  infoValue: {
    color: chantierColors.text,
    fontWeight: '600',
  },
  emptyText: {
    color: chantierColors.muted,
    fontWeight: '600',
  },
});
