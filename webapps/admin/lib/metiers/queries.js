import { createServerSupabaseClient } from '@/lib/supabase/server';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

export async function fetchMetiersCatalogueList({ entrepriseId, catalogueKind = 'ouvrage' } = {}) {
  if (!entrepriseId) return [];

  const supabase = createServerSupabaseClient();
  const indArticle = catalogueKind === 'article' ? 1 : 0;

  const { data: links, error: linksError } = await ACTIVE_FILTER(
    supabase
      .from('metiers_entreprise')
      .select(
        `
        metier_id,
        ordre,
        ind_actif,
        metiers (
          id,
          nom,
          abbrev,
          entreprise_id,
          supprime_le
        )
      `
      )
      .eq('entreprise_id', entrepriseId)
  ).order('ordre', { ascending: true });

  if (linksError) {
    throw new Error(linksError.message || 'Erreur chargement métiers.');
  }

  const metiers = (links || [])
    .map((row) => {
      const metier = row.metiers;
      if (!metier?.id || metier.supprime_le) return null;
      return {
        id: metier.id,
        nom: metier.nom || '',
        abbrev: metier.abbrev || '',
        ind_custom: metier.entreprise_id ? 1 : 0,
        ordre: row.ordre ?? 0,
        ind_actif: row.ind_actif ?? 1,
      };
    })
    .filter(Boolean);

  const { data: itemRows, error: itemsError } = await ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select('metier_id')
      .eq('entreprise_id', entrepriseId)
      .eq('ind_article', indArticle)
  );

  if (itemsError) {
    throw new Error(itemsError.message || 'Erreur chargement catalogue.');
  }

  const countByMetierId = new Map();
  (itemRows || []).forEach((row) => {
    const key = row.metier_id;
    countByMetierId.set(key, (countByMetierId.get(key) || 0) + 1);
  });

  return metiers.map((metier) => ({
    ...metier,
    item_count: countByMetierId.get(metier.id) || 0,
  }));
}

export async function fetchMetierById(metierId, { entrepriseId } = {}) {
  if (!metierId || !entrepriseId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('metiers_entreprise')
      .select(
        `
        metier_id,
        ordre,
        ind_actif,
        metiers (
          id,
          nom,
          abbrev,
          entreprise_id,
          supprime_le
        )
      `
      )
      .eq('entreprise_id', entrepriseId)
      .eq('metier_id', metierId)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement métier.');
  if (!data?.metiers?.id || data.metiers.supprime_le) return null;

  return {
    id: data.metiers.id,
    nom: data.metiers.nom || '',
    abbrev: data.metiers.abbrev || '',
    ind_custom: data.metiers.entreprise_id ? 1 : 0,
    ordre: data.ordre ?? 0,
    ind_actif: data.ind_actif ?? 1,
  };
}
