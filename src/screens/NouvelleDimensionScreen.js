import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import AjouterOuvrageModal from '../components/terrain/AjouterOuvrageModal';
import MobileButton from '../components/terrain/MobileButton';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import {
  FlowActionFab,
  FlowBackFab,
  FlowSmallFab,
  flowFabColors,
  getFabColumnPadding,
} from '../components/terrain/TerrainFlowFabs';
import { LignesReleveGroupedList } from '../components/terrain/LignesReleveGroupedList';
import {
  addLigneToDraft,
  getDraftDimensionFlow,
  removeLigneFromDraft,
  setDraftUiStep,
  updateDraftDimensionFlow,
  updateLigneInDraft,
} from '../db/mockData';
import {
  getLoggedInProfilViewLocal,
  getMetiersForSelectionLocal,
  getOuvrageUniteContextLocal,
  getOuvragesByMetierAndEntreprise,
  getUnitesEtPrixParOuvrage,
} from '../db/querries';
import { computeMontantLigneReleve } from '../utils/ligneReleveCalcul';
import {
  canCreateOuvrageInReleveFlow,
  canCreateReleveOrLigne,
  hidesPriceUiForRole,
} from '../utils/terrainAccess';
import PaveSaisieOneHand from './PaveSaisieOneHand';
import { chantierColors } from '../styles/theme';

const STEP_TITLES = {
  metier: 'Choix du métier',
  ouvrage: "Choix de l'ouvrage",
  dimensions: 'Entrez les relevés',
  recap: 'Données entrées',
};

const resolveInitialStep = () => {
  const current = getDraftDimensionFlow();
  if (current?.uiStep) return current.uiStep;
  if (current?.ouvrageUnite) return 'dimensions';
  if (current?.metier) return 'ouvrage';
  return 'metier';
};

