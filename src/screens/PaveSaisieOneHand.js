import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Modal, Portal, Text, TextInput } from 'react-native-paper';
import MobileButton from '../components/terrain/MobileButton';
import PaveMetaButton from '../components/terrain/PaveMetaButton';
import PaveNumerique from '../components/terrain/PaveNumerique';
import { getFabActionZoneHeight } from '../components/terrain/TerrainFlowFabs';
import { getLoggedInProfilViewLocal, insertLigneReleveLocal, setLigneRelevePhotoLocal } from '../db/querries';
import { pickTerrainImage } from '../utils/terrainImagePicker';
import { chantierColors } from '../styles/theme';
import { hidesPriceUiForRole } from '../utils/terrainAccess';
import {
  computeQuantiteLigneReleve,
  getRequiredCotesFromFormula,
} from '../utils/ligneReleveCalcul';
import { formatQuantite } from '../utils/formatLigneMesures';

const FIELD_LABEL = {
  largeur: 'Largeur',
  hauteur: 'Hauteur',
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
  const [prixUnitaireAppliqueState, setPrixUnitaireAppliqueState] = useState(
    () =>
      initialValues?.prix_unitaire_applique != null
        ? Number(initialValues.prix_unitaire_applique) || 0
        : Number(prixUnitaireApplique) || 0
  );
  const [saving, setSaving] = useState(false);
  const [resolvedHidePriceUi, setResolvedHidePriceUi] = useState(hidePriceUi);

  useEffect(() => {
    let cancelled = false;

    const loadPriceAccess = async () => {
      if (hidePriceUi) {
        if (!cancelled) setResolvedHidePriceUi(true);
        return;
      }

      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) setResolvedHidePriceUi(hidesPriceUiForRole(profil?.role));
      } catch (error) {
        console.error('Erreur chargement acces prix:', error);
        if (!cancelled) setResolvedHidePriceUi(false);
      }
    };

    loadPriceAccess();
    return () => {
      cancelled = true;
    };
  }, [hidePriceUi]);

  useEffect(() => {
    setPrixUnitaireAppliqueState(
      initialValues?.prix_unitaire_applique != null
        ? Number(initialValues.prix_unitaire_applique) || 0
        : Number(prixUnitaireApplique) || 0
    );
  }, [initialValues?.prix_unitaire_applique, prixUnitaireApplique, ouvrageUniteId]);

  useEffect(() => {
    setFocusIndex(0);
    replaceOnNextKeyRef.current = true;
  }, [champs.join('|')]);

  const focusField = champs[focusIndex] || champs[0];

  const selectField = (index) => {
    const field = champs[index];
    if (!field) return;
    setFocusIndex(index);
    replaceOnNextKeyRef.current = true;
  };

  const buildPayloadIfValid = useCallback(() => {
    const largeur = parseFloat(form.largeur || '0');
    const hauteur = parseFloat(form.hauteur || '0');
    const nombre = parseInt(form.nombre?.trim() || '0', 10);

    if (requiredCotes.needsLargeur && (!form.largeur?.trim() || !largeur)) return null;
    if (requiredCotes.needsHauteur && (!form.hauteur?.trim() || !hauteur)) return null;
    if (!nombre) return null;

    let quantite = 0;
    try {
      quantite = computeQuantiteLigneReleve({
        indDimension: isDimension ? 1 : 0,
        formule: uniteFormule,
        largeur,
        hauteur,
        profondeur: null,
        nombre,
      });
    } catch {
      return null;
    }

    if (!quantite) return null;

    return {
      largeur: requiredCotes.needsLargeur ? largeur : null,
      hauteur: requiredCotes.needsHauteur ? hauteur : null,
      profondeur: null,
      nombre,
      quantite,
      prixUnitaireApplique: prixUnitaireAppliqueState,
      note: note.trim() || null,
      photo_pending_uri: photoPendingUri,
      photo_mime_type: photoMimeType,
      photo: photoPendingUri ? null : existingPhotoKey,
    };
  }, [form, isDimension, uniteFormule, requiredCotes, prixUnitaireAppliqueState, note, photoPendingUri, photoMimeType, existingPhotoKey]);

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
        profondeur: null,
        nombre: form.nombre?.trim() || '0',
      });
    } catch {
      return 0;
    }
  }, [form.hauteur, form.largeur, form.nombre, isDimension, uniteFormule]);

  const handleKeyPress = (value) => {
    if (!focusField) return;
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

      setForm({ largeur: '', hauteur: '', nombre: '' });
      setNote('');
      setPhotoPendingUri(null);
      setPhotoMimeType(null);
      setExistingPhotoKey(null);
      setPrixUnitaireAppliqueState(Number(prixUnitaireApplique) || 0);
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

  const mesuresFormatees = useMemo(() => {
    if (!isDimensionMode) return chipDisplayValue('nombre', 0) || '0';

    const parts = [];
    if (requiredCotes.needsLargeur) parts.push(chipDisplayValue('largeur', champs.indexOf('largeur')));
    if (requiredCotes.needsHauteur) parts.push(chipDisplayValue('hauteur', champs.indexOf('hauteur')));
    parts.push(chipDisplayValue('nombre', champs.indexOf('nombre')));
    return parts.join(' x ');
  }, [form, focusIndex, champs, isDimensionMode, requiredCotes]);

  const quantiteAffichage = isDimensionMode
    ? parseInt(form.nombre?.trim() || '0', 10) || 0
    : quantitePreview;
  const quantiteLabel = `Qté =  ${formatQuantite(quantiteAffichage)}${nomUnite ? ` ${nomUnite}` : ''}`;

  const openNotesModal = () => {
    setNoteDraft(note);
    setNotesModalVisible(true);
  };

  const saveNotes = () => {
    setNote(noteDraft.trim());
    setNotesModalVisible(false);
  };

  const openPrixModal = () => {
    setPrixUnitaireDraft(String(prixUnitaireAppliqueState || 0));
    setPrixModalVisible(true);
  };

  const savePrix = () => {
    const parsed = parseFloat(String(prixUnitaireDraft).replace(',', '.'));
    if (Number.isNaN(parsed) || parsed < 0) {
      Alert.alert('Prix invalide', 'Saisissez un prix unitaire valide.');
      return;
    }
    setPrixUnitaireAppliqueState(parsed);
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

  const renderPaveKey = (field, index) => {
    const isActive = focusIndex === index;
    const value = chipDisplayValue(field, index);

    return (
      <Pressable
        key={field}
        onPress={() => selectField(index)}
        style={[styles.paveKey, isActive && styles.paveKeyActive]}
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
          Prix unitaire appliqué
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
      <View style={styles.paveGrid}>{champs.map((field, index) => renderPaveKey(field, index))}</View>
      <View style={styles.metaGrid}>
        <PaveMetaButton
          icon="note-text-outline"
          onPress={openNotesModal}
          active={Boolean(note)}
          iconOnly
          style={styles.metaButtonIcon}
        />
        {resolvedHidePriceUi ? null : (
          <PaveMetaButton icon="currency-usd" onPress={openPrixModal} iconOnly style={styles.metaButtonIcon} />
        )}
        <PaveMetaButton
          icon="camera"
          onPress={handlePickPhoto}
          active={Boolean(photoPendingUri || existingPhotoKey)}
          iconOnly
          style={styles.metaButtonIcon}
        />
      </View>
      <Text style={styles.quantiteLine}>{quantiteLabel}</Text>
    </View>
  );

  if (hideInternalSaveButton) {
    const fabZoneHeight = getFabActionZoneHeight(fabSmallCountBelow);

    return (
      <View style={styles.containerEmbedded}>
        <View style={styles.topKeypadBlock}>
          <PaveNumerique
            onKeyPress={handleKeyPress}
            disabled={saving}
            measuresLine={mesuresFormatees}
            placement="top"
          />
        </View>
        <View style={styles.embeddedSpacer} />
        <View style={[styles.bottomBlock, { paddingBottom: fabZoneHeight }]}>
          {renderBottomPanel()}
        </View>
        {renderNotesModal()}
        {renderPrixModal()}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: bottomOffset + 8 }]}>
      <PaveNumerique
        onKeyPress={handleKeyPress}
        disabled={saving}
        measuresLine={mesuresFormatees}
        placement="top"
      />
      <View style={styles.embeddedSpacer} />
      {renderBottomPanel()}
      {renderNotesModal()}
      {renderPrixModal()}
    </View>
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
  topKeypadBlock: {
    flexShrink: 0,
  },
  embeddedSpacer: {
    flex: 1,
    minHeight: 0,
  },
  bottomBlock: {
    flexShrink: 0,
    paddingHorizontal: 12,
  },
  bottomPanel: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  paveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 30,
    gap: 10,
  },
  metaButtonIcon: {
    flex: 0,
  },
  quantiteLine: {
    alignSelf: 'stretch',
    textAlign: 'left',
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 18,
  },
  prixInput: {
    marginBottom: 12,
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
