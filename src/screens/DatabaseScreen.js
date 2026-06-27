import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LosangeLogoBackground } from '../components/terrain/LosangeLogoLoader';
import PlusMenuButton from '../components/terrain/PlusMenuButton';
import { getLoggedInProfilViewLocal } from '../db/querries';
import {
  canAccessDatabaseMetiers,
  canAccessDatabaseOuvrages,
  canAccessDatabaseSections,
} from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';

export default function DatabaseScreen({
  onListeClientsPress,
  onListeMetiersPress,
  onListeSectionsPress,
  onListeOuvragesPress,
}) {
  const [canShowMetiers, setCanShowMetiers] = useState(false);
  const [canShowSections, setCanShowSections] = useState(false);
  const [canShowOuvrages, setCanShowOuvrages] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanShowMetiers(canAccessDatabaseMetiers(profil));
          setCanShowSections(canAccessDatabaseSections(profil));
          setCanShowOuvrages(canAccessDatabaseOuvrages(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces base de donnees:', error);
        if (!cancelled) {
          setCanShowMetiers(false);
          setCanShowSections(false);
          setCanShowOuvrages(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

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

        {canShowMetiers ? (
          <PlusMenuButton icon="hard-hat" onPress={onListeMetiersPress}>
            Métiers
          </PlusMenuButton>
        ) : null}

        {canShowSections ? (
          <PlusMenuButton icon="view-grid" onPress={onListeSectionsPress}>
            Sections
          </PlusMenuButton>
        ) : null}

        {canShowOuvrages ? (
          <PlusMenuButton icon="hammer-wrench" onPress={onListeOuvragesPress}>
            Ouvrages / Articles
          </PlusMenuButton>
        ) : null}
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
