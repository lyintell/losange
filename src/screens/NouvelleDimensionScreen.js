import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import AjouterOuvrageModal from '../components/terrain/AjouterOuvrageModal';
import AjouterArticleModal from '../components/terrain/AjouterArticleModal';
import ChoixUniteModal from '../components/terrain/ChoixUniteModal';
import CatalogueKindToggle from '../components/terrain/CatalogueKindToggle';
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
  getArticlesByMetierAndEntreprise,
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
import { formatArticleNomAvecFournisseur } from '../utils/formatLigneMesures';

const STEP_TITLES = {
  metier: 'Choix du métier',
  ouvrage: "Choix de l'ouvrage / article",
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
  const [catalogItems, setCatalogItems] = useState([]);
  const [loadingMetiers, setLoadingMetiers] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [draft, setDraft] = useState(() => getDraftDimensionFlow());
  const [catalogueKind, setCatalogueKind] = useState(() => getDraftDimensionFlow()?.catalogueKind || 'ouvrage');
  const [savingLine, setSavingLine] = useState(false);
  const [formComplete, setFormComplete] = useState(false);
  const [editingLigneId, setEditingLigneId] = useState(null);
  const [canCreateOuvrage, setCanCreateOuvrage] = useState(false);
  const [canAddReleveLigne, setCanAddReleveLigne] = useState(true);
  const [hidesPriceUi, setHidesPriceUi] = useState(false);
  const [addOuvrageModalVisible, setAddOuvrageModalVisible] = useState(false);
  const [addArticleModalVisible, setAddArticleModalVisible] = useState(false);
  const [choixUniteModal, setChoixUniteModal] = useState({
    visible: false,
    ouvrage: null,
    unites: [],
  });

  const isArticleMode = catalogueKind === 'article';
  const catalogueLabel = isArticleMode ? 'article' : 'ouvrage';

  const formatCatalogItemLabel = useCallback(
    (item) => {
      if (!isArticleMode) return item.nom;
      return formatArticleNomAvecFournisseur(item.nom, item.fournisseur_nom);
    },
    [isArticleMode]
  );

  const dimensionsScreenTitle = useMemo(() => {
    if (!draft?.ouvrage?.nom) return 'Nouveau relevé';
    const isArticle =
      draft.catalogueKind === 'article' || Number(draft.ouvrage.ind_article) === 1;
    if (!isArticle) return draft.ouvrage.nom;
    return formatArticleNomAvecFournisseur(draft.ouvrage.nom, draft.ouvrage.fournisseur_nom);
  }, [draft?.ouvrage, draft?.catalogueKind]);

  const isEditingLine = Boolean(editingLigneId);
  const editingLigne = useMemo(
    () => draft?.lignes?.find((ligne) => ligne.id === editingLigneId) || null,
    [draft?.lignes, editingLigneId]
  );
  const catalogItemsSorted = useMemo(() => {
    const items = [...catalogItems];
    return items.sort((a, b) => {
      const ordreA = Number(a.ordre);
      const ordreB = Number(b.ordre);
      if (Number.isFinite(ordreA) && Number.isFinite(ordreB) && ordreA !== ordreB) {
        return ordreA - ordreB;
      }
      return (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' });
    });
  }, [catalogItems]);

  const loadCatalogItems = useCallback(
    async (metierId, kind = catalogueKind) => {
      if (!metierId || !entrepriseId) return [];
      if (kind === 'article') {
        return getArticlesByMetierAndEntreprise(metierId, entrepriseId);
      }
      return getOuvragesByMetierAndEntreprise(metierId, entrepriseId);
    },
    [entrepriseId, catalogueKind]
  );

  const loadUnitesForItem = useCallback(async (itemId) => {
    return getUnitesEtPrixParOuvrage(itemId);
  }, []);

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
      const kind = current.catalogueKind || 'ouvrage';
      setCatalogueKind(kind);
      const data = await loadCatalogItems(current.metier.id, kind);
      setCatalogItems(data || []);
      if (current.ouvrage) {
        await loadUnitesForItem(current.ouvrage.id, kind);
      }
    };
    restoreDraftLists();
  }, [entrepriseId, loadCatalogItems, loadUnitesForItem]);

  const handleChooseMetier = async (metier) => {
    if (!entrepriseId) return;
    updateDraftDimensionFlow({
      metier,
      ouvrage: null,
      ouvrageUnite: null,
      catalogueKind: 'ouvrage',
    });
    setCatalogueKind('ouvrage');
    refreshDraft();
    setStep('ouvrage');
    setLoadingCatalog(true);
    try {
      const data = await loadCatalogItems(metier.id, 'ouvrage');
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Erreur chargement catalogue:', error);
      setCatalogItems([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCatalogueKindChange = async (nextKind) => {
    if (nextKind === catalogueKind) return;
    const current = getDraftDimensionFlow();
    if (!current?.metier?.id) return;

    setCatalogueKind(nextKind);
    updateDraftDimensionFlow({
      catalogueKind: nextKind,
      ouvrage: null,
      ouvrageUnite: null,
    });
    refreshDraft();
    setLoadingCatalog(true);
    try {
      const data = await loadCatalogItems(current.metier.id, nextKind);
      setCatalogItems(data || []);
    } catch (error) {
      console.error('Erreur chargement catalogue:', error);
      setCatalogItems([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleChooseCatalogItem = async (item) => {
    try {
      const data = await loadUnitesForItem(item.id, catalogueKind);
      const unites = data || [];

      if (unites.length === 1) {
        updateDraftDimensionFlow({ ouvrage: item, ouvrageUnite: unites[0] });
        refreshDraft();
        setStep('dimensions');
        return;
      }

      if (unites.length > 1) {
        setChoixUniteModal({ visible: true, ouvrage: item, unites });
        return;
      }

      updateDraftDimensionFlow({ ouvrage: item, ouvrageUnite: null });
      refreshDraft();
    } catch (error) {
      console.error('Erreur chargement unites:', error);
    }
  };

  const handleChooseUniteFromModal = (unite) => {
    const { ouvrage } = choixUniteModal;
    setChoixUniteModal({ visible: false, ouvrage: null, unites: [] });
    if (!ouvrage) return;
    updateDraftDimensionFlow({ ouvrage, ouvrageUnite: unite });
    refreshDraft();
    setStep('dimensions');
  };

  const handleDismissChoixUniteModal = () => {
    setChoixUniteModal({ visible: false, ouvrage: null, unites: [] });
  };

  const reloadCatalogForDraftMetier = useCallback(async () => {
    const current = getDraftDimensionFlow();
    if (!current?.metier?.id || !entrepriseId) return [];
    const kind = current.catalogueKind || catalogueKind;
    const data = await loadCatalogItems(current.metier.id, kind);
    setCatalogItems(data || []);
    return data || [];
  }, [entrepriseId, catalogueKind, loadCatalogItems]);

  const handleCatalogItemCreated = async ({ ouvrage, ouvrageUnite }) => {
    await reloadCatalogForDraftMetier();
    if (!ouvrage) return;
    if (ouvrageUnite) {
      updateDraftDimensionFlow({ ouvrage, ouvrageUnite });
      refreshDraft();
      setStep('dimensions');
      return;
    }
    await handleChooseCatalogItem(ouvrage);
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
        catalogue_kind: current.catalogueKind || 'ouvrage',
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

    const catalogueKind =
      ligne.catalogue_kind ||
      (Number(context.ouvrage?.ind_article) === 1 ? 'article' : 'ouvrage');

    updateDraftDimensionFlow({
      metier: context.metier,
      ouvrage: context.ouvrage,
      ouvrageUnite: context.ouvrageUnite,
      catalogueKind,
    });
    setCatalogueKind(catalogueKind);
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
    setStep('ouvrage');
  };

  const handleNouveauMetier = () => {
    updateDraftDimensionFlow({
      metier: null,
      ouvrage: null,
      ouvrageUnite: null,
      catalogueKind: 'ouvrage',
    });
    setCatalogueKind('ouvrage');
    refreshDraft();
    setCatalogItems([]);
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
          <CatalogueKindToggle value={catalogueKind} onChange={handleCatalogueKindChange} />
          {loadingCatalog ? (
            <LosangeLogoLoader size="large" containerStyle={styles.loader} />
          ) : catalogItemsSorted.length === 0 ? (
            <Text style={styles.infoText}>
              {canCreateOuvrage
                ? `Aucun ${catalogueLabel} pour ce métier. Utilisez + pour en créer un.`
                : `Aucun ${catalogueLabel} pour votre entreprise. Synchronisez le catalogue ou demandez à un admin d'en ajouter.`}
            </Text>
          ) : (
            <View style={styles.choiceList}>
              {catalogItemsSorted.map((item) => (
                <MobileButton
                  key={item.id}
                  mode={draft?.ouvrage?.id === item.id ? 'contained' : 'outlined'}
                  onPress={() => handleChooseCatalogItem(item)}
                  style={styles.choiceButton}
                  contentStyle={styles.choiceButtonContent}
                  buttonColor={draft?.ouvrage?.id === item.id ? chantierColors.primary : chantierColors.surface}
                  textColor={draft?.ouvrage?.id === item.id ? '#FFFFFF' : chantierColors.text}
                >
                  {formatCatalogItemLabel(item)}
                </MobileButton>
              ))}
            </View>
          )}

        </ScrollView>
        <ChoixUniteModal
          visible={choixUniteModal.visible}
          ouvrageNom={formatCatalogItemLabel(choixUniteModal.ouvrage || {})}
          unites={choixUniteModal.unites}
          onDismiss={handleDismissChoixUniteModal}
          onSelect={handleChooseUniteFromModal}
        />
        <FlowBackFab onPress={() => setStep('metier')} smallCountBelow={fabSmallCount} />
        {canCreateOuvrage ? (
          <FlowSmallFab
            icon="plus"
            tierFromBottom={0}
            color={flowFabColors.primary}
            onPress={() =>
              isArticleMode ? setAddArticleModalVisible(true) : setAddOuvrageModalVisible(true)
            }
            disabled={!draft?.metier}
          />
        ) : null}
        <AjouterOuvrageModal
          visible={addOuvrageModalVisible}
          metier={draft?.metier}
          entrepriseId={entrepriseId}
          existingOuvrages={isArticleMode ? [] : catalogItems}
          lockPrixUnitaireToOne={hidesPriceUi}
          onDismiss={() => setAddOuvrageModalVisible(false)}
          onCreated={handleCatalogItemCreated}
        />
        <AjouterArticleModal
          visible={addArticleModalVisible}
          metier={draft?.metier}
          entrepriseId={entrepriseId}
          existingArticles={isArticleMode ? catalogItems : []}
          lockPrixUnitaireToOne={hidesPriceUi}
          onDismiss={() => setAddArticleModalVisible(false)}
          onCreated={handleCatalogItemCreated}
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
          profondeur: editingLigne.profondeur,
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
    updateDraftDimensionFlow({
      metier: null,
      ouvrage: null,
      ouvrageUnite: null,
      catalogueKind: 'ouvrage',
    });
    setCatalogueKind('ouvrage');
    refreshDraft();
    setCatalogItems([]);
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
      : step === 'dimensions'
        ? dimensionsScreenTitle
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
