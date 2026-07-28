import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  DEFAULT_SECTION_NOM,
  isDefaultSectionNom,
  sortSectionsForSelection,
} from '@/lib/format/defaultSection';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

export async function ensureDefaultSection(entrepriseId) {
  if (!entrepriseId) throw new Error('Entreprise requise.');

  const supabase = createServerSupabaseClient();
  const { data: existing, error } = await ACTIVE_FILTER(
    supabase
      .from('sections')
      .select('id, nom, entreprise_id')
      .eq('entreprise_id', entrepriseId)
      .ilike('nom', DEFAULT_SECTION_NOM)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement section par défaut.');
  if (existing?.id) return existing;

  return createSection(entrepriseId, DEFAULT_SECTION_NOM);
}

export async function fetchSectionsByEntreprise(entrepriseId) {
  if (!entrepriseId) return [];

  await ensureDefaultSection(entrepriseId);

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase.from('sections').select('id, nom, entreprise_id, cree_le').eq('entreprise_id', entrepriseId)
  ).order('nom', { ascending: true });

  if (error) throw new Error(error.message || 'Erreur chargement sections.');
  return sortSectionsForSelection(data || []);
}

export async function createSection(entrepriseId, nom) {
  const trimmed = String(nom || '').trim();
  if (!entrepriseId) throw new Error('Entreprise requise.');
  if (!trimmed) throw new Error('Nom de section requis.');

  const supabase = createServerSupabaseClient();

  const { data: existing, error: existingError } = await ACTIVE_FILTER(
    supabase
      .from('sections')
      .select('id, nom, entreprise_id')
      .eq('entreprise_id', entrepriseId)
      .ilike('nom', trimmed)
  ).maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Erreur vérification section.');
  }
  if (existing?.id) return existing;

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from('sections')
    .insert({
      id,
      nom: isDefaultSectionNom(trimmed) ? DEFAULT_SECTION_NOM : trimmed,
      entreprise_id: entrepriseId,
      cree_le: now,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .select('id, nom, entreprise_id')
    .single();

  if (error) throw new Error(error.message || 'Erreur création section.');
  return data;
}
