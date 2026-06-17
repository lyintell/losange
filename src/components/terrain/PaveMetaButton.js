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
  style,
}) {
  const backgroundColor = active ? '#E8F4FD' : chantierColors.surface;
  const contentColor = active ? chantierColors.primary : chantierColors.text;
  const borderColor = active ? chantierColors.primary : chantierColors.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        iconOnly && styles.buttonIconOnly,
        {
          backgroundColor,
          borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={contentColor} />
      {iconOnly ? null : (
        <Text numberOfLines={1} style={[styles.label, { color: contentColor }]}>
          {children}
        </Text>
      )}
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
});
