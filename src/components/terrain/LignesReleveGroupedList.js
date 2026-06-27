import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import LigneReleveCard from './LigneReleveCard';
import { chantierColors } from '../../styles/theme';
import { groupLignesByMetier } from '../../utils/groupLignesByMetier';
import { groupLignesBySection } from '../../utils/groupLignesBySection';
import { isDefaultSectionNom } from '../../utils/defaultSection';
import { getMetierColor } from '../../utils/metierColors';

export function LignesReleveGroupedSections({
  lignes,
  variant = 'default',
  showPrices = false,
  sectionOrder = null,
  onLignePress,
  onLigneDoublePress,
  contentContainerStyle,
  ListEmptyComponent,
  ListFooterComponent,
  refreshControl,
}) {
  const sectionGroups = useMemo(
    () => groupLignesBySection(lignes, sectionOrder),
    [lignes, sectionOrder]
  );

  if (!lignes.length) {
    if (ListFooterComponent) {
      return (
        <ScrollView
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
        >
          {ListEmptyComponent}
          {ListFooterComponent}
        </ScrollView>
      );
    }
    return ListEmptyComponent || null;
  }

  return (
    <ScrollView
      style={styles.sectionsScroll}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.list}>
        {sectionGroups.map((group, index) => (
          <SectionGroupBlock
            key={group.sectionId}
            group={group}
            showSectionDivider={index > 0}
            variant={variant}
            showPrices={showPrices}
            onLignePress={onLignePress}
            onLigneDoublePress={onLigneDoublePress}
          />
        ))}
      </View>
      {ListFooterComponent}
    </ScrollView>
  );
}

