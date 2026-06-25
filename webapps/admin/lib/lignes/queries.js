import { createServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeReleveRow } from '@/lib/chantiers/releveNormalize';

export async function fetchLignesByReleveId(releveId) {
  const supabase = createServerSupabaseClient();

  const { data: releve, error: releveError } = await supabase
    .from('releves')
    .select('*')
    .eq('id', releveId)
    .is('supprime_le', null)
    .maybeSingle();

  if (releveError) throw new Error(releveError.message || 'Erreur chargement relevé.');
  if (!releve) return { releve: null, lignes: [] };

  const { data: lignes, error } = await supabase
    .from('ligne_releves')
    .select(
      `
      id,
      releve_id,
      ouvrage_unite_id,
      largeur,
      hauteur,
      profondeur,
      nombre,
      quantite,
      prix_unitaire_applique,
      montant,
      note,
      ind_complete,
      ouvrage_unites!inner (
        prix_unitaire,
        unites!inner (
          nom_unite,
          formule,
          ind_dimension
        ),
        ouvrages!inner (
          nom,
          metier_id,
          metiers!inner (
            id,
            nom
          )
        )
      )
    `
    )
    .eq('releve_id', releveId)
    .is('supprime_le', null)
    .order('cree_le', { ascending: true });

  if (error) throw new Error(error.message || 'Erreur chargement lignes.');

  const normalized = (lignes || []).map((ligne) => {
    const ou = ligne.ouvrage_unites;
    const unite = ou?.unites;
    const ouvrage = ou?.ouvrages;
    const metier = ouvrage?.metiers;

    return {
      id: ligne.id,
      releve_id: ligne.releve_id,
      ouvrage_unite_id: ligne.ouvrage_unite_id,
      largeur: ligne.largeur,
      hauteur: ligne.hauteur,
      profondeur: ligne.profondeur,
      nombre: ligne.nombre,
      quantite: ligne.quantite,
      prix_unitaire_applique: ligne.prix_unitaire_applique,
      prix_unitaire: ou?.prix_unitaire,
      montant: ligne.montant,
      note: ligne.note,
      ind_complete: ligne.ind_complete,
      releve_date_facture: releve.date_facture,
      ouvrage_nom: ouvrage?.nom,
      metier_id: metier?.id,
      metier_nom: metier?.nom,
      nom_unite: unite?.nom_unite,
      formule: unite?.formule,
      ind_dimension: unite?.ind_dimension,
    };
  });

  return { releve: normalizeReleveRow(releve), lignes: normalized };
}

export async function fetchLignesByChantierId(chantierId) {
  const supabase = createServerSupabaseClient();

  const { data: releves, error: relevesError } = await supabase
    .from('releves')
    .select('id')
    .eq('chantier_id', chantierId)
    .is('supprime_le', null);

  if (relevesError) throw new Error(relevesError.message || 'Erreur chargement relevés.');

  const allLignes = [];
  for (const releve of releves || []) {
    const { lignes } = await fetchLignesByReleveId(releve.id);
    allLignes.push(...lignes);
  }

  return allLignes;
}
