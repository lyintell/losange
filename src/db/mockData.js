import { buildSectionOrderFromLignes } from '../utils/groupLignesBySection';

let draftDimensionFlow = null;

const syncDraftSectionOrdreOnLignes = () => {
  if (!draftDimensionFlow) return;
  const sectionOrder = draftDimensionFlow.sectionOrder || [];
  const ordreBySection = new Map(sectionOrder.map((id, index) => [id, index]));
  draftDimensionFlow.lignes = (draftDimensionFlow.lignes || []).map((ligne) => ({
    ...ligne,
    section_ordre: ordreBySection.get(ligne.section_id) ?? 0,
  }));
};

const ensureSectionOrderEntry = (sectionId) => {
  if (!draftDimensionFlow || !sectionId || sectionId === 'sans-section') return;
  const order = Array.isArray(draftDimensionFlow.sectionOrder)
    ? [...draftDimensionFlow.sectionOrder]
    : [];
  if (!order.includes(sectionId)) {
    draftDimensionFlow.sectionOrder = [...order, sectionId];
    syncDraftSectionOrdreOnLignes();
  }
};

export const startDraftDimensionFlow = () => {
  draftDimensionFlow = {
    id: `draft-${Date.now()}`,
    startedAt: new Date().toISOString(),
    clientId: null,
    chantierId: null,
    releveId: null,
    metier: null,
    section: null,
    ouvrage: null,
    ouvrageUnite: null,
    catalogueKind: 'ouvrage',
    lignes: [],
    sectionOrder: [],
    uiStep: 'section',
    editMode: false,
  };
  return { ...draftDimensionFlow };
};

export const updateDraftDimensionFlow = (updates) => {
  if (!draftDimensionFlow) return null;
  draftDimensionFlow = { ...draftDimensionFlow, ...updates };
  return { ...draftDimensionFlow };
};

export const setDraftUiStep = (uiStep) => updateDraftDimensionFlow({ uiStep });

const renormalizeDraftLigneOrdre = () => {
  if (!draftDimensionFlow?.lignes?.length) return;
  draftDimensionFlow.lignes = draftDimensionFlow.lignes.map((ligne, index) => ({
    ...ligne,
    ordre: index,
  }));
};

export const addLigneToDraft = (ligne) => {
  if (!draftDimensionFlow) return null;
  const existing = draftDimensionFlow.lignes || [];
  const maxOrdre = existing.reduce((max, item) => Math.max(max, Number(item.ordre) || 0), -1);
  const entry = {
    id: `ligne-${Date.now()}-${maxOrdre + 1}`,
    ordre: maxOrdre + 1,
    ...ligne,
  };
  draftDimensionFlow.lignes = [...existing, entry];
  ensureSectionOrderEntry(entry.section_id);
  syncDraftSectionOrdreOnLignes();
  return entry;
};

export const updateLigneInDraft = (ligneId, updates) => {
  if (!draftDimensionFlow) return null;
  const index = draftDimensionFlow.lignes.findIndex((item) => item.id === ligneId);
  if (index < 0) return null;
  draftDimensionFlow.lignes[index] = { ...draftDimensionFlow.lignes[index], ...updates };
  ensureSectionOrderEntry(draftDimensionFlow.lignes[index].section_id);
  syncDraftSectionOrdreOnLignes();
  return { ...draftDimensionFlow.lignes[index] };
};

export const removeLigneFromDraft = (ligneId) => {
  if (!draftDimensionFlow) return null;
  draftDimensionFlow.lignes = draftDimensionFlow.lignes.filter((item) => item.id !== ligneId);

  const remainingSectionIds = new Set(
    draftDimensionFlow.lignes.map((ligne) => ligne.section_id).filter(Boolean)
  );
  draftDimensionFlow.sectionOrder = (draftDimensionFlow.sectionOrder || []).filter((sectionId) =>
    remainingSectionIds.has(sectionId)
  );
  renormalizeDraftLigneOrdre();
  syncDraftSectionOrdreOnLignes();

  return { ...draftDimensionFlow };
};

export const reorderDraftSections = (orderedSectionIds = []) => {
  if (!draftDimensionFlow) return null;

  draftDimensionFlow.sectionOrder = [...orderedSectionIds];
  syncDraftSectionOrdreOnLignes();

  return { ...draftDimensionFlow };
};

