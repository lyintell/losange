import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import LosangeLogoLoader from './LosangeLogoLoader';
import { chantierColors } from '../../styles/theme';

export default function TerrainSyncOverlay({ visible = false }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <LosangeLogoLoader size="large" />
        <Text variant="titleMedium" style={styles.label}>
          Synchronisation…
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 24,
  },
  label: {
    marginTop: 20,
    color: chantierColors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
});
