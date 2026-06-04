import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { chantierColors } from '../../styles/theme';
import {
  formatLigneMesures,
  formatLigneQuantiteAffichage,
  formatMontant,
  getLigneNomUnite,
  getLignePrixUnitaireAffichage,
  getLignePrixUnitaireApplique,
} from '../../utils/formatLigneMesures';

const DOUBLE_PRESS_DELAY_MS = 350;

const isLigneComplete = (ligne) => Number(ligne?.ind_complete) === 1;

export default function LigneReleveCard({
  ligne,
  variant = 'default',
  showPrices = false,
  onPress,
  onDoublePress,
}) {
  const nomUnite = getLigneNomUnite(ligne);
  const hasNote = Boolean(ligne?.note?.trim());
  const isDetails = variant === 'details';
  const isRecap = variant === 'recap';
  const isDetailsLayout = isDetails || isRecap;
  const completed = isDetails && isLigneComplete(ligne);

  const pressCountRef = useRef(0);
  const pressTimerRef = useRef(null);

  useEffect(
    () => () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    },
    []
  );

  const handlePress = () => {
    if (!onPress && !onDoublePress) return;

    pressCountRef.current += 1;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      const pressCount = pressCountRef.current;
      pressCountRef.current = 0;
      pressTimerRef.current = null;

      if (pressCount >= 2) {
        onDoublePress?.();
      } else if (pressCount === 1) {
        onPress?.();
      }
    }, DOUBLE_PRESS_DELAY_MS);
  };

  const ouvrageLabel = `${ligne.ouvrage_nom || 'Ouvrage'}${isDetailsLayout && hasNote ? ' **' : ''}`;

  const quantiteLabel = `Qté ${formatLigneQuantiteAffichage(ligne)}${nomUnite ? ` ${nomUnite}` : ''}`;
  const prixUnitaireLabel = isRecap
    ? `P.U. ${formatMontant(getLignePrixUnitaireApplique(ligne))}`
    : `P.U. ${formatMontant(getLignePrixUnitaireAffichage(ligne))}`;
  const showPrixUnitaire = isRecap || (isDetails && showPrices);

  const cardBody = (
    <>
      {completed ? (
        <View style={styles.watermarkWrap} pointerEvents="none">
          <Text style={styles.watermarkOk}>OK</Text>
        </View>
      ) : null}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.ouvrage}>
            {ouvrageLabel}
          </Text>
          <Text style={styles.quantite}>{quantiteLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.mesures}>{formatLigneMesures(ligne)}</Text>
          {isDetailsLayout ? (
            <Text
              style={[styles.prixUnitaire, !showPrixUnitaire && styles.prixUnitaireHidden]}
              numberOfLines={1}
            >
              {showPrixUnitaire ? prixUnitaireLabel : ' '}
            </Text>
          ) : null}
        </View>
        {!isDetailsLayout && hasNote ? (
          <Text style={styles.note} numberOfLines={3}>
            {ligne.note}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (onPress || onDoublePress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {cardBody}
      </Pressable>
    );
  }

  return <View style={styles.card}>{cardBody}</View>;
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: chantierColors.border,
    padding: 14,
  },
  cardPressed: {
    backgroundColor: '#FFF5F1',
  },
  watermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  watermarkOk: {
    color: chantierColors.success,
    opacity: 0.28,
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 4,
  },
  content: {
    gap: 6,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  ouvrage: {
    flex: 1,
    color: chantierColors.text,
    fontWeight: '800',
    minWidth: 0,
  },
  quantite: {
    flexShrink: 0,
    color: chantierColors.muted,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'right',
  },
  mesures: {
    flex: 1,
    color: chantierColors.text,
    fontSize: 22,
    fontWeight: '900',
    minWidth: 0,
  },
  prixUnitaire: {
    flexShrink: 0,
    color: chantierColors.muted,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'right',
  },
  prixUnitaireHidden: {
    opacity: 0,
  },
  note: {
    color: chantierColors.muted,
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
