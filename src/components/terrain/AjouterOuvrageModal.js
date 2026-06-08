import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { getAllUnitesLocal, insertOuvrageWithUniteLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';

const formatUniteLabel = (unite) => unite.nom || 'Unité';

const normalizeOuvrageNom = (value) => String(value || '').trim().toLowerCase();

const DEFAULT_CT_PRIX_UNITAIRE = '1';

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

  const selectedUnite = unites.find((item) => item.id === uniteId) || null;

  const isDuplicateNom = useMemo(() => {
    const normalized = normalizeOuvrageNom(nom);
    if (!normalized) return false;
    return existingOuvrages.some(
      (ouvrage) => normalizeOuvrageNom(ouvrage.nom) === normalized
    );
  }, [nom, existingOuvrages]);

  const canSubmit = Boolean(nom.trim() && uniteId && !isDuplicateNom);

  useEffect(() => {
    if (!visible) return undefined;

    setNom('');
    setPrixUnitaire(lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : '');
    setUniteId(null);
    setError('');
    setUniteMenuOpen(false);

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
    if (isDuplicateNom) {
      setError('Un ouvrage avec ce nom existe déjà pour ce métier.');
      return;
    }
    if (!uniteId) {
      setError('Choisissez une unité.');
      return;
    }

    setSaving(true);
    try {
      const result = await insertOuvrageWithUniteLocal({
        metierId: metier.id,
        entrepriseId,
        nom: nom.trim(),
        uniteId,
        prixUnitaire: lockPrixUnitaireToOne ? DEFAULT_CT_PRIX_UNITAIRE : prixUnitaire,
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
              >
                {selectedUnite ? formatUniteLabel(selectedUnite) : "Choisir l'unité"}
              </MobileButton>
            }
          >
            <ScrollView style={styles.uniteMenuScroll}>
              {unites.map((unite) => (
                <Menu.Item
                  key={unite.id}
                  onPress={() => {
                    setUniteId(unite.id);
                    setUniteMenuOpen(false);
                  }}
                  title={formatUniteLabel(unite)}
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

        {isDuplicateNom ? (
          <Text style={styles.errorText}>Un ouvrage avec ce nom existe déjà pour ce métier.</Text>
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
    gap: 12,
    maxHeight: '90%',
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
  input: {
    backgroundColor: chantierColors.surface,
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
