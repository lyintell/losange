import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { getAllUnitesLocal, searchFournisseursLocal, updateOuvrageLocal } from '../../db/querries';
import { getMetierColor } from '../../utils/metierColors';
import { formatUniteTypeLabel } from '../../utils/formatLigneMesures';
import { formatUniteChoiceLabel } from '../../utils/formatUniteChoiceLabel';
import { chantierColors } from '../../styles/theme';

const formatFournisseurSubtitle = (fournisseur) => {
  const phones = [fournisseur.telephone_1, fournisseur.telephone_2].filter(Boolean);
  return phones.join(' · ');
};

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

export default function OuvrageFormModal({ visible, ouvrage, unites, onDismiss, onSaved }) {
  const isArticle = Number(ouvrage?.ind_article) === 1;
  const [catalogueUnites, setCatalogueUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [nom, setNom] = useState('');
  const [uniteDrafts, setUniteDrafts] = useState([]);
  const [openMenuForId, setOpenMenuForId] = useState(null);
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(null);
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [searchingFournisseurs, setSearchingFournisseurs] = useState(false);
  const [showFournisseurDropdown, setShowFournisseurDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const runFournisseurSearch = useCallback(
    async (query) => {
      if (!isArticle || !ouvrage?.metier_id || !ouvrage?.entreprise_id || !query.trim()) {
        setFournisseurSearchResults([]);
        return;
      }
      try {
        setSearchingFournisseurs(true);
        const results = await searchFournisseursLocal(
          ouvrage.metier_id,
          ouvrage.entreprise_id,
          query
        );
        setFournisseurSearchResults(results || []);
      } catch (searchError) {
        console.error('Erreur recherche fournisseurs:', searchError);
        setFournisseurSearchResults([]);
      } finally {
        setSearchingFournisseurs(false);
      }
    },
    [isArticle, ouvrage?.metier_id, ouvrage?.entreprise_id]
  );

  useEffect(() => {
    if (!visible || !isArticle || !showFournisseurDropdown) return undefined;
    const timer = setTimeout(() => runFournisseurSearch(fournisseurNom), 300);
    return () => clearTimeout(timer);
  }, [fournisseurNom, isArticle, runFournisseurSearch, showFournisseurDropdown, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    setNom(ouvrage?.nom || '');
    setUniteDrafts(buildUniteDrafts(unites));
    setOpenMenuForId(null);
    setError('');
    setFournisseurNom(ouvrage?.fournisseur_nom || '');
    setSelectedFournisseurId(ouvrage?.fournisseur_id || null);
    setFournisseurSearchResults([]);
    setShowFournisseurDropdown(false);

    const load = async () => {
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
  }, [visible, ouvrage, unites]);

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
    setFournisseurSearchResults([]);
    setShowFournisseurDropdown(false);
  };

  const handleFournisseurNomChange = (value) => {
    setFournisseurNom(value);
    setSelectedFournisseurId(null);
    setShowFournisseurDropdown(true);
  };

  const handleSave = async () => {
    if (!ouvrage?.id) return;
    if (!nom.trim()) {
      setError(isArticle ? "Saisissez le nom de l'article." : "Saisissez le nom de l'ouvrage.");
      return;
    }
    if (uniteDrafts.some((draft) => !draft.uniteId)) {
      setError('Choisissez une unité pour chaque ligne.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ouvrageId: ouvrage.id,
        nom: nom.trim(),
        unites: uniteDrafts.map((draft) => ({
          ouvrageUniteId: draft.ouvrageUniteId,
          uniteId: draft.uniteId,
          prixUnitaire: draft.prixUnitaire,
        })),
      };

      if (isArticle) {
        payload.fournisseurId = selectedFournisseurId;
        payload.fournisseurNom = fournisseurNom.trim() || null;
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
            {isArticle ? "Modifier l'article" : "Modifier l'ouvrage"}
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

          <TextInput
            mode="outlined"
            label={isArticle ? "Nom de l'article" : "Nom de l'ouvrage"}
            value={nom}
            onChangeText={setNom}
            style={styles.input}
          />

          {isArticle ? (
            <>
              <TextInput
                mode="outlined"
                label="Nom du fournisseur (optionnel)"
                placeholder="Nom ou téléphone"
                value={fournisseurNom}
                onChangeText={handleFournisseurNomChange}
                style={styles.input}
                right={
                  searchingFournisseurs ? (
                    <TextInput.Icon
                      icon={() => <ActivityIndicator size={18} color={chantierColors.primary} />}
                    />
                  ) : undefined
                }
              />

              {showFournisseurDropdown && fournisseurSearchResults.length > 0 ? (
                <View style={styles.searchResults}>
                  {fournisseurSearchResults.map((fournisseur) => (
                    <Pressable
                      key={fournisseur.id}
                      onPress={() => handleSelectFournisseur(fournisseur)}
                      style={({ pressed }) => [
                        styles.searchResultRow,
                        selectedFournisseurId === fournisseur.id && styles.searchResultRowSelected,
                        pressed && styles.searchResultPressed,
                      ]}
                    >
                      <Text style={styles.searchResultName}>{fournisseur.nom}</Text>
                      {formatFournisseurSubtitle(fournisseur) ? (
                        <Text style={styles.searchResultPhone}>
                          {formatFournisseurSubtitle(fournisseur)}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
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

                  {loadingUnites ? (
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

                  <Text style={styles.uniteMeta}>Type : {draft.typeLabel}</Text>

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
  searchResults: {
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: chantierColors.surface,
    marginBottom: 12,
  },
  searchResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
  },
  searchResultRowSelected: {
    backgroundColor: '#FFF5F1',
  },
  searchResultPressed: {
    backgroundColor: '#FFF5F1',
  },
  searchResultName: {
    color: chantierColors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  searchResultPhone: {
    color: chantierColors.muted,
    marginTop: 2,
    fontSize: 14,
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
