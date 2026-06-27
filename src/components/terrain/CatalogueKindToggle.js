import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { chantierColors } from '../../styles/theme';

export default function CatalogueKindToggle({ value = 'ouvrage', onChange }) {
  return (
    <View style={styles.toggleRow}>
      <Pressable
        onPress={() => onChange?.('ouvrage')}
        style={[styles.toggleButton, value === 'ouvrage' && styles.toggleButtonActive]}
      >
        <Text style={[styles.toggleLabel, value === 'ouvrage' && styles.toggleLabelActive]}>
          Ouvrage
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange?.('article')}
        style={[styles.toggleButton, value === 'article' && styles.toggleButtonActive]}
      >
        <Text style={[styles.toggleLabel, value === 'article' && styles.toggleLabelActive]}>
          Article
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: chantierColors.primary,
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: chantierColors.primary,
  },
  toggleLabel: {
    color: chantierColors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
});
