import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const FREE_MAX_CLIENTS = 10;
export const FREE_MAX_CHANTiers = 10;
export const FREE_MAX_OUVRAGES_PER_METIER = 10;
export const TERRAIN_IMAGE_BUCKET = 'terrain-files';

const sortByMisAJourLeDesc = <T extends { mis_a_jour_le?: string | null }>(rows: T[]) =>
  [...rows].sort(
    (left, right) =>
      Date.parse(String(right.mis_a_jour_le ?? '')) - Date.parse(String(left.mis_a_jour_le ?? ''))
  );

const activeRows = <T extends { supprime_le?: string | null }>(rows: T[]) =>
  rows.filter((row) => !row.supprime_le);

export const applyProUpgradeFields = (now: string) => ({
  pro_activated_le: now,
  pro_downgraded_le: null,
  mis_a_jour_le: now,
  _synced: 1,
});

const tombstoneRows = async (
  supabase: SupabaseClient,
  tableName: string,
  ids: string[],
  now: string
) => {
  if (!ids.length) return;
  const { error } = await supabase
    .from(tableName)
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
    .in('id', ids);
  if (error) {
    throw new Error(`${tableName}: ${error.message}`);
  }
};

const tombstoneRelevesCascade = async (supabase: SupabaseClient, releveIds: string[], now: string) => {
  if (!releveIds.length) return;

  const { data: lignes, error: lignesError } = await supabase
    .from('ligne_releves')
    .select('id')
    .in('releve_id', releveIds)
    .is('supprime_le', null);
  if (lignesError) {
    throw new Error(lignesError.message);
  }
  const ligneIds = (lignes ?? []).map((row) => String(row.id));
  await tombstoneRows(supabase, 'ligne_releves', ligneIds, now);
  await tombstoneRows(supabase, 'releves', releveIds, now);
};

const tombstoneChantiersCascade = async (supabase: SupabaseClient, chantierIds: string[], now: string) => {
  if (!chantierIds.length) return;

  const { data: releves, error: relevesError } = await supabase
    .from('releves')
    .select('id')
    .in('chantier_id', chantierIds)
    .is('supprime_le', null);
  if (relevesError) {
    throw new Error(relevesError.message);
  }

  const releveIds = (releves ?? []).map((row) => String(row.id));
  await tombstoneRelevesCascade(supabase, releveIds, now);
  await tombstoneRows(supabase, 'chantiers', chantierIds, now);
};

const tombstoneClientsCascade = async (supabase: SupabaseClient, clientIds: string[], now: string) => {
  if (!clientIds.length) return;

  const { data: chantiers, error: chantiersError } = await supabase
    .from('chantiers')
    .select('id')
    .in('client_id', clientIds)
    .is('supprime_le', null);
  if (chantiersError) {
    throw new Error(chantiersError.message);
  }

  const chantierIds = (chantiers ?? []).map((row) => String(row.id));
  await tombstoneChantiersCascade(supabase, chantierIds, now);
  await tombstoneRows(supabase, 'clients', clientIds, now);
};

const tombstoneOuvragesCascade = async (supabase: SupabaseClient, ouvrageIds: string[], now: string) => {
  if (!ouvrageIds.length) return;

  const { data: ouvrageUnites, error: ouvrageUnitesError } = await supabase
    .from('ouvrage_unites')
    .select('id')
    .in('ouvrage_id', ouvrageIds)
    .is('supprime_le', null);
  if (ouvrageUnitesError) {
    throw new Error(ouvrageUnitesError.message);
  }

  const ouvrageUniteIds = (ouvrageUnites ?? []).map((row) => String(row.id));
  await tombstoneRows(supabase, 'ouvrage_unites', ouvrageUniteIds, now);
  await tombstoneRows(supabase, 'ouvrages', ouvrageIds, now);
};

const removeStoragePaths = async (supabase: SupabaseClient, paths: string[]) => {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabase.storage.from(TERRAIN_IMAGE_BUCKET).remove(unique);
  if (error) {
    console.warn('Purge storage partielle:', error.message);
  }
};

const listAllStoragePaths = async (
  supabase: SupabaseClient,
  prefix: string,
  acc: string[] = []
): Promise<string[]> => {
  const { data, error } = await supabase.storage.from(TERRAIN_IMAGE_BUCKET).list(prefix, {
    limit: 1000,
  });
  if (error || !data?.length) {
    return acc;
  }

  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) {
      acc.push(path);
    } else {
      await listAllStoragePaths(supabase, path, acc);
    }
  }

  return acc;
};

const purgeEntrepriseStorage = async (supabase: SupabaseClient, entrepriseId: string) => {
  const prefix = `entreprises/${entrepriseId}`;
  const paths = await listAllStoragePaths(supabase, prefix);
  if (paths.length) {
    await removeStoragePaths(supabase, paths);
  }
};

