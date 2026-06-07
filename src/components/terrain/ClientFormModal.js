import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { updateClientLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';

export default function ClientFormModal({ visible, client, onDismiss, onSaved }) {
  const [nomComplet, setNomComplet] = useState('');
  const [telephone1, setTelephone1] = useState('');
  const [telephone2, setTelephone2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNomComplet(client?.nom_complet || '');
    setTelephone1(client?.telephone_1 || '');
    setTelephone2(client?.telephone_2 || '');
    setError('');
  }, [visible, client]);

  const handleSave = async () => {
    if (!client?.id) return;
    if (!nomComplet.trim() || !telephone1.trim()) {
      setError('Le nom et le téléphone principal sont requis.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateClientLocal(
        client.id,
        nomComplet.trim(),
        telephone1.trim(),
        telephone2.trim() || null
      );
      onSaved?.({
        ...client,
        nom_complet: nomComplet.trim(),
        telephone_1: telephone1.trim(),
        telephone_2: telephone2.trim() || null,
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
        <Text variant="titleLarge" style={styles.title}>
          Modifier le client
        </Text>

        <TextInput
          mode="outlined"
          label="Nom complet"
          value={nomComplet}
          onChangeText={setNomComplet}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Téléphone 1"
          value={telephone1}
          onChangeText={setTelephone1}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Téléphone 2"
          value={telephone2}
          onChangeText={setTelephone2}
          keyboardType="phone-pad"
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <MobileButton mode="outlined" onPress={onDismiss} disabled={saving}>
            Annuler
          </MobileButton>
          <MobileButton mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
            Enregistrer
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
