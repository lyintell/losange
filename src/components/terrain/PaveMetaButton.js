import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chantierColors } from '../../styles/theme';

export default function PaveMetaButton({
  icon,
  children,
  onPress,
  active = false,
  disabled = false,
  iconOnly = false,
  tile = false,
  style,
}) {
  const backgroundColor = active ? '#E8F4FD' : chantierColors.surface;
  const contentColor = active ? chantierColors.primary : chantierColors.text;
  const borderColor = active ? chantierColors.primary : chantierColors.border;
  const showLabel = Boolean(children) && !iconOnly;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        iconOnly && styles.buttonIconOnly,
        tile && styles.buttonTile,
        showLabel && !tile && styles.buttonWithLabel,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={tile ? 24 : 22} color={contentColor} />
      {showLabel ? (
        <Text
          numberOfLines={1}
          style={[tile ? styles.tileLabel : styles.label, { color: contentColor }]}
        >
          {children}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    maxWidth: 180,
    minHeight: 58,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  buttonWithLabel: {
    maxWidth: 220,
  },
  buttonTile: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    minHeight: 64,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  buttonIconOnly: {
    maxWidth: 58,
    minWidth: 58,
    minHeight: 58,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'left',
  },
  tileLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
