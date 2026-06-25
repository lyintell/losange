import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, TextInput } from 'react-native-paper';
import { FlowBackFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import ChantierPhotosCompactRow from '../components/terrain/ChantierPhotosCompactRow';
import { getDraftDimensionFlow } from '../db/mockData';
import {
  getLoggedInProfilViewLocal,
  getReleveIdByChantierLocal,
  searchChantiersByClientLocal,
  searchClientsLocal,
} from '../db/querries';
import { CHANTIER_PHOTO_SLOTS } from '../db/terrainImageStorage';
import { chantierColors } from '../styles/theme';
import { formatMontantFcfa } from '../utils/formatLigneMesures';
import { computeReleveFacturation } from '../utils/releveFacturation';
import { canEditReleveRemise } from '../utils/terrainAccess';

function TvaToggle({ value, onChange }) {
  const isOui = Number(value) === 1;

  return (
    <View style={styles.tvaToggleRow}>
      <Pressable
        onPress={() => onChange(1)}
        style={[styles.tvaOption, isOui && styles.tvaOptionActive]}
      >
        <Text style={[styles.tvaOptionText, isOui && styles.tvaOptionTextActive]}>Oui</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(0)}
        style={[styles.tvaOption, !isOui && styles.tvaOptionActive]}
      >
        <Text style={[styles.tvaOptionText, !isOui && styles.tvaOptionTextActive]}>Non</Text>
      </Pressable>
    </View>
  );
}

function FacturationRow({ label, value }) {
  return (
    <View style={styles.facturationRow}>
      <Text style={styles.facturationLabel}>{label}</Text>
      <Text style={styles.facturationValue}>{formatMontantFcfa(value)}</Text>
    </View>
  );
}

const parseRemiseInput = (value) => {
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatRemiseDisplay = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '';
  return String(num).replace('.', ',');
};

const formatClientSubtitle = (client) => {
  const phones = [client.telephone_1, client.telephone_2].filter(Boolean);
  return phones.join(' · ');
};

const emptyChantierPhotos = () => ({
  photo_1: null,
  photo_2: null,
  photo_3: null,
});

