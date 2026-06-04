import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar, Text, TextInput } from 'react-native-paper';
import { FlowBackFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { getDraftDimensionFlow } from '../db/mockData';
import { searchClientsLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';

export default function ClientChantierFormScreen({
  entrepriseId,
  onBack,
  onNext,
  onNavHandlersChange,
}) {
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const [clientNom, setClientNom] = useState('');
  const [clientTelephone, setClientTelephone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [chantierNom, setChantierNom] = useState('');
  const [chantierAdresse, setChantierAdresse] = useState('');
  const [chantierNotes, setChantierNotes] = useState('');
  const [chantierStatus, setChantierStatus] = useState('D');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const draft = getDraftDimensionFlow();
    if (!draft?.chantierId) return;

    if (draft.clientId) setSelectedClientId(draft.clientId);
    if (draft.clientNom) setClientNom(draft.clientNom);
    if (draft.clientTelephone) setClientTelephone(draft.clientTelephone);
    if (draft.chantierNom) setChantierNom(draft.chantierNom);
    if (draft.chantierAdresse) setChantierAdresse(draft.chantierAdresse);
    if (draft.chantierNotes) setChantierNotes(draft.chantierNotes);
    if (draft.chantierStatus) setChantierStatus(draft.chantierStatus);
  }, []);

  const isFormValid =
    Boolean(clientNom.trim()) && Boolean(clientTelephone.trim()) && Boolean(chantierNom.trim());

  const runSearch = useCallback(async (query) => {
    if (!entrepriseId || !query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const results = await searchClientsLocal(entrepriseId, query);
      setSearchResults(results || []);
    } catch (error) {
      console.error('Erreur recherche clients:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, runSearch]);

  const handleSelectClient = (client) => {
    setSelectedClientId(client.id);
    setClientNom(client.nom_complet || '');
    setClientTelephone(client.telephone_1 || '');
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClientNomChange = (value) => {
    setClientNom(value);
    setSelectedClientId(null);
  };

  const handleClientTelephoneChange = (value) => {
    setClientTelephone(value);
    setSelectedClientId(null);
  };

  const buildPayload = () => ({
    clientId: selectedClientId,
    clientNom: clientNom.trim(),
    clientTelephone: clientTelephone.trim(),
    chantierNom: chantierNom.trim(),
    chantierAdresse: chantierAdresse.trim(),
    chantierStatus,
    chantierNotes: chantierNotes.trim(),
  });

  const performSave = useCallback(async () => {
    if (!isFormValid || saving) return;

    try {
      setSaving(true);
      await onNextRef.current?.(buildPayload());
    } catch (error) {
      console.error('Erreur enregistrement client/chantier:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer le client et le chantier.");
    } finally {
      setSaving(false);
    }
  }, [isFormValid, saving, clientNom, clientTelephone, selectedClientId, chantierNom, chantierAdresse, chantierNotes, chantierStatus]);

  const confirmSave = useCallback(() => {
    if (!isFormValid) return;
    Alert.alert(
      'Enregistrer',
      'Confirmer l enregistrement du client et du chantier?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Oui', onPress: () => performSave() },
      ]
    );
  }, [isFormValid, performSave]);

  useEffect(() => {
    if (!onNavHandlersChange) return undefined;

    onNavHandlersChange({
      onSave: confirmSave,
      saveDisabled: !isFormValid,
      saving,
    });

    return () => onNavHandlersChange(null);
  }, [onNavHandlersChange, confirmSave, isFormValid, saving]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Client et chantier
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.formContent, { paddingBottom: getFabColumnPadding(0) + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Client
        </Text>

        <Searchbar
          placeholder="Rechercher par nom ou telephone"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
          loading={searching}
        />

        {!entrepriseId ? (
          <Text style={styles.hintText}>Entreprise indisponible pour la recherche client.</Text>
        ) : null}

        {searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((client) => (
              <Pressable
                key={client.id}
                onPress={() => handleSelectClient(client)}
                style={({ pressed }) => [styles.searchResultRow, pressed && styles.searchResultPressed]}
              >
                <Text style={styles.searchResultName}>{client.nom_complet}</Text>
                <Text style={styles.searchResultPhone}>{client.telephone_1}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label="Nom du client"
          value={clientNom}
          onChangeText={handleClientNomChange}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Telephone"
          value={clientTelephone}
          onChangeText={handleClientTelephoneChange}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text variant="titleMedium" style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Chantier
        </Text>

        <TextInput
          mode="outlined"
          label="Nom du chantier"
          value={chantierNom}
          onChangeText={setChantierNom}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Adresse"
          value={chantierAdresse}
          onChangeText={setChantierAdresse}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Notes"
          value={chantierNotes}
          onChangeText={setChantierNotes}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.notesInput]}
        />
      </ScrollView>

      <FlowBackFab onPress={onBack} smallCountBelow={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
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
  formContent: {
    gap: 10,
    paddingTop: 4,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  sectionTitleSpaced: {
    marginTop: 8,
  },
  searchBar: {
    backgroundColor: chantierColors.surface,
  },
  hintText: {
    color: chantierColors.muted,
    fontSize: 14,
  },
  searchResults: {
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: chantierColors.surface,
  },
  searchResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
  },
  searchResultPressed: {
    backgroundColor: '#FFF5F1',
  },
  searchResultName: {
    color: chantierColors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  searchResultPhone: {
    color: chantierColors.muted,
    marginTop: 2,
    fontSize: 14,
  },
  input: {
    backgroundColor: chantierColors.surface,
  },
  notesInput: {
    minHeight: 110,
  },
});
