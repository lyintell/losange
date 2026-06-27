import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from '../components/terrain/MobileButton';
import PaveMetaButton from '../components/terrain/PaveMetaButton';
import PaveNumerique from '../components/terrain/PaveNumerique';
import { getFabActionZoneHeight } from '../components/terrain/TerrainFlowFabs';
import { getLoggedInProfilViewLocal, insertLigneReleveLocal, setLigneRelevePhotoLocal } from '../db/querries';
import { pickTerrainImage } from '../utils/terrainImagePicker';
import { chantierColors } from '../styles/theme';
import {
  canEditChantierCotesInPave,
  canEditPrixUnitaireApplique,
  hidesPriceUiForRole,
} from '../utils/terrainAccess';
import {
  computeMontantLigneReleve,
  computePrixUnitaireAppliqueDefault,
  computeQuantiteLigneReleve,
  getRequiredCotesFromFormula,
} from '../utils/ligneReleveCalcul';
import { formatMontant, formatQuantite, roundQuantite } from '../utils/formatLigneMesures';

const FIELD_LABEL = {
  largeur: 'Largeur',
  hauteur: 'Hauteur',
  profondeur: 'Épaisseur',
  nombre: 'Nombre',
};

const COTE_KEY_HEIGHT = 60;
const COTE_INACTIVE_BG = '#4B5563';
const COTE_INACTIVE_BORDER = '#3F4654';

