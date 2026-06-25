let draftDimensionFlow = null;

export const startDraftDimensionFlow = () => {
  draftDimensionFlow = {
    id: `draft-${Date.now()}`,
    startedAt: new Date().toISOString(),
    clientId: null,
    chantierId: null,
    releveId: null,
    metier: null,
    ouvrage: null,
    ouvrageUnite: null,
    catalogueKind: 'ouvrage',
    lignes: [],
    uiStep: 'metier',
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

export const addLigneToDraft = (ligne) => {
  if (!draftDimensionFlow) return null;
  const entry = {
    id: `ligne-${Date.now()}-${draftDimensionFlow.lignes.length}`,
    ...ligne,
  };
  draftDimensionFlow.lignes = [...draftDimensionFlow.lignes, entry];
  return entry;
};

export const updateLigneInDraft = (ligneId, updates) => {
  if (!draftDimensionFlow) return null;
  const index = draftDimensionFlow.lignes.findIndex((item) => item.id === ligneId);
  if (index < 0) return null;
  draftDimensionFlow.lignes[index] = { ...draftDimensionFlow.lignes[index], ...updates };
  return { ...draftDimensionFlow.lignes[index] };
};

export const removeLigneFromDraft = (ligneId) => {
  if (!draftDimensionFlow) return null;
  draftDimensionFlow.lignes = draftDimensionFlow.lignes.filter((item) => item.id !== ligneId);
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
}) => {
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
    ouvrage: null,
    ouvrageUnite: null,
    catalogueKind: 'ouvrage',
    lignes: lignes.map((ligne) => ({
      id: ligne.id,
      ouvrage_unite_id: ligne.ouvrage_unite_id,
      ouvrage_nom: ligne.ouvrage_nom,
      metier_id: ligne.metier_id,
      metier_nom: ligne.metier_nom,
      nom_unite: ligne.nom_unite,
      ind_dimension: ligne.ind_dimension ?? 0,
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
    })),
    uiStep: 'recap',
  };
  return { ...draftDimensionFlow };
};
