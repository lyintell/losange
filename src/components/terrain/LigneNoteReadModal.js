import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import MobileButton from './MobileButton';
import { chantierColors } from '../../styles/theme';

export default function LigneNoteReadModal({
  visible,
  note,
  note2,
  ouvrageNom,
  onDismiss,
}) {
  const hasNote = Boolean(String(note || '').trim());
  const hasNote2 = Boolean(String(note2 || '').trim());

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>
          Notes
        </Text>
        {ouvrageNom ? (
          <Text variant="titleMedium" style={styles.ouvrage}>
            {ouvrageNom}
          </Text>
        ) : null}

        {hasNote ? (
          <View style={styles.block}>
            <Text style={styles.label}>Note relevé</Text>
            <Text style={styles.note}>{String(note).trim()}</Text>
          </View>
        ) : null}

        {hasNote2 ? (
          <View style={styles.block}>
            <Text style={styles.label}>Note devis</Text>
            <Text style={styles.note}>({String(note2).trim()})</Text>
          </View>
        ) : null}

        {!hasNote && !hasNote2 ? <Text style={styles.note}>Aucune note.</Text> : null}

        <View style={styles.actions}>
          <MobileButton mode="contained" onPress={onDismiss}>
            Fermer
          </MobileButton>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: chantierColors.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  ouvrage: {
    color: chantierColors.muted,
    fontWeight: '700',
  },
  block: {
    gap: 4,
  },
  label: {
    color: chantierColors.muted,
    fontWeight: '700',
    fontSize: 13,
  },
  note: {
    color: chantierColors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
});
