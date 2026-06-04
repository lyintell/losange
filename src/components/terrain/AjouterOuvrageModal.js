import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { getAllUnitesLocal, getEntrepriseByIdLocal, insertOuvrageWithUniteLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';

const formatUniteLabel = (unite) => `${unite.nom} (${unite.formule})`;

export default function AjouterOuvrageModal({
  visible,
  metier,
  entrepriseId,
  onDismiss,
  onCreated,
}) {
  const [entrepriseNom, setEntrepriseNom] = useState('');
  const [unites, setUnites] = useState([]);
  const [loadingUnites, setLoadingUnites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nom, setNom] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [uniteId, setUniteId] = useState(null);
  const [uniteMenuOpen, setUniteMenuOpen] = useState(false);

  const selectedUnite = unites.find((item) => item.id === uniteId) || null;

  useEffect(() => {
    if (!visible) return undefined;

    setNom('');
    setPrixUnitaire('');
    setUniteId(null);
    setError('');
    setUniteMenuOpen(false);

    const load = async () => {
      setLoadingUnites(true);
      try {
        const [entreprise, catalogueUnites] = await Promise.all([
          getEntrepriseByIdLocal(entrepriseId),
          getAllUnitesLocal(),
        ]);
        setEntrepriseNom(entreprise?.nom || 'Entreprise');
        setUnites(catalogueUnites || []);
      } catch (loadError) {
        console.error('Erreur chargement modal ouvrage:', loadError);
        setUnites([]);
        setEntrepriseNom('Entreprise');
        setError('Impossible de charger les unites.');
      } finally {
        setLoadingUnites(false);
      }
    };

    load();
  }, [visible, entrepriseId]);

  const handleSave = async () => {
    setError('');
    if (!metier?.id || !entrepriseId) {
      setError('Metier ou entreprise manquant.');
      return;
    }
    if (!nom.trim()) {
      setError('Saisissez le nom de l ouvrage.');
      return;
    }
    if (!uniteId) {
      setError('Choisissez une unite.');
      return;
    }

    setSaving(true);
    try {
      const result = await insertOuvrageWithUniteLocal({
        metierId: metier.id,
        entrepriseId,
        nom: nom.trim(),
        uniteId,
        prixUnitaire,
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
          <Text style={styles.contextLabel}>Metier</Text>
          <Text style={styles.contextValue}>{metier?.nom || '—'}</Text>
          <Text style={styles.contextLabel}>Entreprise</Text>
          <Text style={styles.contextValue}>{entrepriseNom}</Text>
        </View>

        <TextInput
          mode="outlined"
          label="Nom de l ouvrage"
          value={nom}
          onChangeText={setNom}
          style={styles.input}
        />

        {loadingUnites ? (
          <ActivityIndicator size="small" color={chantierColors.primary} style={styles.loader} />
        ) : unites.length === 0 ? (
          <Text style={styles.errorText}>Aucune unite dans le catalogue. Synchronisez depuis Supabase.</Text>
        ) : (
          <Menu
            visible={uniteMenuOpen}
            onDismiss={() => setUniteMenuOpen(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setUniteMenuOpen(true)}
                style={styles.uniteButton}
                contentStyle={styles.uniteButtonContent}
              >
                {selectedUnite ? formatUniteLabel(selectedUnite) : 'Choisir l unite'}
              </Button>
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

        <TextInput
          mode="outlined"
          label="Prix unitaire"
          value={prixUnitaire}
          onChangeText={setPrixUnitaire}
          keyboardType="decimal-pad"
          style={styles.input}
          right={<TextInput.Affix text="F" />}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onDismiss} disabled={saving}>
            Annuler
          </Button>
          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
            Creer
          </Button>
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