export default function NouvelleDimensionScreen({
  entrepriseId = null,
  bottomOffset = 0,
  onCancel,
  onFinish,
  onBackToChantiers,
  onDeleteChantier,
  onNavHandlersChange,
}) {
  const saisieRef = useRef(null);
  const plusPressCountRef = useRef(0);
  const plusPressTimerRef = useRef(null);
  const [step, setStepState] = useState(resolveInitialStep);
  const [metiers, setMetiers] = useState([]);
  const [ouvrages, setOuvrages] = useState([]);
  const [unitesPrix, setUnitesPrix] = useState([]);
  const [loadingMetiers, setLoadingMetiers] = useState(true);
  const [loadingOuvrages, setLoadingOuvrages] = useState(false);
  const [draft, setDraft] = useState(() => getDraftDimensionFlow());
  const [savingLine, setSavingLine] = useState(false);
  const [formComplete, setFormComplete] = useState(false);
  const [editingLigneId, setEditingLigneId] = useState(null);
  const [canCreateOuvrage, setCanCreateOuvrage] = useState(false);
  const [canAddReleveLigne, setCanAddReleveLigne] = useState(true);
  const [hidesPriceUi, setHidesPriceUi] = useState(false);
  const [addOuvrageModalVisible, setAddOuvrageModalVisible] = useState(false);

  const isEditingLine = Boolean(editingLigneId);
  const editingLigne = useMemo(
    () => draft?.lignes?.find((ligne) => ligne.id === editingLigneId) || null,
    [draft?.lignes, editingLigneId]
  );
  const ouvragesSorted = useMemo(
    () =>
      [...ouvrages].sort((a, b) =>
        (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' })
      ),
    [ouvrages]
  );

  const refreshDraft = useCallback(() => {
    setDraft(getDraftDimensionFlow());
  }, []);

  const setStep = useCallback((nextStep) => {
    setStepState(nextStep);
    setDraftUiStep(nextStep);
  }, []);

  useEffect(() => {
    const loadProfilAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        setCanCreateOuvrage(canCreateOuvrageInReleveFlow(profil));
        setCanAddReleveLigne(canCreateReleveOrLigne(profil));
        setHidesPriceUi(hidesPriceUiForRole(profil?.role));
      } catch (error) {
        console.error('Erreur verification acces profil:', error);
        setCanCreateOuvrage(false);
        setCanAddReleveLigne(true);
        setHidesPriceUi(false);
      }
    };
    loadProfilAccess();
  }, []);

  useEffect(() => {
    const loadMetiers = async () => {
      if (!entrepriseId) {
        setMetiers([]);
        return;
      }
      try {
        setLoadingMetiers(true);
        const data = await getMetiersForSelectionLocal(entrepriseId);
        setMetiers(data || []);
      } catch (error) {
        console.error('Erreur chargement metiers:', error);
        setMetiers([]);
      } finally {
        setLoadingMetiers(false);
      }
    };
    loadMetiers();
  }, [entrepriseId]);

  useEffect(() => {
    const restoreDraftLists = async () => {
      if (!entrepriseId) return;
      const current = getDraftDimensionFlow();
      if (!current?.metier) return;
      if (current.metier) {
        const data = await getOuvragesByMetierAndEntreprise(current.metier.id, entrepriseId);
        setOuvrages(data || []);
      }
      if (current.ouvrage) {
        const unites = await getUnitesEtPrixParOuvrage(current.ouvrage.id);
        setUnitesPrix(unites?.length > 1 ? unites : []);
      }
    };
    restoreDraftLists();
  }, [entrepriseId]);

  const handleChooseMetier = async (metier) => {
    if (!entrepriseId) return;
    updateDraftDimensionFlow({ metier, ouvrage: null, ouvrageUnite: null });
    refreshDraft();
    setStep('ouvrage');
    setLoadingOuvrages(true);
    setUnitesPrix([]);
    try {
      const data = await getOuvragesByMetierAndEntreprise(metier.id, entrepriseId);
      setOuvrages(data || []);
    } catch (error) {
      console.error('Erreur chargement ouvrages:', error);
      setOuvrages([]);
    } finally {
      setLoadingOuvrages(false);
    }
  };

  const handleChooseOuvrage = async (ouvrage) => {
    try {
      const data = await getUnitesEtPrixParOuvrage(ouvrage.id);
      const unites = data || [];

      if (unites.length === 1) {
        updateDraftDimensionFlow({ ouvrage, ouvrageUnite: unites[0] });
        refreshDraft();
        setUnitesPrix([]);
        setStep('dimensions');
        return;
      }

      updateDraftDimensionFlow({ ouvrage, ouvrageUnite: null });
      refreshDraft();
      setUnitesPrix(unites);
    } catch (error) {
      console.error('Erreur chargement unites:', error);
      setUnitesPrix([]);
    }
  };

  const handleChooseUnite = (unite) => {
    updateDraftDimensionFlow({ ouvrageUnite: unite });
    refreshDraft();
    setStep('dimensions');
  };

  const reloadOuvragesForDraftMetier = useCallback(async () => {
    const current = getDraftDimensionFlow();
    if (!current?.metier?.id || !entrepriseId) return [];
    const data = await getOuvragesByMetierAndEntreprise(current.metier.id, entrepriseId);
    setOuvrages(data || []);
    return data || [];
  }, [entrepriseId]);

  const handleOuvrageCreated = async ({ ouvrage, ouvrageUnite }) => {
    await reloadOuvragesForDraftMetier();
    if (!ouvrage) return;
    if (ouvrageUnite) {
      updateDraftDimensionFlow({ ouvrage, ouvrageUnite });
      refreshDraft();
      setUnitesPrix([]);
      setStep('dimensions');
      return;
    }
    await handleChooseOuvrage(ouvrage);
  };

  const handleSaveLine = async (payload) => {
    const current = getDraftDimensionFlow();
    if (!current?.ouvrageUnite) return;
    setSavingLine(true);
    try {
      const prixUnitaireApplique =
        payload.prixUnitaireApplique != null && payload.prixUnitaireApplique !== ''
          ? Number(payload.prixUnitaireApplique) || 0
          : Number(current.ouvrageUnite?.prix_unitaire) || 0;
      const quantite = Number(payload.quantite) || 0;
      const ligneData = {
        ...payload,
        ouvrage_nom: current.ouvrage?.nom,
        metier_id: current.metier?.id,
        metier_nom: current.metier?.nom,
        nom_unite: current.ouvrageUnite?.nom_unite,
        ind_dimension: current.ouvrageUnite?.ind_dimension ?? 0,
        ouvrage_unite_id: current.ouvrageUnite?.ouvrage_unite_id,
        prix_unitaire_applique: prixUnitaireApplique,
        montant: computeMontantLigneReleve({
          prixUnitaireApplique,
          nombre: payload.nombre,
        }),
        note: payload.note || null,
        photo_pending_uri: payload.photo_pending_uri || null,
        photo_mime_type: payload.photo_mime_type || null,
        photo: payload.photo || null,
      };

      if (editingLigneId) {
        updateLigneInDraft(editingLigneId, ligneData);
        setEditingLigneId(null);
        setStep('recap');
      } else {
        addLigneToDraft(ligneData);
      }
      refreshDraft();
    } finally {
      setSavingLine(false);
    }
  };

  const handleEditLigne = async (ligne) => {
    const context = await getOuvrageUniteContextLocal(ligne.ouvrage_unite_id);
    if (!context) return;

    updateDraftDimensionFlow({
      metier: context.metier,
      ouvrage: context.ouvrage,
      ouvrageUnite: context.ouvrageUnite,
    });
    setEditingLigneId(ligne.id);
    refreshDraft();
    setStep('dimensions');
  };

  const handleCancelEdit = useCallback(() => {
    setEditingLigneId(null);
    updateDraftDimensionFlow({ metier: null, ouvrage: null, ouvrageUnite: null });
    refreshDraft();
    setStep('recap');
  }, [refreshDraft, setStep]);

  const handleDeleteLigne = (ligne) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${ligne.ouvrage_nom || 'cette entrée'}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: () => {
            removeLigneFromDraft(ligne.id);
            if (editingLigneId === ligne.id) {
              setEditingLigneId(null);
            }
            refreshDraft();
          },
        },
      ]
    );
  };

  const handleShowRecap = async () => {
    if (isEditingLine && formComplete) {
      const saved = await saisieRef.current?.saveLine?.();
      if (!saved) return;
      return;
    }

    if (formComplete) {
      const saved = await saisieRef.current?.saveLine?.();
      if (!saved) return;
      refreshDraft();
    }

    const current = getDraftDimensionFlow();
    if (!current?.lignes?.length) return;
    setStep('recap');
  };

  const handleNouvelOuvrage = () => {
    updateDraftDimensionFlow({ ouvrage: null, ouvrageUnite: null });
    refreshDraft();
    setUnitesPrix([]);
    setStep('ouvrage');
  };

  const handleNouveauMetier = () => {
    updateDraftDimensionFlow({ metier: null, ouvrage: null, ouvrageUnite: null });
    refreshDraft();
    setOuvrages([]);
    setUnitesPrix([]);
    setStep('metier');
  };

  const PLUS_MULTI_PRESS_DELAY_MS = 350;

  const handlePlusPress = () => {
    plusPressCountRef.current += 1;
    if (plusPressTimerRef.current) clearTimeout(plusPressTimerRef.current);
    plusPressTimerRef.current = setTimeout(async () => {
      const pressCount = plusPressCountRef.current;
      plusPressCountRef.current = 0;
      plusPressTimerRef.current = null;
      const plusVisuallyDisabled = savingLine || !formComplete;

      if (pressCount === 1) {
        if (plusVisuallyDisabled) return;
        await saisieRef.current?.saveLine?.();
      } else if (pressCount === 2) {
        if (!canAddReleveLigne || savingLine || formComplete) return;
        handleNouvelOuvrage();
      } else if (pressCount >= 3) {
        if (!canAddReleveLigne || savingLine || formComplete) return;
        handleNouveauMetier();
      }
    }, PLUS_MULTI_PRESS_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (plusPressTimerRef.current) clearTimeout(plusPressTimerRef.current);
    },
    []
  );

  const performNavSaveRef = useRef(null);
  performNavSaveRef.current = async () => {
    if (step !== 'recap') return;
    if (!draft?.lignes?.length) return;
    onFinish?.();
  };

  const handleShowRecapRef = useRef(handleShowRecap);
  handleShowRecapRef.current = handleShowRecap;

  useEffect(() => {
    if (!onNavHandlersChange) return undefined;

    const isDimensionsStep = step === 'dimensions';
    const voirDisabled =
      savingLine ||
      (isEditingLine ? !formComplete : !formComplete && !draft?.lignes?.length);

    const saveDisabled = isDimensionsStep
      ? voirDisabled
      : step === 'metier' ||
        step === 'ouvrage' ||
        (step === 'recap' && !draft?.lignes?.length);

    onNavHandlersChange({
      onSave: isDimensionsStep
        ? () => handleShowRecapRef.current?.()
        : () => performNavSaveRef.current?.(),
      onCancel: isDimensionsStep && isEditingLine ? handleCancelEdit : null,
      saveDisabled,
      saving: savingLine,
      primaryLabel: isDimensionsStep ? 'Voir' : 'Enregistrer',
      primaryIcon: isDimensionsStep ? 'format-list-bulleted' : 'content-save',
    });

    return () => onNavHandlersChange(null);
  }, [
    step,
    draft?.lignes?.length,
    savingLine,
    formComplete,
    isEditingLine,
    handleCancelEdit,
    onNavHandlersChange,
  ]);

  const renderMetierStep = () => (
    <>
      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getFabColumnPadding(0) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {!entrepriseId ? (
          <Text style={styles.infoText}>Entreprise non disponible. Connectez-vous après synchronisation.</Text>
        ) : loadingMetiers ? (
          <LosangeLogoLoader size="large" containerStyle={styles.loader} />
        ) : metiers.length === 0 ? (
          <Text style={styles.infoText}>Aucun métier disponible. Connectez-vous en ligne pour synchroniser le catalogue depuis Supabase.</Text>
        ) : (
          <View style={styles.choiceList}>
            {metiers.map((metier) => (
              <MobileButton
                key={metier.id}
                mode={draft?.metier?.id === metier.id ? 'contained' : 'outlined'}
                onPress={() => handleChooseMetier(metier)}
                style={styles.choiceButton}
                contentStyle={styles.choiceButtonContent}
                buttonColor={draft?.metier?.id === metier.id ? chantierColors.primary : chantierColors.surface}
                textColor={draft?.metier?.id === metier.id ? '#FFFFFF' : chantierColors.text}
              >
                {metier.nom}
              </MobileButton>
            ))}
          </View>
        )}
      </ScrollView>
      <FlowBackFab onPress={onBackToChantiers} smallCountBelow={0} />
    </>
  );

  const renderOuvrageStep = () => {
    const fabSmallCount = canCreateOuvrage ? 1 : 0;

    return (
      <>
        <ScrollView
          style={styles.stepScroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getFabColumnPadding(fabSmallCount) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {draft?.metier?.nom}
          </Text>
          {loadingOuvrages ? (
            <LosangeLogoLoader size="large" containerStyle={styles.loader} />
          ) : ouvragesSorted.length === 0 ? (
            <Text style={styles.infoText}>
              {canCreateOuvrage
                ? 'Aucun ouvrage pour ce métier. Utilisez + pour en créer un.'
                : "Aucun ouvrage pour votre entreprise. Synchronisez le catalogue ou demandez à un admin d'en ajouter."}
            </Text>
          ) : (
            <View style={styles.choiceList}>
              {ouvragesSorted.map((ouvrage) => (
                <MobileButton
                  key={ouvrage.id}
                  mode={draft?.ouvrage?.id === ouvrage.id ? 'contained' : 'outlined'}
                  onPress={() => handleChooseOuvrage(ouvrage)}
                  style={styles.choiceButton}
                  contentStyle={styles.choiceButtonContent}
                  buttonColor={draft?.ouvrage?.id === ouvrage.id ? chantierColors.primary : chantierColors.surface}
                  textColor={draft?.ouvrage?.id === ouvrage.id ? '#FFFFFF' : chantierColors.text}
                >
                  {ouvrage.nom}
                </MobileButton>
              ))}
            </View>
          )}

          {unitesPrix.length > 1 && (
            <View style={styles.uniteSection}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Unité
              </Text>
              <View style={styles.chipWrap}>
                {unitesPrix.map((item) => (
                  <Chip
                    key={item.ouvrage_unite_id}
                    selected={draft?.ouvrageUnite?.ouvrage_unite_id === item.ouvrage_unite_id}
                    onPress={() => handleChooseUnite(item)}
                    style={styles.chip}
                    selectedColor={chantierColors.success}
                  >
                    {item.nom} ({item.formule})
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
        <FlowBackFab onPress={() => setStep('metier')} smallCountBelow={fabSmallCount} />
        {canCreateOuvrage ? (
          <FlowSmallFab
            icon="plus"
            tierFromBottom={0}
            color={flowFabColors.primary}
            onPress={() => setAddOuvrageModalVisible(true)}
            disabled={!draft?.metier}
          />
        ) : null}
        <AjouterOuvrageModal
          visible={addOuvrageModalVisible}
          metier={draft?.metier}
          entrepriseId={entrepriseId}
          existingOuvrages={ouvrages}
          lockPrixUnitaireToOne={hidesPriceUi}
          onDismiss={() => setAddOuvrageModalVisible(false)}
          onCreated={handleOuvrageCreated}
        />
      </>
    );
  };

  const renderDimensionsStep = () => {
    const ouvrageUnite = draft?.ouvrageUnite;
    const initialValues = editingLigne
      ? {
          largeur: editingLigne.largeur,
          hauteur: editingLigne.hauteur,
          nombre: editingLigne.nombre,
          note: editingLigne.note,
          prix_unitaire_applique: editingLigne.prix_unitaire_applique,
          photo: editingLigne.photo || null,
          photo_pending_uri: editingLigne.photo_pending_uri || null,
          photo_mime_type: editingLigne.photo_mime_type || null,
        }
      : null;

    return (
      <>
        <View style={styles.dimensionsContent}>
          <PaveSaisieOneHand
            key={editingLigneId || ouvrageUnite?.ouvrage_unite_id || 'saisie'}
            ref={saisieRef}
            hideInternalSaveButton
            hidePriceUi={hidesPriceUi}
            ouvrageUniteId={ouvrageUnite?.ouvrage_unite_id || ''}
            prixUnitaireApplique={ouvrageUnite?.prix_unitaire || 0}
            isDimension={Number(ouvrageUnite?.ind_dimension) === 1}
            uniteFormule={ouvrageUnite?.formule || ''}
            nomUnite={ouvrageUnite?.nom_unite || ''}
            initialValues={initialValues}
            fabSmallCountBelow={0}
            onSaveLine={handleSaveLine}
            onValidityChange={setFormComplete}
          />
        </View>
        {!isEditingLine && canAddReleveLigne ? (
          <FlowActionFab
            icon="plus"
            color={flowFabColors.primary}
            smallCountBelow={0}
            onPress={handlePlusPress}
            loading={savingLine}
            disabled={savingLine || !formComplete}
            allowPressWhenDisabled
          />
        ) : null}
      </>
    );
  };

  const handleContinuerRecap = () => {
    setEditingLigneId(null);
    updateDraftDimensionFlow({ metier: null, ouvrage: null, ouvrageUnite: null });
    refreshDraft();
    setOuvrages([]);
    setUnitesPrix([]);
    setStep('metier');
  };

  const isEditingChantier = Boolean(draft?.chantierId);

  const handleDeleteChantierPress = () => {
    if (!draft?.chantierId) return;
    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer le chantier "${draft.chantierNom || ''}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: () =>
            onDeleteChantier?.({ id: draft.chantierId, nom: draft.chantierNom }),
        },
      ]
    );
  };

  const renderRecapStep = () => (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.recapContent,
          { paddingBottom: getFabColumnPadding(isEditingChantier ? 1 : 0) },
        ]}
      >
        {draft?.lignes?.length === 0 ? (
          <Text style={styles.infoText}>Aucune dimension saisie.</Text>
        ) : (
          <LignesReleveGroupedList
            lignes={draft.lignes}
            variant="recap"
            showPrices={!hidesPriceUi}
            onLignePress={handleEditLigne}
            onLigneDoublePress={handleDeleteLigne}
          />
        )}
      </ScrollView>
      {canAddReleveLigne ? (
        <FlowActionFab
          icon="plus"
          color={flowFabColors.primary}
          smallCountBelow={isEditingChantier ? 1 : 0}
          onPress={handleContinuerRecap}
        />
      ) : null}
      {isEditingChantier ? (
        <FlowSmallFab
          icon="delete"
          tierFromBottom={0}
          color={flowFabColors.muted}
          onPress={handleDeleteChantierPress}
        />
      ) : null}
    </>
  );

  const screenTitle =
    step === 'recap'
      ? 'Récapitulatif'
      : step === 'dimensions' && draft?.ouvrage?.nom
        ? draft.ouvrage.nom
        : 'Nouveau relevé';

  const stepSubtitle =
    step === 'dimensions' && isEditingLine ? 'Modification' : STEP_TITLES[step];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {screenTitle}
        </Text>
        {stepSubtitle ? (
          <Text variant="bodyMedium" style={styles.subtitle}>
            {stepSubtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.body}>
        {step === 'metier' && renderMetierStep()}
        {step === 'ouvrage' && renderOuvrageStep()}
        {step === 'dimensions' && renderDimensionsStep()}
        {step === 'recap' && renderRecapStep()}
      </View>
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
    marginBottom: 4,
  },
  subtitle: {
    color: chantierColors.muted,
    marginBottom: 8,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  stepScroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
  },
  dimensionsContent: {
    flex: 1,
    minHeight: 0,
  },
  choiceList: {
    gap: 10,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  choiceButton: {
    borderColor: chantierColors.border,
  },
  choiceButtonContent: {
    minHeight: 64,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFF5F1',
  },
  uniteSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  infoText: {
    color: chantierColors.muted,
    fontSize: 16,
  },
  loader: {
    marginTop: 24,
  },
  recapContent: {
    gap: 10,
    paddingTop: 4,
  },
});
