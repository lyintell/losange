import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LosangeLogoBackground } from '../components/terrain/LosangeLogoLoader';
import PlusMenuButton from '../components/terrain/PlusMenuButton';
import { chantierColors } from '../styles/theme';

export default function DatabaseScreen({ onListeClientsPress, onListeMetiersPress, onListeOuvragesPress }) {
  return (
    <View style={styles.container}>
      <LosangeLogoBackground opacity={0.1} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Base de données
          </Text>
        </View>

        <PlusMenuButton icon="account-group" onPress={onListeClientsPress}>
          Clients
        </PlusMenuButton>

        <PlusMenuButton icon="hard-hat" onPress={onListeMetiersPress}>
          Métiers
        </PlusMenuButton>

        <PlusMenuButton icon="hammer-wrench" onPress={onListeOuvragesPress}>
          Ouvrages
        </PlusMenuButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    zIndex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 8,
  },
});
