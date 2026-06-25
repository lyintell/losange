import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { insertMetierEntrepriseLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';

const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function AjouterMetierModal({ visible, entrepriseId, onDismiss, onCreated }) {
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNom('');
    setError('');
  }, [visible]);

  const handleSave = async () => {
    setError('');
    if (!entrepriseId) {
      setError('Entreprise manquante.');
      return;
    }
    if (!nom.trim()) {
      setError('Saisissez le nom du métier.');
      return;
    }

    setSaving(true);
    try {
      const result = await insertMetierEntrepriseLocal({
        entrepriseId,
        nom: nom.trim(),
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
        >
          <Text variant="titleLarge" style={styles.title}>
            Nouveau métier
          </Text>

          <TextInput
            mode="outlined"
            label="Nom du métier"
            value={nom}
            onChangeText={setNom}
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <MobileButton mode="outlined" onPress={onDismiss} disabled={saving}>
              Annuler
            </MobileButton>
            <MobileButton
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving || !nom.trim()}
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
  input: {
    backgroundColor: chantierColors.surface,
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
