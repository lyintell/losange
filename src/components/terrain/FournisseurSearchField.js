import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { searchFournisseursLocal } from '../../db/querries';
import { chantierColors } from '../../styles/theme';
import {
  findExactFournisseurMatch,
  formatFournisseurSubtitle,
  normalizeFournisseurNom,
} from '../../utils/fournisseurSearch';

export default function FournisseurSearchField({
  metierId,
  entrepriseId,
  fournisseurNom,
  selectedFournisseurId,
  onFournisseurNomChange,
  onSelectFournisseur,
  onClearSelection,
  onSearchResultsChange,
  disabled = false,
  visible = true,
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const updateSearchResults = useCallback(
    (results) => {
      setSearchResults(results);
      onSearchResultsChange?.(results);
    },
    [onSearchResultsChange]
  );

  const runSearch = useCallback(
    async (query) => {
      if (!visible || !metierId || !entrepriseId || !query.trim()) {
        updateSearchResults([]);
        return;
      }
      try {
        setSearching(true);
        const results = await searchFournisseursLocal(metierId, entrepriseId, query);
        updateSearchResults(results || []);
      } catch (searchError) {
        console.error('Erreur recherche fournisseurs:', searchError);
        updateSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [visible, metierId, entrepriseId, updateSearchResults]
  );

  useEffect(() => {
    if (!visible || !showDropdown) return undefined;
    const timer = setTimeout(() => runSearch(fournisseurNom), 300);
    return () => clearTimeout(timer);
  }, [fournisseurNom, runSearch, showDropdown, visible]);

  useEffect(() => {
    if (!visible) {
      updateSearchResults([]);
      setShowDropdown(false);
    }
  }, [visible, updateSearchResults]);

  const trimmedNom = fournisseurNom.trim();
  const exactMatch = findExactFournisseurMatch(searchResults, trimmedNom);
  const showCreateOption = Boolean(trimmedNom) && !exactMatch && !selectedFournisseurId;
  const showPanel = showDropdown && (searching || searchResults.length > 0 || showCreateOption);

  const handleNomChange = (value) => {
    onClearSelection?.();
    onFournisseurNomChange(value);
    setShowDropdown(true);
  };

  const handleSelect = (fournisseur) => {
    onSelectFournisseur(fournisseur);
    updateSearchResults([]);
    setShowDropdown(false);
  };

  const handleCreateOption = () => {
    onClearSelection?.();
    setShowDropdown(false);
  };

  const handleFocus = () => {
    setShowDropdown(true);
    if (trimmedNom) {
      runSearch(fournisseurNom);
    }
  };

  return (
    <>
      <TextInput
        mode="outlined"
        label="Fournisseur (optionnel)"
        placeholder="Rechercher ou saisir un nom"
        value={fournisseurNom}
        onChangeText={handleNomChange}
        onFocus={handleFocus}
        style={styles.input}
        disabled={disabled}
        right={
          searching ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={18} color={chantierColors.primary} />} />
          ) : undefined
        }
      />

      {exactMatch && !selectedFournisseurId ? (
        <Text style={styles.hintText}>Fournisseur existant — sélectionnez-le dans la liste.</Text>
      ) : null}

      {showPanel ? (
        <View style={styles.searchResults}>
          {searching && searchResults.length === 0 ? (
            <View style={styles.searchResultRow}>
              <Text style={styles.searchResultPhone}>Recherche…</Text>
            </View>
          ) : null}

          {searchResults.map((fournisseur) => {
            const isExactMatch =
              normalizeFournisseurNom(fournisseur.nom) === normalizeFournisseurNom(trimmedNom);
            const isSelected =
              selectedFournisseurId === fournisseur.id || (isExactMatch && !selectedFournisseurId);

            return (
              <Pressable
                key={fournisseur.id}
                onPress={() => handleSelect(fournisseur)}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  isSelected && styles.searchResultRowSelected,
                  pressed && styles.searchResultPressed,
                ]}
              >
                <Text style={styles.searchResultName}>{fournisseur.nom}</Text>
                {formatFournisseurSubtitle(fournisseur) ? (
                  <Text style={styles.searchResultPhone}>{formatFournisseurSubtitle(fournisseur)}</Text>
                ) : null}
              </Pressable>
            );
          })}

          {showCreateOption ? (
            <Pressable
              onPress={handleCreateOption}
              style={({ pressed }) => [
                styles.searchResultRow,
                pressed && styles.searchResultPressed,
              ]}
            >
              <Text style={styles.searchResultName}>Créer « {trimmedNom} »</Text>
              <Text style={styles.searchResultPhone}>Nouveau fournisseur</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: chantierColors.surface,
  },
  hintText: {
    color: chantierColors.muted,
    fontSize: 14,
    marginTop: -4,
    marginBottom: 4,
  },
  searchResults: {
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: chantierColors.surface,
    marginBottom: 4,
  },
  searchResultRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
  },
  searchResultRowSelected: {
    backgroundColor: '#FFF5F1',
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
});
