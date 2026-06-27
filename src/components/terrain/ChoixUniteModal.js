import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import MobileButton from './MobileButton';
import { formatUniteChoiceLabel } from '../../utils/formatUniteChoiceLabel';
import { chantierColors } from '../../styles/theme';

const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function ChoixUniteModal({
  visible,
  ouvrageNom = '',
  unites = [],
  onDismiss,
  onSelect,
}) {
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
            Choisir l'unité
          </Text>

          {ouvrageNom ? (
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>Ouvrage</Text>
              <Text style={styles.contextValue}>{ouvrageNom}</Text>
            </View>
          ) : null}

          <View style={styles.uniteList}>
            {unites.map((item) => (
              <MobileButton
                key={item.ouvrage_unite_id}
                mode="outlined"
                onPress={() => onSelect?.(item)}
                style={styles.uniteButton}
                contentStyle={styles.uniteButtonContent}
                labelStyle={styles.uniteButtonLabel}
              >
                {formatUniteChoiceLabel(item)}
              </MobileButton>
            ))}
          </View>

          <View style={styles.actions}>
            <MobileButton mode="outlined" onPress={onDismiss}>
              Annuler
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
  },
  uniteList: {
    gap: 10,
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
