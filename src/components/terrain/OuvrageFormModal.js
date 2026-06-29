import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import FournisseurSearchField from './FournisseurSearchField';
import { getAllUnitesLocal, updateOuvrageLocal } from '../../db/querries';
import { getMetierColor } from '../../utils/metierColors';
import { formatUniteTypeLabel } from '../../utils/formatLigneMesures';
import { formatUniteChoiceLabel } from '../../utils/formatUniteChoiceLabel';
import { resolveFournisseurPayload } from '../../utils/fournisseurSearch';
import { chantierColors } from '../../styles/theme';

const mapCatalogueUnite = (catalogueUnite) => ({
  uniteId: catalogueUnite.id,
  label: formatUniteChoiceLabel(catalogueUnite),
  formule: catalogueUnite.formule || '',
  typeLabel: formatUniteTypeLabel(catalogueUnite.ind_dimension, catalogueUnite.formule),
});

const buildUniteDrafts = (unites) =>
  (unites || []).map((unite) => ({
    ouvrageUniteId: unite.ouvrage_unite_id,
    uniteId: unite.unite_id,
    label: formatUniteChoiceLabel(unite),
    formule: unite.formule || '',
    typeLabel: formatUniteTypeLabel(unite.ind_dimension, unite.formule),
    prixUnitaire: String(unite.prix_unitaire ?? ''),
  }));