export const reorderDraftLignesInSection = (sectionId, reorderedSectionLignes = []) => {
  if (!draftDimensionFlow || !sectionId || !reorderedSectionLignes.length) return null;

  const allLignes = draftDimensionFlow.lignes || [];
  const sectionOrdreValues = allLignes
    .filter((ligne) => ligne.section_id === sectionId)
    .map((ligne) => Number(ligne.ordre) || 0)
    .sort((left, right) => left - right);

  const updatesById = new Map(
    reorderedSectionLignes.map((ligne, index) => [
      ligne.id,
      {
        ...ligne,
        ordre: sectionOrdreValues[index] ?? index,
      },
    ])
  );

  draftDimensionFlow.lignes = allLignes.map((ligne) => updatesById.get(ligne.id) || ligne);
  return { ...draftDimensionFlow };
};

export const changeDraftSectionForLignes = (fromSectionId, newSection) => {
  if (!draftDimensionFlow || !fromSectionId || !newSection?.id) return null;
  if (fromSectionId === newSection.id) return { ...draftDimensionFlow };

  draftDimensionFlow.sectionOrder = (draftDimensionFlow.sectionOrder || []).map((sectionId) =>
    sectionId === fromSectionId ? newSection.id : sectionId
  );
  if (!(draftDimensionFlow.sectionOrder || []).includes(newSection.id)) {
    draftDimensionFlow.sectionOrder = [...(draftDimensionFlow.sectionOrder || []), newSection.id];
  }

  draftDimensionFlow.lignes = (draftDimensionFlow.lignes || []).map((ligne) =>
    ligne.section_id === fromSectionId
      ? {
          ...ligne,
          section_id: newSection.id,
          section_nom: newSection.nom,
        }
      : ligne
  );
  syncDraftSectionOrdreOnLignes();
  return { ...draftDimensionFlow };
};

export const getDraftDimensionFlow = () => (draftDimensionFlow ? { ...draftDimensionFlow } : null);

export const clearDraftDimensionFlow = () => {
  draftDimensionFlow = null;
};

export const startDraftFromChantierEdit = ({
  chantier,
  lignes = [],
  releveId = null,
  releveRemise = 0,
  releveIndTva = 0,
  sectionOrder = null,
}) => {
  const mappedLignes = lignes.map((ligne, index) => ({
    id: ligne.id,
    ouvrage_unite_id: ligne.ouvrage_unite_id,
    ouvrage_nom: ligne.ouvrage_nom,
    metier_id: ligne.metier_id,
    metier_nom: ligne.metier_nom,
    nom_unite: ligne.nom_unite,
    ind_dimension: ligne.ind_dimension ?? 0,
    section_id: ligne.section_id || null,
    section_nom: ligne.section_nom || null,
    section_ordre: Number(ligne.section_ordre) || 0,
    ordre: Number.isFinite(Number(ligne.ordre)) ? Number(ligne.ordre) : index,
    largeur: ligne.largeur,
    hauteur: ligne.hauteur,
    profondeur: ligne.profondeur,
    nombre: ligne.nombre,
    quantite: ligne.quantite,
    prix_unitaire_applique: ligne.prix_unitaire_applique,
    montant: ligne.montant,
    note: ligne.note || null,
    photo: ligne.photo || null,
    ind_complete: Number(ligne.ind_complete) === 1 ? 1 : 0,
  }));

  const resolvedSectionOrder =
    Array.isArray(sectionOrder) && sectionOrder.length
      ? [...sectionOrder]
      : buildSectionOrderFromLignes(mappedLignes);

  draftDimensionFlow = {
    id: `draft-edit-${chantier?.id || Date.now()}`,
    startedAt: new Date().toISOString(),
    clientId: chantier?.client_id || null,
    clientNom: chantier?.client_nom || null,
    clientTelephone: chantier?.client_telephone_1 || null,
    chantierId: chantier?.id || null,
    chantierNom: chantier?.nom || null,
    chantierAdresse: chantier?.adresse || null,
    chantierNotes: chantier?.notes || null,
    chantierStatus: chantier?.status || 'D',
    chantierPhotoKeys: {
      photo_1: chantier?.photo_1 || null,
      photo_2: chantier?.photo_2 || null,
      photo_3: chantier?.photo_3 || null,
    },
    releveId: releveId || lignes[0]?.releve_id || null,
    releveRemise: Number(releveRemise) || 0,
    releveIndTva: Number(releveIndTva) === 1 ? 1 : 0,
    editMode: true,
    metier: null,
    section: null,
    ouvrage: null,
    ouvrageUnite: null,
    catalogueKind: 'ouvrage',
    lignes: mappedLignes,
    sectionOrder: resolvedSectionOrder,
    uiStep: 'recap',
  };
  syncDraftSectionOrdreOnLignes();
  return { ...draftDimensionFlow };
};
