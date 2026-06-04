import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text } from 'react-native-paper';
import { chantierColors } from '../../styles/theme';

export default function LigneNoteReadModal({ visible, note, ouvrageNom, onDismiss }) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>
          Note
        </Text>
        {ouvrageNom ? (
          <Text variant="titleMedium" style={styles.ouvrage}>
            {ouvrageNom}
          </Text>
        ) : null}
        <Text style={styles.note}>{note || ''}</Text>
        <View style={styles.actions}>
          <Button mode="contained" onPress={onDismiss}>
            Fermer
          </Button>
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
