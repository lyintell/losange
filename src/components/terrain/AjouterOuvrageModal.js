import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import {
  getAllUnitesLocal,
  getUnitesEtPrixParOuvrage,
  insertOuvrageWithUniteLocal,
  insertUniteForOuvrageLocal,
} from '../../db/querries';
import { chantierColors } from '../../styles/theme';
import { formatUniteChoiceLabel } from '../../utils/formatUniteChoiceLabel';

const normalizeOuvrageNom = (value) => String(value || '').trim().toLowerCase();

const DEFAULT_CT_PRIX_UNITAIRE = '1';
const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function AjouterOuvrageModal({
  visible,
  metier,
  entrepriseId,
  existingOuvrages = [],
  lockPrixUnitaireToOne = false,
  onDismiss,
  onCreated,
}) {
  const [unites, setUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nom, setNom] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [uniteId, setUniteId] = useState(null);
  const [uniteMenuOpen, setUniteMenuOpen] = useState(false);
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);
  const [showOuvrageDropdown, setShowOuvrageDropdown] = useState(false);
  const [existingOuvrageUnites, setExistingOuvrageUnites] = useState([]);
  const [loadingExistingUnites, setLoadingExistingUnites] = useState(false);

  const selectedUnite = unites.find((item) => item.id === uniteId) || null;

  const ouvrageSearchResults = useMemo(() => {
    const term = nom.trim().toLowerCase();
    if (!term) return [];
    return existingOuvrages.filter((ouvrage) =>
      String(ouvrage.nom || '')
        .toLowerCase()
        .includes(term)
    );
  }, [nom, existingOuvrages]);

  const isDuplicateCombo = useMemo(() => {
    if (!selectedOuvrage?.id || !uniteId) return false;
    return existingOuvrageUnites.some((row) => row.unite_id === uniteId);
  }, [selectedOuvrage, uniteId, existingOuvrageUnites]);

  const canSubmit = Boolean(nom.trim() && uniteId && !isDuplicateCombo);

  useEffect(() => {
    if (!visible) return undefined;

    setNom('');
    setPrixUnitaire(lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : '');
    setUniteId(null);
    setError('');
    setUniteMenuOpen(false);
    setSelectedOuvrage(null);
    setShowOuvrageDropdown(false);
    setExistingOuvrageUnites([]);

    const load = async () => {
      setLoadingUnites(true);
      try {
        const catalogueUnites = await getAllUnitesLocal();
        setUnites(catalogueUnites || []);
      } catch (loadError) {
        console.error('Erreur chargement modal ouvrage:', loadError);
        setUnites([]);
        setError('Impossible de charger les unités.');
      } finally {
        setLoadingUnites(false);
      }
    };

    load();
  }, [visible, entrepriseId, lockPrixUnitaireToOne]);

  useEffect(() => {
    if (!selectedOuvrage?.id) {
      setExistingOuvrageUnites([]);
      return undefined;
    }

    let cancelled = false;

    const loadExistingUnites = async () => {
      setLoadingExistingUnites(true);
      try {
        const data = await getUnitesEtPrixParOuvrage(selectedOuvrage.id);
        if (!cancelled) {
          setExistingOuvrageUnites(data || []);
        }
      } catch (loadError) {
        console.error('Erreur chargement unites ouvrage:', loadError);
        if (!cancelled) {
          setExistingOuvrageUnites([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingExistingUnites(false);
        }
      }
    };

    loadExistingUnites();
    return () => {
      cancelled = true;
    };
  }, [selectedOuvrage?.id]);

  const handleNomChange = (value) => {
    setNom(value);
    if (
      selectedOuvrage &&
      normalizeOuvrageNom(value) !== normalizeOuvrageNom(selectedOuvrage.nom)
    ) {
      setSelectedOuvrage(null);
    }
    setShowOuvrageDropdown(true);
  };

  const handleSelectOuvrage = (ouvrage) => {
    setSelectedOuvrage(ouvrage);
    setNom(ouvrage.nom || '');
    setShowOuvrageDropdown(false);
  };

  const handleSave = async () => {
    setError('');
    if (!metier?.id || !entrepriseId) {
      setError('Métier ou entreprise manquant.');
      return;
    }
    if (!nom.trim()) {
      setError("Saisissez le nom de l'ouvrage.");
      return;
    }
    if (isDuplicateCombo) {
      setError('Cette combinaison ouvrage / unité existe déjà.');
      return;
    }
    if (!uniteId) {
      setError('Choisissez une unité.');
      return;
    }

    setSaving(true);
    try {
      const prix = lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : prixUnitaire;
      const result = selectedOuvrage?.id
        ? await insertUniteForOuvrageLocal({
            ouvrageId: selectedOuvrage.id,
            uniteId,
            prixUnitaire: prix,
          })
        : await insertOuvrageWithUniteLocal({
            metierId: metier.id,
            entrepriseId,
            nom: nom.trim(),
            uniteId,
            prixUnitaire: prix,
          });
      onCreated?.(result);
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
          contentContainerStyle={styles.modalScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <Text variant="titleLarge" style={styles.title}>
            Nouvel ouvrage
          </Text>

          <View style={styles.contextBlock}>
            <Text style={styles.contextLabel}>Métier</Text>
            <Text style={styles.contextValue}>{metier?.nom || '—'}</Text>
          </View>

          <TextInput
            mode="outlined"
            label="Nom de l'ouvrage"
            value={nom}
            onChangeText={handleNomChange}
            onFocus={() => setShowOuvrageDropdown(true)}
            style={styles.input}
          />

          {showOuvrageDropdown && ouvrageSearchResults.length > 0 ? (
            <View style={styles.searchResults}>
              {ouvrageSearchResults.map((ouvrage) => (
                <Pressable
                  key={ouvrage.id}
                  onPress={() => handleSelectOuvrage(ouvrage)}
                  style={({ pressed }) => [
                    styles.searchResultRow,
                    selectedOuvrage?.id === ouvrage.id && styles.searchResultRowSelected,
                    pressed && styles.searchResultPressed,
                  ]}
                >
                  <Text style={styles.searchResultName}>{ouvrage.nom}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {selectedOuvrage ? (
            <View style={styles.selectedHint}>
              <Text style={styles.selectedHintText}>
                Ouvrage existant — une nouvelle unité sera ajoutée.
              </Text>
            </View>
          ) : null}

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

          {lockPrixUnitaireToOne ? (
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>Prix unitaire</Text>
              <Text style={styles.contextValue}>{DEFAULT_CT_PRIX_UNITAIRE} F</Text>
            </View>
          ) : (
            <TextInput
              mode="outlined"
              label="Prix unitaire"
              value={prixUnitaire}
              onChangeText={setPrixUnitaire}
              keyboardType="decimal-pad"
              style={styles.input}
              right={<TextInput.Affix text="F" />}
            />
          )}

          {loadingExistingUnites ? (
            <ActivityIndicator size="small" color={chantierColors.primary} style={styles.loader} />
          ) : null}

          {isDuplicateCombo ? (
            <Text style={styles.errorText}>Cette combinaison ouvrage / unité existe déjà.</Text>
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
  searchResults: {
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchResultRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
  },
  searchResultRowSelected: {
    backgroundColor: '#FFF5F1',
  },
  searchResultPressed: {
    opacity: 0.85,
  },
  searchResultName: {
    color: chantierColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  selectedHint: {
    backgroundColor: chantierColors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedHintText: {
    color: chantierColors.muted,
    fontSize: 14,
    fontWeight: '600',
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
