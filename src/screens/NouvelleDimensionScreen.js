import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import AjouterOuvrageModal from '../components/terrain/AjouterOuvrageModal';
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
  getMetiersForEntrepriseLocal,
  getOuvrageUniteContextLocal,
  getOuvragesByMetierAndEntreprise,
  getUnitesEtPrixParOuvrage,
  isLoggedInAdminLocal,
} from '../db/querries';
import PaveSaisieOneHand from './PaveSaisieOneHand';
import { chantierColors } from '../styles/theme';

const STEP_TITLES = {
  metier: 'Choix du metier',
  ouvrage: 'Choix de l ouvrage',
  dimensions: 'Entrez les dimensions',
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
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [addOuvrageModalVisible, setAddOuvrageModalVisible] = useState(false);

  const isEditingLine = Boolean(editingLigneId);
  const editingLigne = useMemo(
    () => draft?.lignes?.find((ligne) => ligne.id === editingLigneId) || null,
    [draft?.lignes, editingLigneId]
  );

  const refreshDraft = useCallback(() => {
    setDraft(getDraftDimensionFlow());
  }, []);

  const setStep = useCallback((nextStep) => {
    setStepState(nextStep);
    setDraftUiStep(nextStep);
  }, []);

  useEffect(() => {
    const loadAdminRole = async () => {
      try {
        setIsAdminRole(await isLoggedInAdminLocal());
      } catch (error) {
        console.error('Erreur verification role admin:', error);
        setIsAdminRole(false);
      }
    };
    loadAdminRole();
  }, []);

  useEffect(() => {
    const loadMetiers = async () => {
      if (!entrepriseId) {
        setMetiers([]);
        return;
      }
      try {
        setLoadingMetiers(true);
        const data = await getMetiersForEntrepriseLocal(entrepriseId);
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
        Number(payload.prixUnitaireApplique) ||
        Number(current.ouvrageUnite?.prix_unitaire) ||
        0;
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
        montant: quantite * prixUnitaireApplique,
        note: payload.note || null,
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

  const handleDeleteLigne = (ligne) => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${ligne.ouvrage_nom || 'cette entree'}" ?`,
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
        if (savingLine || formComplete) return;
        handleNouvelOuvrage();
      } else if (pressCount >= 3) {
        if (savingLine || formComplete) return;
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

  useEffect(() => {
    if (!onNavHandlersChange) return undefined;

    const saveDisabled =
      step === 'metier' ||
      step === 'ouvrage' ||
      step === 'dimensions' ||
      (step === 'recap' && !draft?.lignes?.length);

    onNavHandlersChange({
      onSave: () => performNavSaveRef.current?.(),
      saveDisabled,
      saving: savingLine,
    });

    return () => onNavHandlersChange(null);
  }, [step, draft?.lignes?.length, savingLine, onNavHandlersChange]);

  const renderMetierStep = () => (
    <>
      {!entrepriseId ? (
        <Text style={styles.infoText}>Entreprise non disponible. Connectez-vous apres synchronisation.</Text>
      ) : loadingMetiers ? (
        <ActivityIndicator size="large" color={chantierColors.primary} style={styles.loader} />
      ) : metiers.length === 0 ? (
        <Text style={styles.infoText}>Aucun metier disponible. Connectez-vous en ligne pour synchroniser le catalogue depuis Supabase.</Text>
      ) : (
        <View style={styles.choiceList}>
          {metiers.map((metier) => (
            <Button
              key={metier.id}
              mode={draft?.metier?.id === metier.id ? 'contained' : 'outlined'}
              onPress={() => handleChooseMetier(metier)}
              style={styles.choiceButton}
              contentStyle={styles.choiceButtonContent}
              buttonColor={draft?.metier?.id === metier.id ? chantierColors.primary : chantierColors.surface}
              textColor={draft?.metier?.id === metier.id ? '#FFFFFF' : chantierColors.text}
            >
              {metier.nom}
            </Button>
          ))}
        </View>
      )}
      <FlowBackFab onPress={onBackToChantiers} smallCountBelow={0} />
    </>
  );

  const renderOuvrageStep = () => {
    const fabSmallCount = isAdminRole ? 1 : 0;

    return (
      <>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: getFabColumnPadding(fabSmallCount) },
          ]}
        >
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {draft?.metier?.nom}
          </Text>
          {loadingOuvrages ? (
            <ActivityIndicator size="large" color={chantierColors.primary} style={styles.loader} />
          ) : ouvrages.length === 0 ? (
            <Text style={styles.infoText}>
              {isAdminRole
                ? 'Aucun ouvrage pour ce metier. Utilisez + pour en creer un.'
                : 'Aucun ouvrage pour votre entreprise. Synchronisez le catalogue ou demandez a un admin d en ajouter.'}
            </Text>
          ) : (
            <View style={styles.chipWrap}>
              {ouvrages.map((ouvrage) => (
                <Chip
                  key={ouvrage.id}
                  selected={draft?.ouvrage?.id === ouvrage.id}
                  onPress={() => handleChooseOuvrage(ouvrage)}
                  style={styles.chip}
                  selectedColor={chantierColors.primary}
                >
                  {ouvrage.nom}
                </Chip>
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
        {isAdminRole ? (
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
        }
      : null;

    return (
      <>
        <View style={styles.dimensionsContent}>
          <PaveSaisieOneHand
            key={editingLigneId || ouvrageUnite?.ouvrage_unite_id || 'saisie'}
            ref={saisieRef}
            hideInternalSaveButton
            ouvrageUniteId={ouvrageUnite?.ouvrage_unite_id || ''}
            prixUnitaireApplique={ouvrageUnite?.prix_unitaire || 0}
            isDimension={Number(ouvrageUnite?.ind_dimension) === 1}
            uniteFormule={ouvrageUnite?.formule || ''}
            nomUnite={ouvrageUnite?.nom_unite || ''}
            initialValues={initialValues}
            fabSmallCountBelow={isEditingLine ? 0 : 1}
            onSaveLine={handleSaveLine}
            onValidityChange={setFormComplete}
          />
        </View>
        {!isEditingLine ? (
          <FlowActionFab
            icon="plus"
            color={flowFabColors.primary}
            smallCountBelow={1}
            onPress={handlePlusPress}
            loading={savingLine}
            disabled={savingLine || !formComplete}
            allowPressWhenDisabled
          />
        ) : null}
        <FlowSmallFab
          icon="format-list-bulleted"
          tierFromBottom={0}
          side="right"
          color="#FACC15"
          iconColor="#000000"
          preserveOpacityWhenDisabled
          onPress={handleShowRecap}
          disabled={
            savingLine ||
            (isEditingLine ? !formComplete : !formComplete && !draft?.lignes?.length)
          }
        />
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
            onLignePress={handleEditLigne}
            onLigneDoublePress={handleDeleteLigne}
          />
        )}
      </ScrollView>
      <FlowActionFab
        icon="plus"
        color={flowFabColors.primary}
        smallCountBelow={isEditingChantier ? 1 : 0}
        onPress={handleContinuerRecap}
      />
      {isEditingChantier ? (
        <FlowSmallFab icon="delete" tierFromBottom={0} onPress={handleDeleteChantierPress} />
      ) : null}
    </>
  );

  const screenTitle =
    step === 'recap'
      ? 'Récapitulatif'
      : step === 'dimensions' && draft?.ouvrage?.nom
        ? draft.ouvrage.nom
        : 'Nouvelle dimension';

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
  },
  scrollContent: {
    paddingBottom: 120,
    gap: 12,
  },
  dimensionsContent: {
    flex: 1,
    minHeight: 0,
  },
  choiceList: {
    gap: 10,
    paddingBottom: getFabColumnPadding(0),
  },
  choiceButton: {
    borderColor: chantierColors.border,
  },
  choiceButtonContent: {
    minHeight: 62,
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
