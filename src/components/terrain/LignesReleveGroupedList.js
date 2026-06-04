import React, { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import LigneReleveCard from './LigneReleveCard';
import { chantierColors } from '../../styles/theme';
import { groupLignesByMetier } from '../../utils/groupLignesByMetier';

export function LignesReleveGroupedSections({
  lignes,
  variant = 'default',
  showPrices = false,
  onLignePress,
  onLigneDoublePress,
  contentContainerStyle,
  ListEmptyComponent,
  refreshControl,
}) {
  const sections = useMemo(
    () =>
      groupLignesByMetier(lignes).map((group) => ({
        metierId: group.metierId,
        title: group.metierNom,
        data: group.lignes,
      })),
    [lignes]
  );

  if (!sections.length) {
    return ListEmptyComponent || null;
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
      renderSectionHeader={({ section }) => (
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <LigneReleveCard
          ligne={item}
          variant={variant}
          showPrices={showPrices}
          onPress={onLignePress ? () => onLignePress(item) : undefined}
          onDoublePress={onLigneDoublePress ? () => onLigneDoublePress(item) : undefined}
        />
      )}
      SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
      ItemSeparatorComponent={() => <View style={styles.itemGap} />}
    />
  );
}

export function LignesReleveGroupedList({ lignes, variant = 'default', showPrices = false, onLignePress, onLigneDoublePress, style }) {
  const groups = useMemo(() => groupLignesByMetier(lignes), [lignes]);

  if (!groups.length) return null;

  return (
    <View style={[styles.list, style]}>
      {groups.map((group) => (
        <View key={group.metierId} style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {group.metierNom}
          </Text>
          <View style={styles.cards}>
            {group.lignes.map((ligne) => (
              <LigneReleveCard
                key={ligne.id}
                ligne={ligne}
                variant={variant}
                showPrices={showPrices}
                onPress={onLignePress ? () => onLignePress(ligne) : undefined}
                onDoublePress={onLigneDoublePress ? () => onLigneDoublePress(ligne) : undefined}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 18,
  },
  cards: {
    gap: 10,
  },
  sectionGap: {
    height: 16,
  },
  itemGap: {
    height: 10,
  },
});
