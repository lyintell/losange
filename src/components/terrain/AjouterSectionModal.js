import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from './MobileButton';
import { insertSectionLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';

const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function AjouterSectionModal({
  visible,
  entrepriseId,
  existingSections = [],
  onDismiss,
  onCreated,
}) {
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const searchResults = useMemo(() => {
    const term = nom.trim().toLowerCase();
    if (!term) return [];
    return existingSections.filter((section) =>
      String(section.nom || '')
        .toLowerCase()
        .includes(term)
    );
  }, [nom, existingSections]);

  const exactMatch = useMemo(() => {
    const term = nom.trim().toLowerCase();
    if (!term) return null;
    return (
      existingSections.find((section) => String(section.nom || '').trim().toLowerCase() === term) ||
      null
    );
  }, [nom, existingSections]);

  const canSubmit = Boolean(nom.trim());

  useEffect(() => {
    if (!visible) return;
    setNom('');
    setError('');
    setShowDropdown(false);
  }, [visible]);

  const handleSelectExisting = (section) => {
    onCreated?.({ section });
    onDismiss?.();
  };

  const handleSave = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;

    if (exactMatch) {
      handleSelectExisting(exactMatch);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const section = await insertSectionLocal(entrepriseId, trimmed);
      onCreated?.({ section });
      onDismiss?.();
    } catch (saveError) {
      setError(saveError?.message || 'Création impossible.');
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
            Nouvelle section
          </Text>
          <Text style={styles.hint}>
            Ex. RDC, Salon, Étage 1… Sélectionnez une section existante ou saisissez un nouveau nom.
          </Text>

          <TextInput
            mode="outlined"
            label="Nom de la section"
            value={nom}
            onChangeText={(value) => {
              setNom(value);
              setError('');
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            style={styles.input}
          />

          {showDropdown && searchResults.length > 0 ? (
            <ScrollView style={styles.searchResults} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {searchResults.map((section) => (
                <Pressable
                  key={section.id}
                  onPress={() => handleSelectExisting(section)}
                  style={({ pressed }) => [styles.searchResultRow, pressed && styles.searchResultPressed]}
                >
                  <Text style={styles.searchResultName}>{section.nom}</Text>
                </Pressable>
              ))}
            </ScrollView>
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
              {exactMatch ? 'Utiliser' : 'Créer'}
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
  hint: {
    color: chantierColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: chantierColors.surface,
  },
  searchResults: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
  },
  searchResultRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
  },
  searchResultPressed: {
    backgroundColor: chantierColors.background,
  },
  searchResultName: {
    color: chantierColors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    color: chantierColors.danger,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
});
