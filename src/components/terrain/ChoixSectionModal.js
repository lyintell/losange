import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import MobileButton from './MobileButton';
import { chantierColors } from '../../styles/theme';

export default function ChoixSectionModal({
  visible,
  title = 'Changer de section',
  sections = [],
  selectedSectionId = null,
  onDismiss,
  onSelect,
  onCreatePress,
}) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text variant="titleLarge" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.hint}>
            Toutes les lignes de cette section seront déplacées vers la section choisie.
          </Text>

          <View style={styles.list}>
            {sections.map((section) => (
              <MobileButton
                key={section.id}
                mode={selectedSectionId === section.id ? 'contained' : 'outlined'}
                onPress={() => onSelect?.(section)}
                style={styles.choiceButton}
                contentStyle={styles.choiceButtonContent}
                buttonColor={
                  selectedSectionId === section.id ? chantierColors.primary : chantierColors.surface
                }
                textColor={selectedSectionId === section.id ? '#FFFFFF' : chantierColors.text}
              >
                {section.nom}
              </MobileButton>
            ))}
          </View>

          {onCreatePress ? (
            <MobileButton mode="outlined" onPress={onCreatePress} style={styles.createButton}>
              Nouvelle section
            </MobileButton>
          ) : null}

          <MobileButton mode="text" onPress={onDismiss} style={styles.cancelButton}>
            Annuler
          </MobileButton>
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
    maxHeight: '85%',
    overflow: 'hidden',
  },
  scroll: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
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
  list: {
    gap: 10,
  },
  choiceButton: {
    borderColor: chantierColors.border,
  },
  choiceButtonContent: {
    minHeight: 56,
  },
  createButton: {
    marginTop: 4,
    borderColor: chantierColors.border,
  },
  cancelButton: {
    alignSelf: 'center',
  },
});
