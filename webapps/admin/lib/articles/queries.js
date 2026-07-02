import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchCatalogueUnites, fetchOuvrageUnites, fetchUnitesByOuvrageIds } from '@/lib/ouvrages/queries';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

function parseOptionalPrix(value, label = 'Prix de revient') {
  const raw = String(value ?? '').trim();
  if (!raw.length) return null;
  const prix = Number(raw);
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error(`${label} invalide.`);
  }
  return Math.round(prix);
}

export { fetchCatalogueUnites };

export async function fetchArticlesByMetierId(metierId, { entrepriseId } = {}) {
  if (!metierId) return [];

  const supabase = createServerSupabaseClient();

  let query = ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select(
        `
        id,
        nom,
        metier_id,
        entreprise_id,
        ordre,
        fournisseur_id,
        cree_le,
        metiers ( nom ),
        fournisseurs ( nom )
      `
      )
      .eq('metier_id', metierId)
      .eq('ind_article', 1)
  ).order('ordre', { ascending: true }).order('nom', { ascending: true });

  if (entrepriseId) {
    query = query.eq('entreprise_id', entrepriseId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Erreur chargement articles.');

  const articleIds = (data || []).map((row) => row.id);
  const unitesByArticleId = await fetchUnitesByOuvrageIds(articleIds);

  return (data || []).map((row, index) => {
    const unites = unitesByArticleId.get(row.id) || [];
    return {
      id: row.id,
      nom: row.nom,
      metier_id: row.metier_id,
      metier_nom: row.metiers?.nom || '',
      fournisseur_id: row.fournisseur_id || null,
      fournisseur_nom: row.fournisseurs?.nom || '',
      entreprise_id: row.entreprise_id,
      ordre: row.ordre ?? 0,
      cree_le: row.cree_le,
      unite_count: unites.length,
      unites,
      numero: `#${String(index + 1).padStart(3, '0')}`,
    };
  });
}

export async function fetchArticlesList({ entrepriseId } = {}) {
  const supabase = createServerSupabaseClient();

  let query = ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select(
        `
        id,
        nom,
        metier_id,
        entreprise_id,
        fournisseur_id,
        cree_le,
        metiers ( nom ),
        fournisseurs ( nom )
      `
      )
      .eq('ind_article', 1)
  ).order('nom', { ascending: true });

  if (entrepriseId) {
    query = query.eq('entreprise_id', entrepriseId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Erreur chargement articles.');

  const articleIds = (data || []).map((row) => row.id);
  const unitesByArticleId = await fetchUnitesByOuvrageIds(articleIds);

  return (data || [])
    .map((row) => {
      const unites = unitesByArticleId.get(row.id) || [];
      return {
        id: row.id,
        nom: row.nom,
        metier_id: row.metier_id,
        metier_nom: row.metiers?.nom || '',
        fournisseur_id: row.fournisseur_id || null,
        fournisseur_nom: row.fournisseurs?.nom || '',
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

export async function fetchArticleById(articleId, { entrepriseId } = {}) {
  if (!articleId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select(
        `
        id,
        nom,
        nom_devis,
        metier_id,
        entreprise_id,
        ind_article,
        fournisseur_id,
        cree_le,
        metiers ( nom ),
        fournisseurs ( nom )
      `
      )
      .eq('id', articleId)
      .eq('ind_article', 1)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement article.');
  if (!data) return null;
  if (entrepriseId && data.entreprise_id !== entrepriseId) return null;

  const unites = await fetchOuvrageUnites(articleId);

  return {
    id: data.id,
    nom: data.nom,
    nom_devis: data.nom_devis || '',
    metier_id: data.metier_id,
    metier_nom: data.metiers?.nom || '',
    entreprise_id: data.entreprise_id,
    ind_article: data.ind_article,
    fournisseur_id: data.fournisseur_id || null,
    fournisseur_nom: data.fournisseurs?.nom || '',
    cree_le: data.cree_le,
    unites,
  };
}

export async function searchFournisseurs({ metierId, entrepriseId, query }) {
  if (!metierId || !entrepriseId || !String(query || '').trim()) return [];

  const supabase = createServerSupabaseClient();
  const term = `%${String(query).trim()}%`;

  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('fournisseurs')
      .select('id, nom, telephone_1, telephone_2')
      .eq('metier_id', metierId)
      .eq('entreprise_id', entrepriseId)
      .or(`nom.ilike.${term},telephone_1.ilike.${term},telephone_2.ilike.${term}`)
  )
    .order('nom', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message || 'Erreur recherche fournisseurs.');
  return data || [];
}

async function findFournisseurByNomExact({ metierId, entrepriseId, nom }) {
  const trimmedNom = String(nom || '').trim();
  if (!trimmedNom || !metierId || !entrepriseId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('fournisseurs')
      .select('id, nom')
      .eq('metier_id', metierId)
      .eq('entreprise_id', entrepriseId)
      .ilike('nom', trimmedNom)
  )
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur fournisseur.');
  return data;
}

async function resolveFournisseurId({ metierId, entrepriseId, fournisseurId, fournisseurNom }) {
  if (fournisseurId) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await ACTIVE_FILTER(
      supabase
        .from('fournisseurs')
        .select('id')
        .eq('id', fournisseurId)
        .eq('metier_id', metierId)
        .eq('entreprise_id', entrepriseId)
    ).maybeSingle();

    if (error) throw new Error(error.message || 'Erreur fournisseur.');
    if (!data) throw new Error('Fournisseur introuvable.');
    return fournisseurId;
  }

  const trimmedNom = String(fournisseurNom || '').trim();
  if (!trimmedNom) return null;

  const existing = await findFournisseurByNomExact({ metierId, entrepriseId, nom: trimmedNom });
  if (existing) return existing.id;

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const { error } = await supabase.from('fournisseurs').insert({
    id,
    metier_id: metierId,
    entreprise_id: entrepriseId,
    nom: trimmedNom,
    telephone_1: '',
    telephone_2: null,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (error) throw new Error(error.message || 'Erreur création fournisseur.');
  return id;
}

export async function updateArticle(
  articleId,
  { nom, nomDevis, unites = [], fournisseurId, fournisseurNom },
  { entrepriseId } = {}
) {
  const trimmedNom = nom?.trim();
  if (!articleId || !trimmedNom) {
    throw new Error("Le nom de l'article est requis.");
  }

  const existing = await fetchArticleById(articleId, { entrepriseId });
  if (!existing) throw new Error('Article introuvable.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const trimmedNomDevis =
    nomDevis === undefined ? existing.nom_devis || null : String(nomDevis || '').trim() || null;

  let resolvedFournisseurId = existing.fournisseur_id ?? null;
  if (fournisseurId !== undefined || fournisseurNom !== undefined) {
    if (!fournisseurId && !String(fournisseurNom || '').trim()) {
      resolvedFournisseurId = null;
    } else {
      resolvedFournisseurId = await resolveFournisseurId({
        metierId: existing.metier_id,
        entrepriseId: existing.entreprise_id,
        fournisseurId: fournisseurId ?? null,
        fournisseurNom,
      });
    }
  }

  const { error: articleError } = await supabase
    .from('ouvrages')
    .update({
      nom: trimmedNom,
      nom_devis: trimmedNomDevis,
      fournisseur_id: resolvedFournisseurId,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', articleId)
    .is('supprime_le', null);

  if (articleError) throw new Error(articleError.message || 'Erreur mise à jour article.');

  for (const unite of unites) {
    if (!unite?.ouvrageUniteId) continue;
    if (!unite?.uniteId) {
      throw new Error('Unité requise.');
    }

    const prix = Math.round(Number(unite.prixUnitaire));
    if (!Number.isFinite(prix) || prix < 0) {
      throw new Error('Prix unitaire invalide.');
    }
    const prixRevient = parseOptionalPrix(unite.prixRevient);

    const { error: uniteError } = await supabase
      .from('ouvrage_unites')
      .update({
        unite_id: unite.uniteId,
        prix_unitaire: prix,
        prix_revient: prixRevient,
        mis_a_jour_le: now,
        _synced: 0,
      })
      .eq('id', unite.ouvrageUniteId)
      .eq('ouvrage_id', articleId)
      .is('supprime_le', null);

    if (uniteError) throw new Error(uniteError.message || 'Erreur mise à jour unité.');
  }

  return fetchArticleById(articleId, { entrepriseId });
}

export async function createArticle(
  { metierId, nom, nomDevis, unites = [], fournisseurId, fournisseurNom },
  { entrepriseId } = {}
) {
  const trimmedNom = nom?.trim();
  if (!metierId || !entrepriseId || !trimmedNom) {
    throw new Error("Le métier et le nom de l'article sont requis.");
  }

  const trimmedNomDevis = String(nomDevis || '').trim() || null;

  const primaryUnite = unites[0];
  if (!primaryUnite?.uniteId) {
    throw new Error('Unité requise.');
  }

  const prix = Math.round(Number(primaryUnite.prixUnitaire));
  if (!Number.isFinite(prix) || prix < 0) {
    throw new Error('Prix unitaire invalide.');
  }
  const prixRevient = parseOptionalPrix(primaryUnite.prixRevient);

  const resolvedFournisseurId = await resolveFournisseurId({
    metierId,
    entrepriseId,
    fournisseurId: fournisseurId ?? null,
    fournisseurNom,
  });

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const articleId = crypto.randomUUID();
  const ouvrageUniteId = crypto.randomUUID();

  const { data: ordreRow, error: ordreError } = await supabase
    .from('ouvrages')
    .select('ordre')
    .eq('metier_id', metierId)
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ordreError) throw new Error(ordreError.message || 'Erreur lecture ordre article.');
  const ordre = Number(ordreRow?.ordre ?? -1) + 1;

  const { error: articleError } = await supabase.from('ouvrages').insert({
    id: articleId,
    metier_id: metierId,
    entreprise_id: entrepriseId,
    nom: trimmedNom,
    nom_devis: trimmedNomDevis,
    ind_article: 1,
    ind_actif: 1,
    fournisseur_id: resolvedFournisseurId,
    ordre,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (articleError) throw new Error(articleError.message || 'Erreur création article.');

  const { error: uniteError } = await supabase.from('ouvrage_unites').insert({
    id: ouvrageUniteId,
    ouvrage_id: articleId,
    unite_id: primaryUnite.uniteId,
    prix_unitaire: prix,
    prix_revient: prixRevient,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (uniteError) throw new Error(uniteError.message || 'Erreur création unité article.');

  const created = await fetchArticleById(articleId, { entrepriseId });
  return {
    ...created,
    ordre,
    unite_count: created?.unites?.length || 0,
  };
}
