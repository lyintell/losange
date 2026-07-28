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

  const [{ data: lignes, error }, { data: sectionReleves, error: sectionRelevesError }] =
    await Promise.all([
      supabase
        .from('ligne_releves')
        .select(
          `
      id,
      releve_id,
      ouvrage_unite_id,
      section_id,
      largeur,
      hauteur,
      profondeur,
      nombre,
      quantite,
      prix_unitaire_applique,
      montant,
      note,
      note_2,
      ind_complete,
      ordre,
      metier_ordre,
      sections (
        nom
      ),
      ouvrage_unites!inner (
        prix_unitaire,
        unites!inner (
          nom_unite,
          formule,
          ind_dimension
        ),
        ouvrages!inner (
          nom,
          nom_devis,
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
        .order('ordre', { ascending: true })
        .order('cree_le', { ascending: true }),
      supabase
        .from('section_releves')
        .select('section_id, ordre')
        .eq('releve_id', releveId)
        .is('supprime_le', null),
    ]);

  if (error) throw new Error(error.message || 'Erreur chargement lignes.');
  if (sectionRelevesError) {
    throw new Error(sectionRelevesError.message || 'Erreur chargement sections relevé.');
  }

  const sectionOrdreById = new Map(
    (sectionReleves || []).map((row) => [row.section_id, row.ordre])
  );

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
      note_2: ligne.note_2,
      ind_complete: ligne.ind_complete,
      ordre: ligne.ordre,
      metier_ordre: ligne.metier_ordre ?? 0,
      section_id: ligne.section_id || null,
      section_nom: ligne.sections?.nom || null,
      section_ordre: sectionOrdreById.get(ligne.section_id) ?? null,
      releve_date_facture: releve.date_facture,
      ouvrage_nom: ouvrage?.nom,
      ouvrage_nom_devis: ouvrage?.nom_devis || null,
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