const chantierPhotosFromRecord = (chantier) => ({
  photo_1: chantier?.photo_1 ? { storageKey: chantier.photo_1 } : null,
  photo_2: chantier?.photo_2 ? { storageKey: chantier.photo_2 } : null,
  photo_3: chantier?.photo_3 ? { storageKey: chantier.photo_3 } : null,
});

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
  const [editingClientId, setEditingClientId] = useState(null);
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [chantierNom, setChantierNom] = useState('');
  const [chantierAdresse, setChantierAdresse] = useState('');
  const [chantierNotes, setChantierNotes] = useState('');
  const [chantierStatus, setChantierStatus] = useState('D');
  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [selectedReleveId, setSelectedReleveId] = useState(null);
  const [editingChantierId, setEditingChantierId] = useState(null);
  const [editingReleveId, setEditingReleveId] = useState(null);
  const [chantierSearchResults, setChantierSearchResults] = useState([]);
  const [searchingChantiers, setSearchingChantiers] = useState(false);
  const [showChantierDropdown, setShowChantierDropdown] = useState(false);
  const [chantierPhotos, setChantierPhotos] = useState(emptyChantierPhotos());
  const [releveRemise, setReleveRemise] = useState('');
  const [releveIndTva, setReleveIndTva] = useState(0);
  const [canShowRemise, setCanShowRemise] = useState(false);
  const [saving, setSaving] = useState(false);

  const resolvedClientId = selectedClientId ?? editingClientId ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadProfil = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanShowRemise(canEditReleveRemise(profil));
          const draft = getDraftDimensionFlow();
          if (
            canEditReleveRemise(profil) &&
            draft?.releveIndTva == null &&
            !draft?.releveId
          ) {
            setReleveIndTva(Number(profil?.entreprise_ind_tva) === 1 ? 1 : 0);
          }
        }
      } catch (error) {
        console.error('Erreur chargement profil:', error);
      }
    };

    loadProfil();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const draft = getDraftDimensionFlow();
    if (!draft?.chantierId) return;

    if (draft.clientId) {
      setSelectedClientId(draft.clientId);
      setEditingClientId(draft.clientId);
    }
    if (draft.clientNom) setClientNom(draft.clientNom);
    if (draft.clientTelephone) setClientTelephone(draft.clientTelephone);
    if (draft.chantierId) {
      setEditingChantierId(draft.chantierId);
      setSelectedChantierId(draft.chantierId);
    }
    if (draft.releveId) {
      setEditingReleveId(draft.releveId);
      setSelectedReleveId(draft.releveId);
    }
    if (draft.chantierNom) setChantierNom(draft.chantierNom);
    if (draft.chantierAdresse) setChantierAdresse(draft.chantierAdresse);
    if (draft.chantierNotes) setChantierNotes(draft.chantierNotes);
    if (draft.chantierStatus) setChantierStatus(draft.chantierStatus);
    if (draft.chantierPhotoKeys) {
      setChantierPhotos({
        photo_1: draft.chantierPhotoKeys.photo_1
          ? { storageKey: draft.chantierPhotoKeys.photo_1 }
          : null,
        photo_2: draft.chantierPhotoKeys.photo_2
          ? { storageKey: draft.chantierPhotoKeys.photo_2 }
          : null,
        photo_3: draft.chantierPhotoKeys.photo_3
          ? { storageKey: draft.chantierPhotoKeys.photo_3 }
          : null,
      });
    }
    if (draft.releveRemise != null) {
      setReleveRemise(formatRemiseDisplay(draft.releveRemise));
    }
    if (draft.releveIndTva != null) {
      setReleveIndTva(Number(draft.releveIndTva) === 1 ? 1 : 0);
    }
  }, []);

  const facturation = useMemo(() => {
    const draft = getDraftDimensionFlow();
    const lignesTotal = (draft?.lignes || []).reduce(
      (sum, ligne) => sum + (Number(ligne.montant) || 0),
      0
    );
    return computeReleveFacturation({
      lignesMontantTotal: lignesTotal,
      remise: parseRemiseInput(releveRemise),
      indTva: releveIndTva,
    });
  }, [releveRemise, releveIndTva]);

  const isFormValid =
    Boolean(clientNom.trim()) && Boolean(clientTelephone.trim()) && Boolean(chantierNom.trim());

  const runClientSearch = useCallback(
    async (query) => {
      if (!entrepriseId || !query.trim()) {
        setClientSearchResults([]);
        return;
      }
      try {
        setSearchingClients(true);
        const results = await searchClientsLocal(entrepriseId, query);
        setClientSearchResults(results || []);
      } catch (error) {
        console.error('Erreur recherche clients:', error);
        setClientSearchResults([]);
      } finally {
        setSearchingClients(false);
      }
    },
    [entrepriseId]
  );

  const runChantierSearch = useCallback(async (clientId, query) => {
    if (!clientId) {
      setChantierSearchResults([]);
      return;
    }
    try {
      setSearchingChantiers(true);
      const results = await searchChantiersByClientLocal(clientId, query);
      setChantierSearchResults(results || []);
    } catch (error) {
      console.error('Erreur recherche chantiers:', error);
      setChantierSearchResults([]);
    } finally {
      setSearchingChantiers(false);
    }
  }, []);

  useEffect(() => {
    if (!showClientDropdown) return undefined;
    const timer = setTimeout(() => runClientSearch(clientNom), 300);
    return () => clearTimeout(timer);
  }, [clientNom, runClientSearch, showClientDropdown]);

  useEffect(() => {
    if (!showChantierDropdown || !resolvedClientId) return undefined;
    const timer = setTimeout(() => runChantierSearch(resolvedClientId, chantierNom), 300);
    return () => clearTimeout(timer);
  }, [chantierNom, resolvedClientId, runChantierSearch, showChantierDropdown]);

  const resetChantierFields = () => {
    setChantierNom('');
    setChantierAdresse('');
    setChantierNotes('');
    setChantierStatus('D');
    setChantierPhotos(emptyChantierPhotos());
    setSelectedChantierId(null);
    setSelectedReleveId(null);
    setEditingChantierId(null);
    setEditingReleveId(null);
    setChantierSearchResults([]);
    setShowChantierDropdown(false);
  };

  const handleSelectClient = (client) => {
    const currentClientId = selectedClientId ?? editingClientId;
    if (currentClientId && currentClientId !== client.id) {
      resetChantierFields();
    }
    setSelectedClientId(client.id);
    setEditingClientId(null);
    setClientNom(client.nom_complet || '');
    setClientTelephone(client.telephone_1 || '');
    setClientSearchResults([]);
    setShowClientDropdown(false);
  };

  const handleClientNomChange = (value) => {
    setClientNom(value);
    setShowClientDropdown(true);
  };

  const handleClientTelephoneChange = (value) => {
    setClientTelephone(value);
  };

  const applyChantierRecord = async (chantier) => {
    const draft = getDraftDimensionFlow();
    const isEditMode = Boolean(draft?.editMode);

    setSelectedChantierId(chantier.id);
    setEditingChantierId(isEditMode ? null : null);
    setChantierNom(chantier.nom || '');
    setChantierAdresse(chantier.adresse || '');
    setChantierNotes(chantier.notes || '');
    setChantierStatus(chantier.status || 'D');
    setChantierPhotos(chantierPhotosFromRecord(chantier));
    setChantierSearchResults([]);
    setShowChantierDropdown(false);

    if (isEditMode) {
      const releveId = draft?.releveId || (await getReleveIdByChantierLocal(chantier.id));
      setSelectedReleveId(releveId);
      setEditingReleveId(null);
      return;
    }

    setSelectedReleveId(null);
    setEditingReleveId(null);
  };

  const handleSelectChantier = (chantier) => {
    applyChantierRecord(chantier);
  };

  const handleChantierNomChange = (value) => {
    setChantierNom(value);
    setSelectedChantierId(null);
    setSelectedReleveId(null);
    setEditingChantierId(null);
    setEditingReleveId(null);
    setShowChantierDropdown(true);
  };

  const handleChantierNomFocus = () => {
    if (!resolvedClientId) return;
    setShowChantierDropdown(true);
    runChantierSearch(resolvedClientId, chantierNom);
  };

  const buildChantierPhotoUris = () => {
    const draft = getDraftDimensionFlow();
    const payload = {};
    CHANTIER_PHOTO_SLOTS.forEach((slot) => {
      const entry = chantierPhotos[slot];
      if (entry?.uri) {
        payload[slot] = { uri: entry.uri, mimeType: entry.mimeType };
      } else if (entry === null && draft?.chantierPhotoKeys?.[slot]) {
        payload[slot] = null;
      }
    });
    return Object.keys(payload).length ? payload : null;
  };

  const buildPayload = () => {
    const payload = {
      clientId: selectedClientId ?? editingClientId ?? null,
      clientNom: clientNom.trim(),
      clientTelephone: clientTelephone.trim(),
      chantierId: selectedChantierId ?? editingChantierId ?? null,
      releveId: selectedReleveId ?? editingReleveId ?? null,
      chantierNom: chantierNom.trim(),
      chantierAdresse: chantierAdresse.trim(),
      chantierStatus,
      chantierNotes: chantierNotes.trim(),
      chantierPhotoUris: buildChantierPhotoUris(),
    };
    if (canShowRemise) {
      payload.remise = parseRemiseInput(releveRemise);
      payload.indTva = Number(releveIndTva) === 1 ? 1 : 0;
    }
    return payload;
  };

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
  }, [
    isFormValid,
    saving,
    clientNom,
    clientTelephone,
    selectedClientId,
    editingClientId,
    selectedChantierId,
    editingChantierId,
    selectedReleveId,
    editingReleveId,
    chantierNom,
    chantierAdresse,
    chantierNotes,
    chantierStatus,
    chantierPhotos,
    canShowRemise,
    releveRemise,
    releveIndTva,
  ]);

  const confirmSave = useCallback(() => {
    if (!isFormValid) return;
    Alert.alert(
      'Enregistrer',
      'Confirmer l\'enregistrement du client et du chantier ?',
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

        {!entrepriseId ? (
          <Text style={styles.hintText}>Entreprise indisponible pour la recherche client.</Text>
        ) : null}

        <TextInput
          mode="outlined"
          label="Nom du client"
          placeholder="Nom ou téléphone"
          value={clientNom}
          onChangeText={handleClientNomChange}
          style={styles.input}
          right={
            searchingClients ? (
              <TextInput.Icon icon={() => <ActivityIndicator size={18} color={chantierColors.primary} />} />
            ) : undefined
          }
        />

        {showClientDropdown && clientSearchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {clientSearchResults.map((client) => (
              <Pressable
                key={client.id}
                onPress={() => handleSelectClient(client)}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  selectedClientId === client.id && styles.searchResultRowSelected,
                  pressed && styles.searchResultPressed,
                ]}
              >
                <Text style={styles.searchResultName}>{client.nom_complet}</Text>
                {formatClientSubtitle(client) ? (
                  <Text style={styles.searchResultPhone}>{formatClientSubtitle(client)}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        <TextInput
          mode="outlined"
          label="Téléphone"
          value={clientTelephone}
          onChangeText={handleClientTelephoneChange}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text variant="titleMedium" style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Chantier
        </Text>

        {!resolvedClientId ? (
          <Text style={styles.hintText}>
            Sélectionnez un client existant pour rechercher parmi ses chantiers.
          </Text>
        ) : null}

        <TextInput
          mode="outlined"
          label="Nom du chantier"
          placeholder={resolvedClientId ? 'Nom du chantier' : 'Client requis'}
          value={chantierNom}
          onChangeText={handleChantierNomChange}
          onFocus={handleChantierNomFocus}
          editable={Boolean(resolvedClientId)}
          style={styles.input}
          right={
            searchingChantiers ? (
              <TextInput.Icon icon={() => <ActivityIndicator size={18} color={chantierColors.primary} />} />
            ) : undefined
          }
        />

        {showChantierDropdown && resolvedClientId && (searchingChantiers || chantierSearchResults.length > 0) ? (
          <View style={styles.searchResults}>
            {searchingChantiers && chantierSearchResults.length === 0 ? (
              <View style={styles.searchResultRow}>
                <Text style={styles.searchResultPhone}>Recherche…</Text>
              </View>
            ) : null}
            {chantierSearchResults.map((chantier) => (
              <Pressable
                key={chantier.id}
                onPress={() => handleSelectChantier(chantier)}
                style={({ pressed }) => [
                  styles.searchResultRow,
                  selectedChantierId === chantier.id && styles.searchResultRowSelected,
                  pressed && styles.searchResultPressed,
                ]}
              >
                <Text style={styles.searchResultName}>{chantier.nom}</Text>
                {chantier.adresse ? (
                  <Text style={styles.searchResultPhone}>{chantier.adresse}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : showChantierDropdown && resolvedClientId && chantierNom.trim() && !searchingChantiers ? (
          <Text style={styles.hintText}>Aucun chantier trouvé pour ce client.</Text>
        ) : null}

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

        <Text variant="titleMedium" style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
          Photos chantier
        </Text>
        <ChantierPhotosCompactRow
          photos={chantierPhotos}
          onSlotChange={(slot, value) =>
            setChantierPhotos((prev) => ({ ...prev, [slot]: value }))
          }
        />

        {canShowRemise ? (
          <>
            <TextInput
              mode="outlined"
              label="Remise"
              value={releveRemise}
              onChangeText={setReleveRemise}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <Text variant="titleMedium" style={[styles.sectionTitle, styles.sectionTitleSpaced]}>
              TVA
            </Text>
            <TvaToggle value={releveIndTva} onChange={setReleveIndTva} />

            <View style={styles.facturationBlock}>
              <FacturationRow label="Montant remise" value={facturation.montantRemise} />
              <FacturationRow label="Montant HT" value={facturation.totalHt} />
              {Number(releveIndTva) === 1 ? (
                <>
                  <FacturationRow label="Montant TVA" value={facturation.montantTva} />
                  <FacturationRow label="Montant TTC" value={facturation.totalTtc} />
                </>
              ) : null}
            </View>
          </>
        ) : null}
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
  input: {
    backgroundColor: chantierColors.surface,
  },
  notesInput: {
    minHeight: 110,
  },
  tvaToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tvaOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: chantierColors.border,
    backgroundColor: '#FFFFFF',
  },
  tvaOptionActive: {
    borderColor: chantierColors.primary,
    backgroundColor: chantierColors.primary,
  },
  tvaOptionText: {
    fontSize: 18,
    fontWeight: '700',
    color: chantierColors.text,
  },
  tvaOptionTextActive: {
    color: '#FFFFFF',
  },
  facturationBlock: {
    marginTop: 4,
    gap: 8,
    paddingVertical: 8,
  },
  facturationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  facturationLabel: {
    color: chantierColors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  facturationValue: {
    color: chantierColors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
