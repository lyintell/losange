import { createServerSupabaseClient } from '@/lib/supabase/server';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

function mapOuvrageUniteRow(row) {
  const unite = row.unites || {};
  return {
    ouvrage_unite_id: row.id,
    ouvrage_id: row.ouvrage_id,
    unite_id: row.unite_id,
    prix_unitaire: row.prix_unitaire,
    nom: unite.nom || '',
    formule: unite.formule || '',
    nom_unite: unite.nom_unite || '',
    ind_dimension: unite.ind_dimension ?? 0,
  };
}

export async function fetchOuvragesByMetierId(metierId, { entrepriseId } = {}) {
  if (!metierId) return [];

  const supabase = createServerSupabaseClient();

  let query = ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select('id, nom, metier_id, entreprise_id, ordre, cree_le, metiers ( nom )')
      .eq('metier_id', metierId)
      .eq('ind_article', 0)
  ).order('ordre', { ascending: true }).order('nom', { ascending: true });

  if (entrepriseId) {
    query = query.eq('entreprise_id', entrepriseId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Erreur chargement ouvrages.');

  const ouvrageIds = (data || []).map((row) => row.id);
  const unitesByOuvrageId = await fetchUnitesByOuvrageIds(ouvrageIds);

  return (data || []).map((row, index) => {
    const unites = unitesByOuvrageId.get(row.id) || [];
    return {
      id: row.id,
      nom: row.nom,
      metier_id: row.metier_id,
      metier_nom: row.metiers?.nom || '',
      entreprise_id: row.entreprise_id,
      ordre: row.ordre ?? 0,
      cree_le: row.cree_le,
      unite_count: unites.length,
      unites,
      numero: `#${String(index + 1).padStart(3, '0')}`,
    };
  });
}

export async function fetchOuvragesList({ entrepriseId } = {}) {
  const supabase = createServerSupabaseClient();

  let query = ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select('id, nom, metier_id, entreprise_id, cree_le, metiers ( nom )')
      .eq('ind_article', 0)
  ).order('nom', { ascending: true });

  if (entrepriseId) {
    query = query.eq('entreprise_id', entrepriseId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Erreur chargement ouvrages.');

  const ouvrageIds = (data || []).map((row) => row.id);
  const unitesByOuvrageId = await fetchUnitesByOuvrageIds(ouvrageIds);

  return (data || [])
    .map((row) => {
      const unites = unitesByOuvrageId.get(row.id) || [];
      return {
        id: row.id,
        nom: row.nom,
        metier_id: row.metier_id,
        metier_nom: row.metiers?.nom || '',
        entreprise_id: row.entreprise_id,
        cree_le: row.cree_le,
        unite_count: unites.length,
        unites,
      };
    })
    .sort((a, b) => {
      const metierCmp = (a.metier_nom || '').localeCompare(b.metier_nom || '', 'fr');
      if (metierCmp !== 0) return metierCmp;
      return (a.nom || '').localeCompare(b.nom || '', 'fr');
    })
    .map((row, index) => ({
      ...row,
      numero: `#${String(index + 1).padStart(3, '0')}`,
    }));
}

export async function fetchOuvrageById(ouvrageId, { entrepriseId } = {}) {
  if (!ouvrageId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select('id, nom, nom_devis, metier_id, entreprise_id, ind_article, cree_le, metiers ( nom )')
      .eq('id', ouvrageId)
      .eq('ind_article', 0)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement ouvrage.');
  if (!data) return null;
  if (entrepriseId && data.entreprise_id !== entrepriseId) return null;

  const unites = await fetchOuvrageUnites(ouvrageId);

  return {
    id: data.id,
    nom: data.nom,
    nom_devis: data.nom_devis || '',
    metier_id: data.metier_id,
    metier_nom: data.metiers?.nom || '',
    entreprise_id: data.entreprise_id,
    ind_article: data.ind_article,
    cree_le: data.cree_le,
    unites,
  };
}

export async function fetchOuvrageUnites(ouvrageId) {
  if (!ouvrageId) return [];

  const unitesByOuvrageId = await fetchUnitesByOuvrageIds([ouvrageId]);
  return unitesByOuvrageId.get(ouvrageId) || [];
}

export async function fetchUnitesByOuvrageIds(ouvrageIds = []) {
  if (!ouvrageIds.length) return new Map();

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('ouvrage_unites')
      .select(
        `
        id,
        ouvrage_id,
        unite_id,
        prix_unitaire,
        unites (
          nom,
          formule,
          nom_unite,
          ind_dimension
        )
      `
      )
      .in('ouvrage_id', ouvrageIds)
  ).order('cree_le', { ascending: true });

  if (error) throw new Error(error.message || 'Erreur chargement unités ouvrage.');

  const byOuvrageId = new Map();
  (data || []).forEach((row) => {
    const mapped = mapOuvrageUniteRow(row);
    const list = byOuvrageId.get(row.ouvrage_id) || [];
    list.push(mapped);
    byOuvrageId.set(row.ouvrage_id, list);
  });

  return byOuvrageId;
}

export async function fetchCatalogueUnites() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('unites')
    .select('id, nom, formule, nom_unite, ind_dimension')
    .order('nom', { ascending: true });

  if (error) throw new Error(error.message || 'Erreur chargement catalogue unités.');
  return data || [];
}

export async function updateOuvrage(
  ouvrageId,
  { nom, nomDevis, unites = [] },
  { entrepriseId } = {}
) {
  const trimmedNom = nom?.trim();
  if (!ouvrageId || !trimmedNom) {
    throw new Error("Le nom de l'ouvrage est requis.");
  }

  const existing = await fetchOuvrageById(ouvrageId, { entrepriseId });
  if (!existing) throw new Error('Ouvrage introuvable.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const trimmedNomDevis =
    nomDevis === undefined ? existing.nom_devis || null : String(nomDevis || '').trim() || null;

  const { error: ouvrageError } = await supabase
    .from('ouvrages')
    .update({
      nom: trimmedNom,
      nom_devis: trimmedNomDevis,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', ouvrageId)
    .is('supprime_le', null);

  if (ouvrageError) throw new Error(ouvrageError.message || 'Erreur mise à jour ouvrage.');

  for (const unite of unites) {
    if (!unite?.ouvrageUniteId) continue;
    if (!unite?.uniteId) {
      throw new Error('Unité requise.');
    }

    const prix = Number(unite.prixUnitaire);
    if (!Number.isFinite(prix) || prix < 0) {
      throw new Error('Prix unitaire invalide.');
    }

    const { error: uniteError } = await supabase
      .from('ouvrage_unites')
      .update({
        unite_id: unite.uniteId,
        prix_unitaire: prix,
        mis_a_jour_le: now,
        _synced: 0,
      })
      .eq('id', unite.ouvrageUniteId)
      .eq('ouvrage_id', ouvrageId)
      .is('supprime_le', null);

    if (uniteError) throw new Error(uniteError.message || 'Erreur mise à jour unité.');
  }

  return fetchOuvrageById(ouvrageId, { entrepriseId });
}

async function getNextOuvrageOrdre(supabase, metierId, entrepriseId) {
  const { data, error } = await supabase
    .from('ouvrages')
    .select('ordre')
    .eq('metier_id', metierId)
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur lecture ordre ouvrage.');
  return Number(data?.ordre ?? -1) + 1;
}

export async function createOuvrage(
  { metierId, nom, nomDevis, unites = [] },
  { entrepriseId } = {}
) {
  const trimmedNom = nom?.trim();
  if (!metierId || !entrepriseId || !trimmedNom) {
    throw new Error("Le métier et le nom de l'ouvrage sont requis.");
  }

  const trimmedNomDevis = String(nomDevis || '').trim() || null;

  const primaryUnite = unites[0];
  if (!primaryUnite?.uniteId) {
    throw new Error('Unité requise.');
  }

  const prix = Number(primaryUnite.prixUnitaire);
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error('Prix unitaire invalide.');
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const ouvrageId = crypto.randomUUID();
  const ouvrageUniteId = crypto.randomUUID();
  const ordre = await getNextOuvrageOrdre(supabase, metierId, entrepriseId);

  const { error: ouvrageError } = await supabase.from('ouvrages').insert({
    id: ouvrageId,
    metier_id: metierId,
    entreprise_id: entrepriseId,
    nom: trimmedNom,
    nom_devis: trimmedNomDevis,
    ind_article: 0,
    ind_actif: 1,
    ordre,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (ouvrageError) throw new Error(ouvrageError.message || 'Erreur création ouvrage.');

  const { error: uniteError } = await supabase.from('ouvrage_unites').insert({
    id: ouvrageUniteId,
    ouvrage_id: ouvrageId,
    unite_id: primaryUnite.uniteId,
    prix_unitaire: prix,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (uniteError) throw new Error(uniteError.message || 'Erreur création unité ouvrage.');

  const created = await fetchOuvrageById(ouvrageId, { entrepriseId });
  return {
    ...created,
    ordre,
    unite_count: created?.unites?.length || 0,
  };
}
