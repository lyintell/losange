import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chantierColors } from '../../styles/theme';

export const FAB_SIZES = {
  main: 70,
  small: 50,
  gap: 6,
  base: 8,
};

/** Distance from screen bottom for a small FAB (tier 0 = lowest). */
export const getSmallFabBottom = (tierFromBottom = 0) =>
  FAB_SIZES.base + tierFromBottom * (FAB_SIZES.small + FAB_SIZES.gap);

/** Distance from screen bottom for a main FAB sitting above `smallCountBelow` small FABs. */
export const getMainFabBottom = (smallCountBelow = 1) =>
  FAB_SIZES.base + smallCountBelow * (FAB_SIZES.small + FAB_SIZES.gap);

/** Content padding so scroll areas clear a right FAB column. */
export const getFabColumnPadding = (smallCountBelow = 1) =>
  getMainFabBottom(smallCountBelow) + FAB_SIZES.main + FAB_SIZES.gap;

/** Horizontal inset so center content sits between left/right main FABs. */
export const FAB_HORIZONTAL_INSET = FAB_SIZES.main + 22;

/** Reserved height for the bottom FAB row + side columns. */
export const getFabActionZoneHeight = (smallCountBelow = 2) =>
  getFabColumnPadding(smallCountBelow);

export function FlowBackFab({
  onPress,
  color = '#9CA3AF',
  side = 'right',
  smallCountBelow = 1,
}) {
  const isLeft = side === 'left';
  return (
    <View
      style={[
        isLeft ? styles.wrapperLeft : styles.wrapperRight,
        { bottom: getMainFabBottom(smallCountBelow) },
      ]}
    >
      <FAB
        icon="arrow-left"
        style={[styles.mainFab, isLeft ? styles.mainFabLeft : styles.mainFabRight, { backgroundColor: color }]}
        color="#FFFFFF"
        customSize={FAB_SIZES.main}
        onPress={onPress}
      />
    </View>
  );
}

export function FlowCancelFab({ onPress, tierFromBottom = 0, side = 'right' }) {
  const isLeft = side === 'left';
  return (
    <FAB
      icon="close"
      style={[
        styles.smallFab,
        isLeft ? styles.smallFabLeft : styles.smallFabRight,
        { bottom: getSmallFabBottom(tierFromBottom), backgroundColor: flowFabColors.cancel },
      ]}
      color="#FFFFFF"
      customSize={FAB_SIZES.small}
      onPress={onPress}
    />
  );
}

export function FlowActionFab({
  icon,
  onPress,
  color,
  iconColor = '#FFFFFF',
  side = 'right',
  disabled = false,
  allowPressWhenDisabled = false,
  loading = false,
  smallCountBelow = 1,
}) {
  const isLeft = side === 'left';
  const isDisabled = Boolean(disabled);
  const renderIcon = ({ size }) => (
    <MaterialCommunityIcons name={icon} size={size} color={iconColor} />
  );

  return (
    <View
      style={[
        isLeft ? styles.wrapperLeft : styles.wrapperRight,
        { bottom: getMainFabBottom(smallCountBelow) },
      ]}
    >
      <FAB
        icon={renderIcon}
        style={[
          styles.mainFab,
          isLeft ? styles.mainFabLeft : styles.mainFabRight,
          { backgroundColor: color },
          isDisabled && styles.fabDisabled,
        ]}
        customSize={FAB_SIZES.main}
        onPress={isDisabled && !allowPressWhenDisabled ? () => {} : onPress}
        loading={loading}
      />
    </View>
  );
}

export function FlowSmallFab({
  icon,
  onPress,
  color = '#9CA3AF',
  iconColor = '#FFFFFF',
  tierFromBottom = 0,
  side = 'right',
  disabled = false,
  preserveOpacityWhenDisabled = false,
}) {
  const isLeft = side === 'left';
  const isDisabled = Boolean(disabled);
  const renderIcon =
    typeof icon === 'string'
      ? ({ size }) => <MaterialCommunityIcons name={icon} size={size} color={iconColor} />
      : icon;

  return (
    <FAB
      icon={renderIcon}
      style={[
        styles.smallFab,
        isLeft ? styles.smallFabLeft : styles.smallFabRight,
        { bottom: getSmallFabBottom(tierFromBottom), backgroundColor: color },
        isDisabled && preserveOpacityWhenDisabled && styles.fabDisabled,
      ]}
      color={iconColor}
      customSize={FAB_SIZES.small}
      onPress={isDisabled ? () => {} : onPress}
      disabled={preserveOpacityWhenDisabled ? false : isDisabled}
    />
  );
}

export const flowFabColors = {
  primary: '#FF5722',
  blue: '#1D4ED8',
  danger: chantierColors.danger,
  muted: '#9CA3AF',
  cancel: '#000000',
};

const styles = StyleSheet.create({
  wrapperRight: {
    position: 'absolute',
    right: 0,
  },
  wrapperLeft: {
    position: 'absolute',
    left: 0,
  },
  mainFab: {
    borderRadius: 999,
  },
  mainFabRight: {
    right: 14,
  },
  mainFabLeft: {
    left: 14,
  },
  smallFab: {
    position: 'absolute',
    borderRadius: 999,
  },
  smallFabRight: {
    right: 24,
  },
  smallFabLeft: {
    left: 24,
  },
  fabDisabled: {
    opacity: 0.45,
  },
});