export const applyFreeTierDowngrade = async (
  supabase: SupabaseClient,
  entrepriseId: string,
  now = new Date().toISOString()
) => {
  const { data: entreprise, error: entrepriseError } = await supabase
    .from('entreprises')
    .select('id, logo')
    .eq('id', entrepriseId)
    .maybeSingle();
  if (entrepriseError || !entreprise) {
    throw new Error(entrepriseError?.message || 'Entreprise introuvable.');
  }

  const { data: profils, error: profilsError } = await supabase
    .from('profils')
    .select('id, role')
    .eq('entreprise_id', entrepriseId);
  if (profilsError) {
    throw new Error(profilsError.message);
  }

  const adminProfils = (profils ?? []).filter((row) => String(row.role) === 'A');
  const adminId = adminProfils[0]?.id ? String(adminProfils[0].id) : null;
  const profilIdsToDelete = (profils ?? [])
    .map((row) => String(row.id))
    .filter((id) => id !== adminId);

  if (profilIdsToDelete.length) {
    const { error } = await supabase.from('profils').delete().in('id', profilIdsToDelete);
    if (error) {
      throw new Error(error.message);
    }
  }

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, mis_a_jour_le, supprime_le')
    .eq('entreprise_id', entrepriseId);
  if (clientsError) {
    throw new Error(clientsError.message);
  }

  const activeClients = sortByMisAJourLeDesc(activeRows(clients ?? []));
  const clientsToKeep = new Set(activeClients.slice(0, FREE_MAX_CLIENTS).map((row) => String(row.id)));
  const clientsToRemove = activeClients
    .filter((row) => !clientsToKeep.has(String(row.id)))
    .map((row) => String(row.id));
  await tombstoneClientsCascade(supabase, clientsToRemove, now);

  const keptClientIds = [...clientsToKeep];
  let chantiers: { id: string; mis_a_jour_le?: string | null; supprime_le?: string | null }[] = [];
  if (keptClientIds.length) {
    const { data, error } = await supabase
      .from('chantiers')
      .select('id, mis_a_jour_le, supprime_le')
      .in('client_id', keptClientIds);
    if (error) {
      throw new Error(error.message);
    }
    chantiers = data ?? [];
  }

  const activeChantiers = sortByMisAJourLeDesc(activeRows(chantiers));
  const chantiersToKeep = new Set(
    activeChantiers.slice(0, FREE_MAX_CHANTiers).map((row) => String(row.id))
  );
  const chantiersToRemove = activeChantiers
    .filter((row) => !chantiersToKeep.has(String(row.id)))
    .map((row) => String(row.id));
  await tombstoneChantiersCascade(supabase, chantiersToRemove, now);

  const { data: ouvrages, error: ouvragesError } = await supabase
    .from('ouvrages')
    .select('id, metier_id, mis_a_jour_le, supprime_le')
    .eq('entreprise_id', entrepriseId);
  if (ouvragesError) {
    throw new Error(ouvragesError.message);
  }

  const ouvragesByMetier = new Map<string, typeof ouvrages>();
  for (const ouvrage of activeRows(ouvrages ?? [])) {
    const metierId = String(ouvrage.metier_id);
    const list = ouvragesByMetier.get(metierId) ?? [];
    list.push(ouvrage);
    ouvragesByMetier.set(metierId, list);
  }

  const ouvragesToRemove: string[] = [];
  ouvragesByMetier.forEach((rows) => {
    const sorted = sortByMisAJourLeDesc(rows);
    sorted.slice(FREE_MAX_OUVRAGES_PER_METIER).forEach((row) => {
      ouvragesToRemove.push(String(row.id));
    });
  });
  await tombstoneOuvragesCascade(supabase, ouvragesToRemove, now);

  await purgeEntrepriseStorage(supabase, entrepriseId);

  const { error: updateError } = await supabase
    .from('entreprises')
    .update({
      logo: null,
      ind_tva: 0,
      pro_downgraded_le: now,
      mis_a_jour_le: now,
      _synced: 1,
    })
    .eq('id', entrepriseId);
  if (updateError) {
    throw new Error(updateError.message);
  }

  const keptChantierIds = [...chantiersToKeep];
  if (keptChantierIds.length) {
    await supabase
      .from('chantiers')
      .update({ photo_1: null, photo_2: null, photo_3: null, mis_a_jour_le: now, _synced: 1 })
      .in('id', keptChantierIds);
    const { data: releves, error: relevesError } = await supabase
      .from('releves')
      .select('id')
      .in('chantier_id', keptChantierIds)
      .is('supprime_le', null);
    if (relevesError) {
      throw new Error(relevesError.message);
    }

    const releveIds = (releves ?? []).map((row) => String(row.id));
    if (releveIds.length) {
      await supabase
        .from('ligne_releves')
        .update({ photo: null, mis_a_jour_le: now, _synced: 1 })
        .in('releve_id', releveIds);
    }
  }
};

export type EntrepriseTierChange =
  | { kind: 'upgrade' }
  | { kind: 'downgrade' }
  | { kind: 'none' };

export const detectEntrepriseTierChange = (
  previous: Record<string, unknown> | null | undefined,
  nextIndPro: number
): EntrepriseTierChange => {
  const prevIndPro = Number(previous?.ind_pro ?? 0);
  const next = Number(nextIndPro);
  if (prevIndPro === 0 && next === 1) return { kind: 'upgrade' };
  if (prevIndPro === 1 && next === 0) return { kind: 'downgrade' };
  return { kind: 'none' };
};
