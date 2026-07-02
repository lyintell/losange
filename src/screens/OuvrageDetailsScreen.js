import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import OuvrageFormModal from '../components/terrain/OuvrageFormModal';
import { FlowSmallFab, flowFabColors, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { deleteOuvrageLocal, getLoggedInProfilViewLocal, getOuvrageByIdLocal, getUnitesEtPrixParOuvrage } from '../db/querries';
import { formatArticleNomAvecFournisseur, formatMontant, formatUniteTypeLabel } from '../utils/formatLigneMesures';
import { getMetierColor } from '../utils/metierColors';
import { canDeleteOuvrage, canEditOuvrageNomAndUnite, canEditPrixRevient, canSeeCataloguePrices } from '../utils/terrainAccess';
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
  const [canDelete, setCanDelete] = useState(false);
  const [canEditNomAndUnite, setCanEditNomAndUnite] = useState(false);
  const [showCataloguePrices, setShowCataloguePrices] = useState(true);
  const [showPrixRevient, setShowPrixRevient] = useState(false);
  const lastEditRequestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanDelete(canDeleteOuvrage(profil));
          setCanEditNomAndUnite(canEditOuvrageNomAndUnite(profil));
          setShowCataloguePrices(canSeeCataloguePrices(profil));
          setShowPrixRevient(canEditPrixRevient(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces ouvrage:', error);
        if (!cancelled) {
          setCanDelete(false);
          setCanEditNomAndUnite(false);
          setShowCataloguePrices(true);
          setShowPrixRevient(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!canDelete || !ouvrage?.id || deleting) return;
    const isArticle = Number(ouvrage.ind_article) === 1;
    const kindLabel = isArticle ? 'article' : 'ouvrage';

    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer l'${kindLabel} "${ouvrage.nom || ''}" ?`,
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
              Alert.alert('Erreur', error.message || `Impossible de supprimer cet ${kindLabel}.`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const isArticle = Number(ouvrage?.ind_article) === 1;
  const headerTitle = ouvrage
    ? isArticle
      ? formatArticleNomAvecFournisseur(ouvrage.nom, ouvrage.fournisseur_nom)
      : ouvrage.nom
    : 'Ouvrage';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {headerTitle}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <LosangeLogoLoader size="large" />
        </View>
      ) : ouvrage ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Surface style={styles.card} elevation={1}>
            <InfoRow label="Type" value={isArticle ? 'Article' : 'Ouvrage'} />
            <InfoRow label="Nom" value={ouvrage.nom} />
            {isArticle ? (
              <InfoRow label="Fournisseur" value={ouvrage.fournisseur_nom || '—'} />
            ) : null}
            <InfoRow
              label="Métier"
              value={ouvrage.metier_nom}
              valueColor={getMetierColor(ouvrage.metier_id)}
            />
          </Surface>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            {isArticle ? 'Unité article' : 'Ouvrages unités'}
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
                <InfoRow label="Type" value={formatUniteTypeLabel(unite.ind_dimension, unite.formule)} />
                {showCataloguePrices ? (
                  <InfoRow label="Prix unitaire" value={formatMontant(unite.prix_unitaire)} />
                ) : null}
                {showPrixRevient && unite.prix_revient != null && unite.prix_revient !== '' ? (
                  <InfoRow label="Prix de revient" value={formatMontant(unite.prix_revient)} />
                ) : null}
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

      {ouvrage && canDelete ? (
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
        editPriceOnly={!canEditNomAndUnite}
        showCataloguePrices={showCataloguePrices}
        showPrixRevient={showPrixRevient}
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
