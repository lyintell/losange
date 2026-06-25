import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import {
  getNextReleveStatusOnDoubleTap,
  getReleveStatusColor,
  getReleveStatusLabel,
} from '../../utils/releveStatus';

const DOUBLE_PRESS_DELAY_MS = 350;

export default function ReleveStatutBadge({ status, onStatusChange, disabled = false }) {
  const bgColor = getReleveStatusColor(status);
  const label = getReleveStatusLabel(status);
  const pressCountRef = useRef(0);
  const pressTimerRef = useRef(null);
  const interactive = Boolean(onStatusChange) && !disabled;

  useEffect(
    () => () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    },
    []
  );

  const handlePress = () => {
    if (!interactive) return;

    pressCountRef.current += 1;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    pressTimerRef.current = setTimeout(() => {
      const pressCount = pressCountRef.current;
      pressCountRef.current = 0;
      pressTimerRef.current = null;

      if (pressCount >= 2) {
        onStatusChange?.(getNextReleveStatusOnDoubleTap(status));
      }
    }, DOUBLE_PRESS_DELAY_MS);
  };

  const badge = (
    <View style={[styles.badge, { backgroundColor: bgColor }, disabled && styles.badgeDisabled]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );

  if (!interactive) {
    return badge;
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.badgePressed]}
    >
      {badge}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDisabled: {
    opacity: 0.65,
  },
  badgePressed: {
    opacity: 0.85,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
});
