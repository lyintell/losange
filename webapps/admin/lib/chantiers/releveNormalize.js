import { normalizeReleveStatus } from '@/lib/chantiers/releveStatus';

/** Valeurs par défaut si la colonne n'existe pas encore côté Supabase. */
export function normalizeReleveRow(releve) {
  if (!releve) return null;
  return {
    ...releve,
    remise: Number(releve.remise) || 0,
    ind_tva: Number(releve.ind_tva) === 1 ? 1 : 0,
    status: normalizeReleveStatus(releve.status),
  };
}
