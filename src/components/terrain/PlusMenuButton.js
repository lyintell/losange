import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FAB_SIZES } from './TerrainFlowFabs';
import {
  MOBILE_BUTTON_MENU_FONT_SIZE,
  MOBILE_BUTTON_MIN_HEIGHT,
  chantierColors,
} from '../../styles/theme';

export default function PlusMenuButton({ icon, onPress, children, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : styles.buttonDefault,
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          <MaterialCommunityIcons
            name={icon}
            size={26}
            color={pressed ? '#FFFFFF' : chantierColors.primary}
            style={styles.icon}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.88}
            style={[styles.label, pressed ? styles.labelPressed : styles.labelDefault]}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  buttonDefault: {
    backgroundColor: chantierColors.surface,
    borderColor: chantierColors.primary,
  },
  buttonPressed: {
    backgroundColor: chantierColors.primary,
    borderColor: chantierColors.primary,
  },
  content: {
    minHeight: Math.max(FAB_SIZES.main, MOBILE_BUTTON_MIN_HEIGHT),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  icon: {
    flexShrink: 0,
  },
  label: {
    flexShrink: 1,
    fontWeight: '700',
    fontSize: MOBILE_BUTTON_MENU_FONT_SIZE,
    lineHeight: 24,
    textAlign: 'center',
  },
  labelDefault: {
    color: chantierColors.primary,
  },
  labelPressed: {
    color: '#FFFFFF',
  },
});