function MetierSubHeader({ metierId, nom }) {
  const label = nom?.trim() || 'Autre';

  return (
    <Text variant="bodyLarge" style={[styles.metierTitle, { color: getMetierColor(metierId || label) }]}>
      {label}
    </Text>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

function SectionHeader({ group, onSectionPress }) {
  return (
    <Pressable
      onPress={onSectionPress ? () => onSectionPress(group.sectionId, group.sectionNom) : undefined}
      style={({ pressed }) => [styles.sectionHeaderPressable, pressed && styles.sectionHeaderPressed]}
      disabled={!onSectionPress}
    >
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {group.sectionNom}
      </Text>
      {onSectionPress ? (
        <MaterialCommunityIcons name="chevron-down" size={22} color={chantierColors.muted} />
      ) : null}
    </Pressable>
  );
}

function SectionGroupBlock({
  group,
  showSectionDivider = false,
  variant,
  showPrices,
  onLignePress,
  onLigneDoublePress,
  onSectionPress,
}) {
  const isDefaultSection = isDefaultSectionNom(group.sectionNom);
  const showMetierGroups = variant === 'recap' || variant === 'details';
  const metierGroups = useMemo(
    () => (showMetierGroups ? groupLignesByMetier(group.lignes) : []),
    [group.lignes, showMetierGroups]
  );

  const renderLigne = (ligne) => (
    <LigneReleveCard
      key={ligne.id}
      ligne={ligne}
      variant={variant}
      showPrices={showPrices}
      onPress={onLignePress ? () => onLignePress(ligne) : undefined}
      onDoublePress={onLigneDoublePress ? () => onLigneDoublePress(ligne) : undefined}
    />
  );

  return (
    <View style={styles.section}>
      {showSectionDivider ? <SectionDivider /> : null}
      {!isDefaultSection ? (
        <SectionHeader group={group} onSectionPress={onSectionPress} />
      ) : null}
      {showMetierGroups ? (
        metierGroups.map((metierGroup) => (
          <View key={metierGroup.metierId} style={styles.metierBlock}>
            <MetierSubHeader metierId={metierGroup.metierId} nom={metierGroup.metierNom} />
            <View style={styles.cards}>{metierGroup.lignes.map(renderLigne)}</View>
          </View>
        ))
      ) : (
        <View style={styles.cards}>{group.lignes.map(renderLigne)}</View>
      )}
    </View>
  );
}

function RecapDraggableLigneItem({
  item,
  variant,
  showPrices,
  onLignePress,
  onLigneDoublePress,
  drag,
  isActive,
}) {
  return (
    <ScaleDecorator>
      <View style={[styles.ligneRow, isActive && styles.ligneDragging]}>
        <Pressable onLongPress={drag} delayLongPress={120} style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag-vertical" size={24} color={chantierColors.muted} />
        </Pressable>
        <View style={styles.ligneCardFlex}>
          <LigneReleveCard
            ligne={item}
            variant={variant}
            showPrices={showPrices}
            onPress={onLignePress ? () => onLignePress(item) : undefined}
            onDoublePress={onLigneDoublePress ? () => onLigneDoublePress(item) : undefined}
          />
        </View>
      </View>
    </ScaleDecorator>
  );
}

function SectionGroupBlockWithDrag({
  group,
  showSectionDivider = false,
  variant,
  showPrices,
  onLignePress,
  onLigneDoublePress,
  onSectionPress,
  onLigneReorder,
}) {
  const isDefaultSection = isDefaultSectionNom(group.sectionNom);
  const showMetierGroups = variant === 'recap' || variant === 'details';
  const metierGroups = useMemo(
    () => (showMetierGroups ? groupLignesByMetier(group.lignes) : []),
    [group.lignes, showMetierGroups]
  );
  const [localLignes, setLocalLignes] = useState(group.lignes);
  const [localMetierLignes, setLocalMetierLignes] = useState(() =>
    Object.fromEntries(metierGroups.map((metierGroup) => [metierGroup.metierId, metierGroup.lignes]))
  );

  useEffect(() => {
    setLocalLignes(group.lignes);
    if (showMetierGroups) {
      const nextGroups = groupLignesByMetier(group.lignes);
      setLocalMetierLignes(
        Object.fromEntries(nextGroups.map((metierGroup) => [metierGroup.metierId, metierGroup.lignes]))
      );
    }
  }, [group.lignes, showMetierGroups]);

  const mergeMetierLignes = (nextByMetier) => {
    return metierGroups.flatMap((metierGroup) => nextByMetier[metierGroup.metierId] || metierGroup.lignes);
  };

  const handleMetierDragEnd = (metierId, data) => {
    const nextByMetier = { ...localMetierLignes, [metierId]: data };
    setLocalMetierLignes(nextByMetier);
    const merged = mergeMetierLignes(nextByMetier);
    setLocalLignes(merged);
    onLigneReorder?.(group.sectionId, merged);
  };

  const handleSectionDragEnd = ({ data }) => {
    setLocalLignes(data);
    onLigneReorder?.(group.sectionId, data);
  };

  return (
    <View style={styles.section}>
      {showSectionDivider ? <SectionDivider /> : null}
      {!isDefaultSection ? (
        <SectionHeader group={group} onSectionPress={onSectionPress} />
      ) : null}
      {showMetierGroups ? (
        metierGroups.map((metierGroup) => (
          <View key={metierGroup.metierId} style={styles.metierBlock}>
            <MetierSubHeader metierId={metierGroup.metierId} nom={metierGroup.metierNom} />
            <DraggableFlatList
              data={localMetierLignes[metierGroup.metierId] || metierGroup.lignes}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              activationDistance={8}
              onDragEnd={({ data }) => handleMetierDragEnd(metierGroup.metierId, data)}
              contentContainerStyle={styles.cards}
              renderItem={({ item, drag, isActive }) => (
                <RecapDraggableLigneItem
                  item={item}
                  variant={variant}
                  showPrices={showPrices}
                  onLignePress={onLignePress}
                  onLigneDoublePress={onLigneDoublePress}
                  drag={drag}
                  isActive={isActive}
                />
              )}
            />
          </View>
        ))
      ) : (
        <DraggableFlatList
          data={localLignes}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          activationDistance={8}
          onDragEnd={handleSectionDragEnd}
          contentContainerStyle={styles.cards}
          renderItem={({ item, drag, isActive }) => (
            <RecapDraggableLigneItem
              item={item}
              variant={variant}
              showPrices={showPrices}
              onLignePress={onLignePress}
              onLigneDoublePress={onLigneDoublePress}
              drag={drag}
              isActive={isActive}
            />
          )}
        />
      )}
    </View>
  );
}

export function LignesReleveGroupedList({
  lignes = [],
  variant = 'default',
  showPrices = false,
  onLignePress,
  onLigneDoublePress,
  style,
  groupBySection = false,
  sectionOrder = null,
  enableLigneDrag = false,
  onLigneReorder,
  onSectionPress,
  contentPaddingBottom = 0,
}) {
  const safeLignes = Array.isArray(lignes) ? lignes : [];
  const sectionGroups = useMemo(
    () => (groupBySection ? groupLignesBySection(safeLignes, sectionOrder) : []),
    [groupBySection, safeLignes, sectionOrder]
  );
  const metierGroups = useMemo(
    () => (!groupBySection ? groupLignesByMetier(safeLignes) : []),
    [groupBySection, safeLignes]
  );

  if (groupBySection) {
    if (!safeLignes.length) return null;

    if (enableLigneDrag && onLigneReorder) {
      return (
        <ScrollView
          style={[styles.draggableScroll, style]}
          contentContainerStyle={[
            styles.draggableContent,
            contentPaddingBottom ? { paddingBottom: contentPaddingBottom } : null,
          ]}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          {sectionGroups.map((group, index) => (
            <SectionGroupBlockWithDrag
              key={group.sectionId}
              group={group}
              showSectionDivider={index > 0}
              variant={variant}
              showPrices={showPrices}
              onLignePress={onLignePress}
              onLigneDoublePress={onLigneDoublePress}
              onSectionPress={onSectionPress}
              onLigneReorder={onLigneReorder}
            />
          ))}
        </ScrollView>
      );
    }

    return (
      <View style={[styles.list, style]}>
        {sectionGroups.map((group, index) => (
          <SectionGroupBlock
            key={group.sectionId}
            group={group}
            showSectionDivider={index > 0}
            variant={variant}
            showPrices={showPrices}
            onLignePress={onLignePress}
            onLigneDoublePress={onLigneDoublePress}
            onSectionPress={onSectionPress}
          />
        ))}
      </View>
    );
  }

  if (!metierGroups.length) return null;

  return (
    <View style={[styles.list, style]}>
      {metierGroups.map((group) => (
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
  sectionsScroll: {
    flex: 1,
  },
  list: {
    gap: 16,
    width: '100%',
  },
  draggableScroll: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  draggableContent: {
    gap: 16,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  sectionDivider: {
    borderTopWidth: 2,
    borderTopColor: chantierColors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  ligneDragging: {
    opacity: 0.92,
  },
  sectionHeaderPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  sectionHeaderPressed: {
    opacity: 0.75,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 18,
    flex: 1,
  },
  metierBlock: {
    gap: 6,
    marginTop: 4,
  },
  metierTitle: {
    fontWeight: '800',
    fontSize: 16,
    paddingLeft: 4,
  },
  dragHandle: {
    paddingVertical: 8,
    paddingRight: 4,
    justifyContent: 'center',
  },
  ligneRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 4,
    marginBottom: 10,
  },
  ligneCardFlex: {
    flex: 1,
    minWidth: 0,
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
