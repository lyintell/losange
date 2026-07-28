import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MobileButton from './MobileButton';
import { chantierColors } from '../../styles/theme';

const GESTURE_ITEMS = [
  {
    gestureIcon: 'gesture-tap',
    actionIcon: 'pencil',
    title: 'Clic simple',
    description: 'Ouvrir ou modifier un élément (ligne, chantier, client…).',
  },
  {
    gestureIcon: 'gesture-double-tap',
    actionIcon: 'content-copy',
    title: 'Double-clic — modifier relevé',
    description: 'Dupliquer une ligne (confirmation Oui / Non).',
  },
  {
    gestureIcon: 'gesture-double-tap',
    actionIcon: 'check-circle',
    title: 'Double-clic — détails chantier',
    description: 'Marquer / démarquer une ligne OK (compte Pro).',
  },
  {
    gestureIcon: 'gesture-tap-hold',
    actionIcon: 'delete-outline',
    title: 'Appui long — carte ligne',
    description: 'Supprimer une ligne dans le récap (confirmation Oui / Non).',
  },
  {
    gestureIcon: 'drag-vertical',
    actionIcon: 'swap-vertical',
    title: 'Appui long — poignée',
    description: 'Réordonner une ligne (ou un élément du catalogue).',
  },
  {
    gestureIcon: 'chevron-up',
    actionIcon: 'chevron-down',
    title: 'Flèches métier',
    description: 'Monter / descendre un métier dans le récap d’un relevé.',
  },
  {
    gestureIcon: 'gesture-swipe-down',
    actionIcon: 'sync',
    title: 'Tirer vers le bas',
    description: 'Actualiser une liste (sync cloud).',
  },
];

function LegendRow({ item }) {
  return (
    <View style={styles.row}>
      <View style={styles.icons}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={item.gestureIcon} size={22} color={chantierColors.primary} />
        </View>
        <MaterialCommunityIcons name="arrow-right" size={16} color={chantierColors.muted} />
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name={item.actionIcon} size={22} color={chantierColors.text} />
        </View>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowDescription}>{item.description}</Text>
      </View>
    </View>
  );
}

export default function GesturesLegendModal({ visible, onDismiss }) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>
          Légende des gestes
        </Text>
        <Text style={styles.subtitle}>Actions principales sur l’application terrain.</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {GESTURE_ITEMS.map((item) => (
            <LegendRow key={item.title} item={item} />
          ))}
        </ScrollView>
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
    marginHorizontal: 16,
    maxHeight: '86%',
    borderRadius: 14,
    padding: 18,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  subtitle: {
    color: chantierColors.muted,
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: chantierColors.border,
    paddingBottom: 12,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  rowDescription: {
    color: chantierColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
});