export default function OuvrageFormModal({
  visible,
  ouvrage,
  unites,
  editPriceOnly = false,
  onDismiss,
  onSaved,
}) {
  const isArticle = Number(ouvrage?.ind_article) === 1;
  const [catalogueUnites, setCatalogueUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [nom, setNom] = useState('');
  const [uniteDrafts, setUniteDrafts] = useState([]);
  const [openMenuForId, setOpenMenuForId] = useState(null);
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(null);
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return undefined;

    setNom(ouvrage?.nom || '');
    setUniteDrafts(buildUniteDrafts(unites));
    setOpenMenuForId(null);
    setError('');
    setFournisseurNom(ouvrage?.fournisseur_nom || '');
    setSelectedFournisseurId(ouvrage?.fournisseur_id || null);
    setFournisseurSearchResults([]);

    const load = async () => {
      if (editPriceOnly) {
        setCatalogueUnites([]);
        setLoadingUnites(false);
        return;
      }

      setLoadingUnites(true);
      try {
        const data = await getAllUnitesLocal();
        setCatalogueUnites(data || []);
      } catch (loadError) {
        console.error('Erreur chargement unites:', loadError);
        setCatalogueUnites([]);
        setError('Impossible de charger les unités.');
      } finally {
        setLoadingUnites(false);
      }
    };

    load();
  }, [visible, ouvrage, unites, editPriceOnly]);

  const handleUnitePrixChange = (ouvrageUniteId, value) => {
    setUniteDrafts((prev) =>
      prev.map((draft) =>
        draft.ouvrageUniteId === ouvrageUniteId ? { ...draft, prixUnitaire: value } : draft
      )
    );
  };

  const handleUniteSelect = (ouvrageUniteId, catalogueUnite) => {
    setUniteDrafts((prev) =>
      prev.map((draft) =>
        draft.ouvrageUniteId === ouvrageUniteId
          ? { ...draft, ...mapCatalogueUnite(catalogueUnite), prixUnitaire: draft.prixUnitaire }
          : draft
      )
    );
    setOpenMenuForId(null);
  };

  const handleSelectFournisseur = (fournisseur) => {
    setSelectedFournisseurId(fournisseur.id);
    setFournisseurNom(fournisseur.nom || '');
  };

  const handleSave = async () => {
    if (!ouvrage?.id) return;

    if (!editPriceOnly && !nom.trim()) {
      setError(isArticle ? "Saisissez le nom de l'article." : "Saisissez le nom de l'ouvrage.");
      return;
    }
    if (!editPriceOnly && uniteDrafts.some((draft) => !draft.uniteId)) {
      setError('Choisissez une unité pour chaque ligne.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ouvrageId: ouvrage.id,
        nom: editPriceOnly ? ouvrage.nom : nom.trim(),
        unites: uniteDrafts.map((draft) => {
          const originalUnite = (unites || []).find(
            (unite) => unite.ouvrage_unite_id === draft.ouvrageUniteId
          );
          return {
            ouvrageUniteId: draft.ouvrageUniteId,
            uniteId: editPriceOnly ? originalUnite?.unite_id || draft.uniteId : draft.uniteId,
            prixUnitaire: draft.prixUnitaire,
          };
        }),
      };

      if (isArticle && !editPriceOnly) {
        const fournisseurPayload = resolveFournisseurPayload({
          fournisseurNom,
          selectedFournisseurId,
          searchResults: fournisseurSearchResults,
        });
        payload.fournisseurId = fournisseurPayload.fournisseurId;
        payload.fournisseurNom = fournisseurPayload.fournisseurNom;
      }

      const result = await updateOuvrageLocal(payload);
      onSaved?.(result);
      onDismiss?.();
    } catch (saveError) {
      setError(saveError?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text variant="titleLarge" style={styles.title}>
            {editPriceOnly
              ? isArticle
                ? "Modifier le prix de l'article"
                : "Modifier le prix de l'ouvrage"
              : isArticle
                ? "Modifier l'article"
                : "Modifier l'ouvrage"}
          </Text>

          <View style={styles.contextBlock}>
            <Text style={styles.contextLabel}>Type</Text>
            <Text style={styles.contextValue}>{isArticle ? 'Article' : 'Ouvrage'}</Text>
          </View>

          <View style={styles.contextBlock}>
            <Text style={styles.contextLabel}>Métier</Text>
            <Text style={[styles.contextValue, { color: getMetierColor(ouvrage?.metier_id) }]}>
              {ouvrage?.metier_nom || '—'}
            </Text>
          </View>

          {editPriceOnly ? (
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>
                {isArticle ? "Nom de l'article" : "Nom de l'ouvrage"}
              </Text>
              <Text style={styles.contextValue}>{nom || '—'}</Text>
            </View>
          ) : (
            <TextInput
              mode="outlined"
              label={isArticle ? "Nom de l'article" : "Nom de l'ouvrage"}
              value={nom}
              onChangeText={setNom}
              style={styles.input}
            />
          )}

          {isArticle && !editPriceOnly ? (
            <FournisseurSearchField
              visible={visible}
              metierId={ouvrage?.metier_id}
              entrepriseId={ouvrage?.entreprise_id}
              fournisseurNom={fournisseurNom}
              selectedFournisseurId={selectedFournisseurId}
              onFournisseurNomChange={setFournisseurNom}
              onSelectFournisseur={handleSelectFournisseur}
              onClearSelection={() => setSelectedFournisseurId(null)}
              onSearchResultsChange={setFournisseurSearchResults}
              disabled={saving}
            />
          ) : null}

          {isArticle && editPriceOnly ? (
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>Fournisseur</Text>
              <Text style={styles.contextValue}>{fournisseurNom || '—'}</Text>
            </View>
          ) : null}

          {uniteDrafts.length === 0 ? (
            <Text style={styles.mutedText}>Aucune unité associée.</Text>
          ) : (
            uniteDrafts.map((draft) => {
              const selectedUnite =
                catalogueUnites.find((item) => item.id === draft.uniteId) || null;

              return (
                <View key={draft.ouvrageUniteId} style={styles.uniteBlock}>
                  <Text style={styles.uniteTitle}>
                    {isArticle ? 'Unité article' : 'Ouvrage unité'}
                  </Text>

                  {editPriceOnly ? (
                    <>
                      <Text style={styles.uniteMeta}>Unité : {draft.label || '—'}</Text>
                      <Text style={styles.uniteMeta}>Type : {draft.typeLabel}</Text>
                    </>
                  ) : loadingUnites ? (
                    <ActivityIndicator
                      size="small"
                      color={chantierColors.primary}
                      style={styles.loader}
                    />
                  ) : catalogueUnites.length === 0 ? (
                    <Text style={styles.errorText}>
                      Aucune unité dans le catalogue. Synchronisez depuis Supabase.
                    </Text>
                  ) : (
                    <Menu
                      visible={openMenuForId === draft.ouvrageUniteId}
                      onDismiss={() => setOpenMenuForId(null)}
                      anchor={
                        <MobileButton
                          mode="outlined"
                          onPress={() => setOpenMenuForId(draft.ouvrageUniteId)}
                          style={styles.uniteButton}
                          contentStyle={styles.uniteButtonContent}
                        >
                          {selectedUnite
                            ? formatUniteChoiceLabel(selectedUnite)
                            : draft.label || "Choisir l'unité"}
                        </MobileButton>
                      }
                    >
                      <ScrollView style={styles.uniteMenuScroll}>
                        {catalogueUnites.map((catalogueUnite) => (
                          <Menu.Item
                            key={catalogueUnite.id}
                            onPress={() => handleUniteSelect(draft.ouvrageUniteId, catalogueUnite)}
                            title={formatUniteChoiceLabel(catalogueUnite)}
                          />
                        ))}
                      </ScrollView>
                    </Menu>
                  )}

                  {!editPriceOnly ? <Text style={styles.uniteMeta}>Type : {draft.typeLabel}</Text> : null}

                  <TextInput
                    mode="outlined"
                    label="Prix unitaire"
                    value={draft.prixUnitaire}
                    onChangeText={(value) => handleUnitePrixChange(draft.ouvrageUniteId, value)}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    right={<TextInput.Affix text="F" />}
                  />
                </View>
              );
            })
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <MobileButton mode="outlined" onPress={onDismiss} disabled={saving}>
              Annuler
            </MobileButton>
            <MobileButton mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
              Enregistrer
            </MobileButton>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: chantierColors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 12,
  },
  contextBlock: {
    backgroundColor: chantierColors.background,
    borderRadius: 8,
    padding: 12,
    gap: 4,
    marginBottom: 12,
  },
  contextLabel: {
    color: chantierColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  contextValue: {
    fontSize: 16,
    fontWeight: '700',
    color: chantierColors.text,
  },
  input: {
    backgroundColor: chantierColors.surface,
    marginBottom: 12,
  },
  uniteBlock: {
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  uniteTitle: {
    color: chantierColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  uniteMeta: {
    color: chantierColors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  uniteButton: {
    borderColor: chantierColors.border,
  },
  uniteButtonContent: {
    justifyContent: 'flex-start',
  },
  uniteMenuScroll: {
    maxHeight: 220,
  },
  loader: {
    marginVertical: 8,
  },
  mutedText: {
    color: chantierColors.muted,
    fontSize: 14,
    marginBottom: 12,
  },
  errorText: {
    color: chantierColors.danger,
    fontSize: 14,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});
