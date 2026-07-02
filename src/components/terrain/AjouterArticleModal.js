import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import FournisseurSearchField from './FournisseurSearchField';
import {
  getAllUnitesLocal,
  insertArticleWithUniteLocal,
} from '../../db/querries';
import { chantierColors } from '../../styles/theme';
import { formatUniteChoiceLabel } from '../../utils/formatUniteChoiceLabel';
import { resolveFournisseurPayload } from '../../utils/fournisseurSearch';

const normalizeNom = (value) => String(value || '').trim().toLowerCase();

const DEFAULT_CT_PRIX_UNITAIRE = '1';
const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function AjouterArticleModal({
  visible,
  metier,
  entrepriseId,
  existingArticles = [],
  lockPrixUnitaireToOne = false,
  showPrixRevient = false,
  onDismiss,
  onCreated,
}) {
  const [unites, setUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nom, setNom] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [prixRevient, setPrixRevient] = useState('');
  const [uniteId, setUniteId] = useState(null);
  const [uniteMenuOpen, setUniteMenuOpen] = useState(false);
  const [fournisseurNom, setFournisseurNom] = useState('');
  const [fournisseurSearchResults, setFournisseurSearchResults] = useState([]);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState(null);

  const selectedUnite = unites.find((item) => item.id === uniteId) || null;

  const isDuplicateNom = useMemo(() => {
    const normalized = normalizeNom(nom);
    if (!normalized) return false;
    return existingArticles.some((article) => normalizeNom(article.nom) === normalized);
  }, [nom, existingArticles]);

  const canSubmit = Boolean(nom.trim() && uniteId && !isDuplicateNom);

  useEffect(() => {
    if (!visible) return undefined;

    setNom('');
    setPrixUnitaire(lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : '');
    setPrixRevient('');
    setUniteId(null);
    setError('');
    setUniteMenuOpen(false);
    setFournisseurNom('');
    setFournisseurSearchResults([]);
    setSelectedFournisseurId(null);

    const load = async () => {
      setLoadingUnites(true);
      try {
        const catalogueUnites = await getAllUnitesLocal();
        setUnites(catalogueUnites || []);
      } catch (loadError) {
        console.error('Erreur chargement modal article:', loadError);
        setUnites([]);
        setError('Impossible de charger les unités.');
      } finally {
        setLoadingUnites(false);
      }
    };

    load();
  }, [visible, entrepriseId, lockPrixUnitaireToOne]);

  const handleSelectFournisseur = (fournisseur) => {
    setSelectedFournisseurId(fournisseur.id);
    setFournisseurNom(fournisseur.nom || '');
  };

  const handleSave = async () => {
    setError('');
    if (!metier?.id || !entrepriseId) {
      setError('Métier ou entreprise manquant.');
      return;
    }
    if (!nom.trim()) {
      setError("Saisissez le nom de l'article.");
      return;
    }
    if (isDuplicateNom) {
      setError('Un article avec ce nom existe déjà pour ce métier.');
      return;
    }
    if (!uniteId) {
      setError('Choisissez une unité.');
      return;
    }

    setSaving(true);
    try {
      const fournisseurPayload = resolveFournisseurPayload({
        fournisseurNom,
        selectedFournisseurId,
        searchResults: fournisseurSearchResults,
      });

      const result = await insertArticleWithUniteLocal({
        metierId: metier.id,
        entrepriseId,
        nom: nom.trim(),
        uniteId,
        prixUnitaire: lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : prixUnitaire,
        prixRevient: showPrixRevient ? prixRevient : null,
        fournisseurId: fournisseurPayload.fournisseurId,
        fournisseurNom: fournisseurPayload.fournisseurNom,
      });
      onCreated?.({
        ouvrage: result.ouvrage,
        ouvrageUnite: result.ouvrageUnite,
      });
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
        <ScrollView
          style={styles.modalBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          contentContainerStyle={styles.modalScroll}
        >
          <Text variant="titleLarge" style={styles.title}>
            Nouvel article
          </Text>

          <View style={styles.contextBlock}>
            <Text style={styles.contextLabel}>Métier</Text>
            <Text style={styles.contextValue}>{metier?.nom || '—'}</Text>
          </View>

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Article
          </Text>

          <TextInput
            mode="outlined"
            label="Nom de l'article"
            value={nom}
            onChangeText={setNom}
            style={styles.input}
          />

          {loadingUnites ? (
            <ActivityIndicator size="small" color={chantierColors.primary} style={styles.loader} />
          ) : unites.length === 0 ? (
            <Text style={styles.errorText}>Aucune unité dans le catalogue. Synchronisez depuis Supabase.</Text>
          ) : (
            <Menu
              visible={uniteMenuOpen}
              onDismiss={() => setUniteMenuOpen(false)}
              anchor={
                <MobileButton
                  mode="outlined"
                  onPress={() => setUniteMenuOpen(true)}
                  style={styles.uniteButton}
                  contentStyle={styles.uniteButtonContent}
                  labelStyle={styles.uniteButtonLabel}
                >
                  {selectedUnite ? formatUniteChoiceLabel(selectedUnite) : "Choisir l'unité"}
                </MobileButton>
              }
            >
              <ScrollView
                style={styles.uniteMenuScroll}
                contentContainerStyle={styles.uniteMenuScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {unites.map((unite) => (
                  <Menu.Item
                    key={unite.id}
                    onPress={() => {
                      setUniteId(unite.id);
                      setUniteMenuOpen(false);
                    }}
                    title={formatUniteChoiceLabel(unite)}
                    titleStyle={styles.uniteMenuItemTitle}
                    style={styles.uniteMenuItem}
                  />
                ))}
              </ScrollView>
            </Menu>
          )}

          {!lockPrixUnitaireToOne ? (
            <TextInput
              mode="outlined"
              label="Prix unitaire"
              value={prixUnitaire}
              onChangeText={setPrixUnitaire}
              keyboardType="decimal-pad"
              style={styles.input}
              right={<TextInput.Affix text="F" />}
            />
          ) : null}

          {showPrixRevient ? (
            <TextInput
              mode="outlined"
              label="Prix de revient (optionnel)"
              value={prixRevient}
              onChangeText={setPrixRevient}
              keyboardType="decimal-pad"
              style={styles.input}
              right={<TextInput.Affix text="F" />}
            />
          ) : null}

          <Text variant="titleMedium" style={styles.sectionTitle}>
            Fournisseur
          </Text>

          <FournisseurSearchField
            visible={visible}
            metierId={metier?.id}
            entrepriseId={entrepriseId}
            fournisseurNom={fournisseurNom}
            selectedFournisseurId={selectedFournisseurId}
            onFournisseurNomChange={setFournisseurNom}
            onSelectFournisseur={handleSelectFournisseur}
            onClearSelection={() => setSelectedFournisseurId(null)}
            onSearchResultsChange={setFournisseurSearchResults}
            disabled={saving}
          />

          {isDuplicateNom ? (
            <Text style={styles.errorText}>Un article avec ce nom existe déjà pour ce métier.</Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <MobileButton mode="outlined" onPress={onDismiss} disabled={saving}>
              Annuler
            </MobileButton>
            <MobileButton
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving || !canSubmit}
            >
              Créer
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
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalBody: {
    maxHeight: MODAL_BODY_MAX_HEIGHT,
  },
  modalScroll: {
    gap: 12,
    padding: 20,
    paddingBottom: 48,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '700',
    marginTop: 4,
  },
  contextBlock: {
    backgroundColor: chantierColors.background,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  contextLabel: {
    color: chantierColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  contextValue: {
    color: chantierColors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    backgroundColor: chantierColors.surface,
  },
  uniteButton: {
    borderColor: chantierColors.border,
  },
  uniteButtonContent: {
    justifyContent: 'flex-start',
    minHeight: 52,
  },
  uniteButtonLabel: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
  },
  uniteMenuScroll: {
    maxHeight: 280,
  },
  uniteMenuScrollContent: {
    paddingBottom: 52,
  },
  uniteMenuItem: {
    minHeight: 52,
    justifyContent: 'center',
  },
  uniteMenuItemTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: chantierColors.text,
  },
  loader: {
    marginVertical: 8,
  },
  errorText: {
    color: chantierColors.danger,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});
