import { createServerSupabaseClient } from '@/lib/supabase/server';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

const mapMetierRow = (row) => ({
  id: row.id,
  nom: row.nom || '',
  abbrev: row.abbrev || '',
  ind_custom: Number(row.ind_default) === 1 ? 0 : 1,
  ordre: row.ordre ?? 0,
  ind_actif: row.ind_actif ?? 1,
});

export async function fetchMetiersCatalogueList({ entrepriseId } = {}) {
  if (!entrepriseId) return [];

  const supabase = createServerSupabaseClient();

  const { data: metiers, error: metiersError } = await ACTIVE_FILTER(
    supabase
      .from('metiers')
      .select('id, nom, abbrev, ordre, ind_actif, ind_default, supprime_le')
      .eq('entreprise_id', entrepriseId)
      .eq('ind_actif', 1)
  )
    .order('ordre', { ascending: true })
    .order('nom', { ascending: true });

  if (metiersError) {
    throw new Error(metiersError.message || 'Erreur chargement métiers.');
  }

  const { data: itemRows, error: itemsError } = await ACTIVE_FILTER(
    supabase
      .from('ouvrages')
      .select('metier_id, ind_article')
      .eq('entreprise_id', entrepriseId)
  );

  if (itemsError) {
    throw new Error(itemsError.message || 'Erreur chargement catalogue.');
  }

  const ouvrageCountByMetierId = new Map();
  const articleCountByMetierId = new Map();
  (itemRows || []).forEach((row) => {
    const key = row.metier_id;
    if (Number(row.ind_article) === 1) {
      articleCountByMetierId.set(key, (articleCountByMetierId.get(key) || 0) + 1);
    } else {
      ouvrageCountByMetierId.set(key, (ouvrageCountByMetierId.get(key) || 0) + 1);
    }
  });

  return (metiers || []).map((row) => ({
    ...mapMetierRow(row),
    ouvrage_count: ouvrageCountByMetierId.get(row.id) || 0,
    article_count: articleCountByMetierId.get(row.id) || 0,
  }));
}

export async function fetchMetierById(metierId, { entrepriseId } = {}) {
  if (!metierId || !entrepriseId) return null;

  const supabase = createServerSupabaseClient();

  const { data: row, error } = await ACTIVE_FILTER(
    supabase
      .from('metiers')
      .select('id, nom, abbrev, ordre, ind_actif, ind_default, supprime_le')
      .eq('entreprise_id', entrepriseId)
      .eq('id', metierId)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement métier.');
  if (!row?.id || row.supprime_le || Number(row.ind_actif) === 0) return null;

  return mapMetierRow(row);
}
