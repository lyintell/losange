import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { chantierColors } from '../../styles/theme';

const TOUCHES = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'Effacer'];

export default function PaveNumerique({ onKeyPress, disabled = false }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.hint}>Saisie terrain sans clavier natif</Text>
      <View style={styles.grid}>
        {TOUCHES.map((keyValue) => (
          <Button
            key={keyValue}
            mode={keyValue === 'Effacer' ? 'outlined' : 'contained'}
            onPress={() => onKeyPress?.(keyValue)}
            disabled={disabled}
            buttonColor={keyValue === 'Effacer' ? chantierColors.surface : chantierColors.primary}
            textColor={keyValue === 'Effacer' ? chantierColors.text : '#FFFFFF'}
            style={styles.key}
            contentStyle={styles.keyContent}
            labelStyle={styles.keyLabel}
          >
            {keyValue}
          </Button>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: chantierColors.background,
    borderTopWidth: 1,
    borderTopColor: chantierColors.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
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
    minHeight: 58,
  },
  keyLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
});