export default forwardRef(function PaveSaisieOneHand(
  {
    releveId = '',
    ouvrageUniteId = '',
    prixUnitaireApplique = 0,
    isDimension = true,
    uniteFormule = '',
    nomUnite = '',
    onSaved,
    onSaveLine,
    onValidityChange,
    hideInternalSaveButton = false,
    hidePriceUi = false,
    bottomOffset = 0,
    initialValues = null,
    fabSmallCountBelow = 1,
  },
  ref
) {
  const requiredCotes = useMemo(
    () => getRequiredCotesFromFormula(uniteFormule, isDimension ? 1 : 0),
    [uniteFormule, isDimension]
  );

  const isDimensionMode = Number(isDimension ? 1 : 0) === 1;

  const champs = useMemo(() => {
    if (!isDimensionMode) return ['nombre'];
    const fields = [];
    if (requiredCotes.needsLargeur) fields.push('largeur');
    if (requiredCotes.needsHauteur) fields.push('hauteur');
    if (requiredCotes.needsProfondeur) fields.push('profondeur');
    fields.push('nombre');
    return fields;
  }, [isDimensionMode, requiredCotes]);

  const buildInitialForm = useCallback(
    () => ({
      largeur:
        initialValues?.largeur != null && initialValues.largeur !== ''
          ? String(initialValues.largeur)
          : '',
      hauteur:
        initialValues?.hauteur != null && initialValues.hauteur !== ''
          ? String(initialValues.hauteur)
          : '',
      profondeur:
        initialValues?.profondeur != null && initialValues.profondeur !== ''
          ? String(initialValues.profondeur)
          : '',
      nombre:
        initialValues?.nombre != null && initialValues.nombre !== ''
          ? String(initialValues.nombre)
          : '',
    }),
    [initialValues]
  );

  const [focusIndex, setFocusIndex] = useState(0);
  const replaceOnNextKeyRef = useRef(true);
  const [form, setForm] = useState(buildInitialForm);
  const [note, setNote] = useState(initialValues?.note || '');
  const [noteDraft, setNoteDraft] = useState('');
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [prixUnitaireDraft, setPrixUnitaireDraft] = useState('');
  const [prixModalVisible, setPrixModalVisible] = useState(false);
  const [photoPendingUri, setPhotoPendingUri] = useState(initialValues?.photo_pending_uri || null);
  const [photoMimeType, setPhotoMimeType] = useState(initialValues?.photo_mime_type || null);
  const [existingPhotoKey, setExistingPhotoKey] = useState(initialValues?.photo || null);
  const cataloguePu = Number(prixUnitaireApplique) || 0;
  const [prixUnitaireAppliqueState, setPrixUnitaireAppliqueState] = useState(() => {
    if (initialValues?.prix_unitaire_applique != null) {
      return Number(initialValues.prix_unitaire_applique) || 0;
    }
    return cataloguePu;
  });
  const prixManuallyEditedRef = useRef(initialValues?.prix_unitaire_applique != null);
  const [saving, setSaving] = useState(false);
  const [resolvedHidePriceUi, setResolvedHidePriceUi] = useState(hidePriceUi);
  const [canEditPuApplique, setCanEditPuApplique] = useState(!hidePriceUi);
  const [lockDimensionCotes, setLockDimensionCotes] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPriceAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        const roleHidesPrice = hidesPriceUiForRole(profil?.role);
        const canEdit = canEditPrixUnitaireApplique(profil);
        const canEditCotes = canEditChantierCotesInPave(profil);
        if (!cancelled) {
          setResolvedHidePriceUi(hidePriceUi || roleHidesPrice);
          setCanEditPuApplique(canEdit && !hidePriceUi);
          setLockDimensionCotes(!canEditCotes);
        }
      } catch (error) {
        console.error('Erreur chargement acces prix:', error);
        if (!cancelled) {
          setResolvedHidePriceUi(hidePriceUi);
          setCanEditPuApplique(!hidePriceUi);
          setLockDimensionCotes(false);
        }
      }
    };

    loadPriceAccess();
    return () => {
      cancelled = true;
    };
  }, [hidePriceUi]);

  const isCoteFieldLocked = useCallback(
    (field) =>
      lockDimensionCotes && (field === 'largeur' || field === 'hauteur' || field === 'profondeur'),
    [lockDimensionCotes]
  );

  const defaultPuApplique = useMemo(() => {
    try {
      return computePrixUnitaireAppliqueDefault({
        indDimension: isDimensionMode ? 1 : 0,
        prixUnitaire: cataloguePu,
        formule: uniteFormule,
        largeur: form.largeur,
        hauteur: form.hauteur,
        profondeur: form.profondeur,
      });
    } catch {
      return isDimensionMode ? 0 : cataloguePu;
    }
  }, [cataloguePu, form.hauteur, form.largeur, form.profondeur, isDimensionMode, uniteFormule]);

  useEffect(() => {
    if (initialValues?.prix_unitaire_applique != null) {
      setPrixUnitaireAppliqueState(Number(initialValues.prix_unitaire_applique) || 0);
      prixManuallyEditedRef.current = true;
      return;
    }
    prixManuallyEditedRef.current = false;
  }, [initialValues?.prix_unitaire_applique, ouvrageUniteId]);

  useEffect(() => {
    if (initialValues?.prix_unitaire_applique != null) return;
    if (prixManuallyEditedRef.current) return;
    setPrixUnitaireAppliqueState(defaultPuApplique);
  }, [defaultPuApplique, initialValues?.prix_unitaire_applique]);

  useEffect(() => {
    if (lockDimensionCotes) {
      const nombreIndex = champs.indexOf('nombre');
      setFocusIndex(nombreIndex >= 0 ? nombreIndex : 0);
    } else {
      setFocusIndex(0);
    }
    replaceOnNextKeyRef.current = true;
  }, [champs.join('|'), lockDimensionCotes]);

  const focusField = champs[focusIndex] || champs[0];

  const selectField = (index) => {
    const field = champs[index];
    if (!field || isCoteFieldLocked(field)) return;
    setFocusIndex(index);
    replaceOnNextKeyRef.current = true;
  };

  const buildPayloadIfValid = useCallback(() => {
    const resolveLockedCote = (field, formValue) => {
      if (!isCoteFieldLocked(field)) {
        return parseFloat(formValue || '0');
      }
      if (initialValues?.[field] != null && initialValues[field] !== '') {
        return parseFloat(initialValues[field]) || 0;
      }
      return parseFloat(formValue || '0');
    };

    const largeur = resolveLockedCote('largeur', form.largeur);
    const hauteur = resolveLockedCote('hauteur', form.hauteur);
    const profondeur = resolveLockedCote('profondeur', form.profondeur);
    const nombre = parseInt(form.nombre?.trim() || '0', 10);

    if (requiredCotes.needsLargeur && (!form.largeur?.trim() || !largeur)) return null;
    if (requiredCotes.needsHauteur && (!form.hauteur?.trim() || !hauteur)) return null;
    if (requiredCotes.needsProfondeur && (!form.profondeur?.trim() || !profondeur)) return null;
    if (!nombre) return null;

    let quantite = 0;
    try {
      quantite = computeQuantiteLigneReleve({
        indDimension: isDimension ? 1 : 0,
        formule: uniteFormule,
        largeur,
        hauteur,
        profondeur,
        nombre,
      });
    } catch {
      return null;
    }

    if (!quantite) return null;

    return {
      largeur: requiredCotes.needsLargeur ? largeur : null,
      hauteur: requiredCotes.needsHauteur ? hauteur : null,
      profondeur: requiredCotes.needsProfondeur ? profondeur : null,
      nombre,
      quantite,
      prixUnitaireApplique: prixUnitaireAppliqueState,
      note: note.trim() || null,
      photo_pending_uri: photoPendingUri,
      photo_mime_type: photoMimeType,
      photo: photoPendingUri ? null : existingPhotoKey,
    };
  }, [
    form,
    isDimension,
    uniteFormule,
    requiredCotes,
    prixUnitaireAppliqueState,
    note,
    photoPendingUri,
    photoMimeType,
    existingPhotoKey,
    initialValues,
    isCoteFieldLocked,
  ]);

  const isFormComplete = Boolean(buildPayloadIfValid());

  useEffect(() => {
    setPhotoPendingUri(initialValues?.photo_pending_uri || null);
    setPhotoMimeType(initialValues?.photo_mime_type || null);
    setExistingPhotoKey(initialValues?.photo || null);
  }, [initialValues]);

  useEffect(() => {
    onValidityChange?.(isFormComplete);
  }, [isFormComplete, onValidityChange]);

  const quantitePreview = useMemo(() => {
    try {
      return computeQuantiteLigneReleve({
        indDimension: isDimension ? 1 : 0,
        formule: uniteFormule,
        largeur: form.largeur,
        hauteur: form.hauteur,
        profondeur: form.profondeur,
        nombre: form.nombre?.trim() || '0',
      });
    } catch {
      return 0;
    }
  }, [form.hauteur, form.largeur, form.profondeur, form.nombre, isDimension, uniteFormule]);

  const montantPreview = useMemo(() => {
    const nombre = parseInt(form.nombre?.trim() || '0', 10) || 0;
    return computeMontantLigneReleve({
      prixUnitaireApplique: prixUnitaireAppliqueState,
      nombre,
    });
  }, [form.nombre, prixUnitaireAppliqueState]);

  const handleKeyPress = (value) => {
    if (!focusField || isCoteFieldLocked(focusField)) return;
    if (value === 'Effacer') {
      replaceOnNextKeyRef.current = false;
      setForm((prev) => ({ ...prev, [focusField]: prev[focusField].slice(0, -1) }));
      return;
    }
    if (replaceOnNextKeyRef.current) {
      replaceOnNextKeyRef.current = false;
      setForm((prev) => ({ ...prev, [focusField]: value }));
      return;
    }
    if (value === '.' && form[focusField].includes('.')) return;
    setForm((prev) => ({ ...prev, [focusField]: `${prev[focusField]}${value}` }));
  };

  const handleSaveLine = async ({ silent = false } = {}) => {
    if (!onSaveLine && (!releveId || !ouvrageUniteId)) {
      if (!silent) Alert.alert('Contexte incomplet', "Le relevé ou l'ouvrage est manquant.");
      return false;
    }

    const payload = buildPayloadIfValid();
    if (!payload) {
      if (!silent) {
        Alert.alert('Valeurs invalides', 'Renseignez toutes les cotes requises pour cette unité.');
      }
      return false;
    }

    try {
      setSaving(true);
      if (onSaveLine) {
        await onSaveLine(payload);
      } else {
        const ligneId = await insertLigneReleveLocal(releveId, ouvrageUniteId, payload);
        if (photoPendingUri) {
          await setLigneRelevePhotoLocal(ligneId, photoPendingUri, { mimeType: photoMimeType });
        }
        onSaved?.();
      }

      setForm({ largeur: '', hauteur: '', profondeur: '', nombre: '' });
      setNote('');
      setPhotoPendingUri(null);
      setPhotoMimeType(null);
      setExistingPhotoKey(null);
      prixManuallyEditedRef.current = false;
      setPrixUnitaireAppliqueState(isDimensionMode ? 0 : cataloguePu);
      setFocusIndex(0);
      replaceOnNextKeyRef.current = true;
      return true;
    } catch (error) {
      console.error('Erreur insertion ligne releve:', error);
      if (!silent) Alert.alert('Erreur', "Impossible d'enregistrer la ligne.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveLine: handleSaveLine,
    isFormComplete: () => Boolean(buildPayloadIfValid()),
  }));

  const chipDisplayValue = (field, index) => {
    if (form[field] !== '') return form[field];
    if (field === 'nombre') return focusIndex === index ? '' : '0';
    return '0';
  };

  const quantiteAffichage = isDimensionMode
    ? parseInt(form.nombre?.trim() || '0', 10) || 0
    : quantitePreview;
  const quantiteLabel = `Qté = ${formatQuantite(quantiteAffichage)}${nomUnite ? ` ${nomUnite}` : ''}`;

  const openNotesModal = () => {
    setNoteDraft(note);
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    setNote(noteDraft.trim());
    setNotesModalVisible(false);
  };

  const openPrixModal = () => {
    if (!canEditPuApplique) return;
    setPrixUnitaireDraft(String(prixUnitaireAppliqueState || 0));
    setPrixModalVisible(true);
  };

  const savePrix = () => {
    if (!canEditPuApplique) return;
    const parsed = parseFloat(String(prixUnitaireDraft).replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert('Prix invalide', 'Saisissez un prix unitaire valide.');
      return;
    }
    setPrixUnitaireAppliqueState(parsed);
    prixManuallyEditedRef.current = true;
    setPrixModalVisible(false);
  };

  const handlePickPhoto = async () => {
    const picked = await pickTerrainImage();
    if (picked?.uri) {
      setPhotoPendingUri(picked.uri);
      setPhotoMimeType(picked.mimeType);
      setExistingPhotoKey(null);
    }
  };

  const renderPaveKey = (field, index, inline = false) => {
    const isLocked = isCoteFieldLocked(field);
    const isActive = !isLocked && focusIndex === index;
    const value = chipDisplayValue(field, index);

    return (
      <Pressable
        key={field}
        onPress={() => selectField(index)}
        disabled={isLocked}
        style={[
          styles.paveKey,
          inline && styles.paveKeyInline,
          isLocked && styles.paveKeyLocked,
          isActive && styles.paveKeyActive,
        ]}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[styles.paveKeyLabel, isActive && styles.paveKeyLabelActive]}
        >
          {FIELD_LABEL[field]}
        </Text>
        <Text style={[styles.paveKeyValue, isActive && styles.paveKeyValueActive]}>{value || '0'}</Text>
      </Pressable>
    );
  };

  const renderCotesRow = () => (
    <View style={styles.cotesRow}>
      {champs.map((field, index) => (
        <React.Fragment key={field}>
          {index > 0 ? <Text style={styles.cotesSeparator}>x</Text> : null}
          {renderPaveKey(field, index, true)}
        </React.Fragment>
      ))}
    </View>
  );

  const renderNotesModal = () => (
    <Portal>
      <Modal
        visible={notesModalVisible}
        onDismiss={() => setNotesModalVisible(false)}
        contentContainerStyle={styles.notesModal}
      >
        <Text variant="titleLarge" style={styles.notesModalTitle}>
          Note
        </Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder="Saisir une note pour cette ligne..."
          style={styles.notesInput}
        />
        <View style={styles.notesModalActions}>
          <MobileButton mode="outlined" onPress={() => setNotesModalVisible(false)}>
            Annuler
          </MobileButton>
          <MobileButton mode="contained" onPress={saveNotes}>
            Enregistrer
          </MobileButton>
        </View>
      </Modal>
    </Portal>
  );

  const renderPrixModal = () => (
    <Portal>
      <Modal
        visible={prixModalVisible}
        onDismiss={() => setPrixModalVisible(false)}
        contentContainerStyle={styles.notesModal}
      >
        <Text variant="titleLarge" style={styles.notesModalTitle}>
          P.U. appliqué
        </Text>
        <Text style={styles.prixModalHint}>
          Par défaut : P.U catalogue, ou P.U × l × h si dimension. Montant = P.U. appliqué × n.
        </Text>
        <TextInput
          mode="outlined"
          keyboardType="decimal-pad"
          value={prixUnitaireDraft}
          onChangeText={setPrixUnitaireDraft}
          placeholder="Prix unitaire..."
          style={styles.prixInput}
          right={<TextInput.Affix text="F" />}
        />
        <View style={styles.notesModalActions}>
          <MobileButton mode="outlined" onPress={() => setPrixModalVisible(false)}>
            Annuler
          </MobileButton>
          <MobileButton mode="contained" onPress={savePrix}>
            Enregistrer
          </MobileButton>
        </View>
      </Modal>
    </Portal>
  );

  const renderBottomPanel = () => (
    <View style={styles.bottomPanel}>
      <View style={styles.metaGrid}>
        <PaveMetaButton
          icon="note-text-outline"
          onPress={openNotesModal}
          active={Boolean(note)}
          tile
          style={styles.metaButtonTile}
        >
          Note
        </PaveMetaButton>
        {canEditPuApplique && !resolvedHidePriceUi ? (
          <PaveMetaButton
            icon="currency-usd"
            onPress={openPrixModal}
            tile
            style={styles.metaButtonTile}
          >
            Prix
          </PaveMetaButton>
        ) : null}
        <PaveMetaButton
          icon="camera"
          onPress={handlePickPhoto}
          active={Boolean(photoPendingUri || existingPhotoKey)}
          tile
          style={styles.metaButtonTile}
        >
          Photo
        </PaveMetaButton>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.quantiteLine}>{quantiteLabel}</Text>
        {!resolvedHidePriceUi ? (
          <>
            <Text style={styles.puLine}>P.U. = {formatMontant(prixUnitaireAppliqueState)}</Text>
            <Text style={styles.montantLine}>MT = {formatMontant(montantPreview)}</Text>
          </>
        ) : null}
      </View>
    </View>
  );

  if (hideInternalSaveButton) {
    const fabZoneHeight = getFabActionZoneHeight(fabSmallCountBelow);

    return (
      <>
        <ScrollView
          style={styles.containerEmbedded}
          contentContainerStyle={[styles.scrollContentEmbedded, { paddingBottom: fabZoneHeight }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topKeypadBlock}>
            <PaveNumerique
              onKeyPress={handleKeyPress}
              disabled={saving}
              header={renderCotesRow()}
              placement="top"
            />
          </View>
          {renderBottomPanel()}
        </ScrollView>
        {renderNotesModal()}
        {renderPrixModal()}
      </>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContentEmbedded, { paddingBottom: bottomOffset + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PaveNumerique
          onKeyPress={handleKeyPress}
          disabled={saving}
          header={renderCotesRow()}
          placement="top"
        />
        {renderBottomPanel()}
      </ScrollView>
      {renderNotesModal()}
      {renderPrixModal()}
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    minHeight: 0,
  },
  containerEmbedded: {
    flex: 1,
    minHeight: 0,
  },
  scrollContentEmbedded: {
    flexGrow: 1,
    paddingHorizontal: 12,
  },
  topKeypadBlock: {
    flexShrink: 0,
    marginHorizontal: -12,
  },
  bottomPanel: {
    paddingTop: 8,
    paddingBottom: 2,
  },
  cotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  cotesSeparator: {
    fontSize: 24,
    fontWeight: '900',
    color: chantierColors.text,
    lineHeight: COTE_KEY_HEIGHT,
    paddingHorizontal: 2,
  },
  paveKeyInline: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 80,
    maxWidth: 140,
  },
  paveKey: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '30%',
    minWidth: 96,
    minHeight: COTE_KEY_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COTE_INACTIVE_BORDER,
    backgroundColor: COTE_INACTIVE_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  paveKeyActive: {
    borderWidth: 2,
    borderColor: chantierColors.primary,
    backgroundColor: '#FFF4EF',
  },
  paveKeyLocked: {
    opacity: 0.55,
  },
  paveKeyLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    width: '100%',
  },
  paveKeyLabelActive: {
    color: chantierColors.primary,
  },
  paveKeyValue: {
    fontSize: 22,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
  },
  paveKeyValueActive: {
    color: chantierColors.text,
  },
  paveKeyContent: {
    minHeight: COTE_KEY_HEIGHT,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 8,
  },
  metaButtonTile: {
    flex: 1,
    minWidth: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 14,
    rowGap: 6,
    marginTop: 18,
  },
  quantiteLine: {
    color: chantierColors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  puLine: {
    color: chantierColors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  montantLine: {
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  prixInput: {
    marginBottom: 12,
  },
  prixModalHint: {
    color: chantierColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  notesModal: {
    marginHorizontal: 20,
    backgroundColor: chantierColors.surface,
    borderRadius: 14,
    padding: 16,
  },
  notesModalTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 12,
  },
  notesInput: {
    minHeight: 120,
    marginBottom: 12,
  },
  notesModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
