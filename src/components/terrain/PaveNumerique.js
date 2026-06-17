import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MobileButton from './MobileButton';
import { chantierColors, mobileKeypadButtonLabelStyle } from '../../styles/theme';

const TOUCHES = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'Effacer'];

export default function PaveNumerique({
  onKeyPress,
  disabled = false,
  measuresLine = '',
  hintText = '',
  placement = 'bottom',
}) {
  const wrapperStyle = placement === 'top' ? styles.wrapperTop : styles.wrapperBottom;

  return (
    <View style={wrapperStyle}>
      {measuresLine ? (
        <Text style={styles.measuresLine}>{measuresLine}</Text>
      ) : null}
      {hintText ? <Text style={styles.hint}>{hintText}</Text> : null}
      <View style={styles.grid}>
        {TOUCHES.map((keyValue) => {
          const isBackspace = keyValue === 'Effacer';
          return (
            <MobileButton
              key={keyValue}
              mode={isBackspace ? 'outlined' : 'contained'}
              onPress={() => onKeyPress?.(keyValue)}
              disabled={disabled}
              buttonColor={isBackspace ? chantierColors.surface : chantierColors.primary}
              textColor={isBackspace ? chantierColors.text : '#FFFFFF'}
              style={styles.key}
              contentStyle={styles.keyContent}
              labelStyle={isBackspace ? undefined : mobileKeypadButtonLabelStyle}
              icon={
                isBackspace
                  ? ({ size, color }) => (
                      <MaterialCommunityIcons name="backspace-outline" size={size + 4} color={color} />
                    )
                  : undefined
              }
            >
              {isBackspace ? '' : keyValue}
            </MobileButton>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperBottom: {
    width: '100%',
    backgroundColor: chantierColors.background,
    borderTopWidth: 1,
    borderTopColor: chantierColors.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  wrapperTop: {
    width: '100%',
    backgroundColor: chantierColors.background,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    paddingTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  measuresLine: {
    textAlign: 'center',
    color: chantierColors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  hint: {
    textAlign: 'center',
    color: chantierColors.muted,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  key: {
    width: '31.5%',
    borderColor: chantierColors.border,
  },
  keyContent: {
    minHeight: 60,
  },
});
