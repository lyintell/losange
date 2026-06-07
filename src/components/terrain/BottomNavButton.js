import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chantierColors } from '../../styles/theme';

export default function BottomNavButton({
  mode = 'outlined',
  icon,
  children,
  onPress,
  disabled = false,
  loading = false,
  buttonColor,
  textColor,
  style,
}) {
  const isContained = mode === 'contained';
  const resolvedBg = isContained
    ? buttonColor || chantierColors.primary
    : chantierColors.surface;
  const resolvedBorder = buttonColor || chantierColors.primary;
  const resolvedContentColor =
    textColor || (isContained ? '#FFFFFF' : chantierColors.text);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isContained ? styles.buttonContained : styles.buttonOutlined,
        {
          backgroundColor: resolvedBg,
          borderColor: resolvedBorder,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={resolvedContentColor} style={styles.iconSlot} />
      ) : (
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={resolvedContentColor}
          style={styles.iconSlot}
        />
      )}
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[styles.label, { color: resolvedContentColor }]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  buttonOutlined: {
    borderWidth: 1,
    backgroundColor: chantierColors.surface,
  },
  buttonContained: {
    borderWidth: 1,
  },
  iconSlot: {
    flexShrink: 0,
  },
  label: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
});
