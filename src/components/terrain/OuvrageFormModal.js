import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { getAllUnitesLocal, updateOuvrageLocal } from '../../db/querries';
import { getMetierColor } from '../../utils/metierColors';
import { chantierColors } from '../../styles/theme';

const formatUniteTypeLabel = (indDimension) =>
  Number(indDimension) === 1 ? 'Dimension (L x H x N)' : 'Unitaire (n)';

const formatUniteLabel = (unite) => unite.nom || 'Unité';

const mapCatalogueUnite = (catalogueUnite) => ({
  uniteId: catalogueUnite.id,
  label: catalogueUnite.nom || 'Unité',
  formule: catalogueUnite.formule || '',
  typeLabel: formatUniteTypeLabel(catalogueUnite.ind_dimension),
});

const buildUniteDrafts = (unites) =>
  (unites || []).map((unite) => ({
    ouvrageUniteId: unite.ouvrage_unite_id,
    uniteId: unite.unite_id,
    label: unite.nom || unite.nom_unite || 'Unité',
    formule: unite.formule || '',
    typeLabel: formatUniteTypeLabel(unite.ind_dimension),
    prixUnitaire: String(unite.prix_unitaire ?? ''),
  }));

export default function OuvrageFormModal({ visible, ouvrage, unites, onDismiss, onSaved }) {
  const [catalogueUnites, setCatalogueUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [nom, setNom] = useState('');
  const [uniteDrafts, setUniteDrafts] = useState([]);
  const [openMenuForId, setOpenMenuForId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return undefined;

    setNom(ouvrage?.nom || '');
    setUniteDrafts(buildUniteDrafts(unites));
    setOpenMenuForId(null);
    setError('');

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

  const handleSave = async () => {
    if (!ouvrage?.id) return;
    if (!nom.trim()) {
      setError("Saisissez le nom de l'ouvrage.");
      return;
    }
    if (uniteDrafts.some((draft) => !draft.uniteId)) {
      setError('Choisissez une unité pour chaque ligne.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await updateOuvrageLocal({
        ouvrageId: ouvrage.id,
        nom: nom.trim(),
        unites: uniteDrafts.map((draft) => ({
          ouvrageUniteId: draft.ouvrageUniteId,
          uniteId: draft.uniteId,
          prixUnitaire: draft.prixUnitaire,
        })),
      });
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text variant="titleLarge" style={styles.title}>
            Modifier l'ouvrage
          </Text>

          <View style={styles.contextBlock}>
            <Text style={styles.contextLabel}>Métier</Text>
            <Text style={[styles.contextValue, { color: getMetierColor(ouvrage?.metier_id) }]}>
              {ouvrage?.metier_nom || '—'}
            </Text>
          </View>

          <TextInput
            mode="outlined"
            label="Nom de l'ouvrage"
            value={nom}
            onChangeText={setNom}
            style={styles.input}
          />

          {uniteDrafts.length === 0 ? (
            <Text style={styles.mutedText}>Aucune unité associée.</Text>
          ) : (
            uniteDrafts.map((draft) => {
              const selectedUnite =
                catalogueUnites.find((item) => item.id === draft.uniteId) || null;

              return (
                <View key={draft.ouvrageUniteId} style={styles.uniteBlock}>
                  <Text style={styles.uniteTitle}>Ouvrage unité</Text>

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
                          {selectedUnite ? formatUniteLabel(selectedUnite) : "Choisir l'unité"}
                        </MobileButton>
                      }
                    >
                      <ScrollView style={styles.uniteMenuScroll}>
                        {catalogueUnites.map((catalogueUnite) => (
                          <Menu.Item
                            key={catalogueUnite.id}
                            onPress={() => handleUniteSelect(draft.ouvrageUniteId, catalogueUnite)}
                            title={formatUniteLabel(catalogueUnite)}
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
