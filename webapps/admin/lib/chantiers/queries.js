import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computeChantierStatusFromReleves } from '@/lib/chantiers/chantierStatusFromReleves';
import { normalizeReleveRow } from '@/lib/chantiers/releveNormalize';
import { withReleveNumbers } from '@/lib/chantiers/releveNumber';
import { normalizeReleveStatus } from '@/lib/chantiers/releveStatus';

const ACTIVE_FILTER = (query) => query.is('supprime_le', null);

function emptyDevisStats() {
  return { devis_total: 0, devis_valide: 0, devis_en_attente: 0 };
}

function buildDevisStatsByChantier(releves = []) {
  const statsByChantier = new Map();

  releves.forEach((releve) => {
    const chantierId = releve.chantier_id;
    const stats = statsByChantier.get(chantierId) || emptyDevisStats();
    stats.devis_total += 1;

    const status = normalizeReleveStatus(releve.status);
    if (status === 'V') {
      stats.devis_valide += 1;
    } else if (status === 'E') {
      stats.devis_en_attente += 1;
    }

    statsByChantier.set(chantierId, stats);
  });

  return statsByChantier;
}

async function fetchRelevesByChantierIds(supabase, chantierIds) {
  if (!chantierIds.length) return [];

  const { data, error } = await supabase
    .from('releves')
    .select('*')
    .in('chantier_id', chantierIds)
    .is('supprime_le', null)
    .order('cree_le', { ascending: false });

  if (error) throw new Error(error.message || 'Erreur chargement relevés.');
  return withReleveNumbers((data || []).map(normalizeReleveRow));
}

function filterChantiersForRole(rows, { role, profilId }) {
  if (role !== 'T') return rows;
  return rows.filter((row) => row.prise_par_id === profilId);
}

export async function fetchChantiersList({ entrepriseId, role, profilId }) {
  const supabase = createServerSupabaseClient();

  let clientsQuery = supabase
    .from('clients')
    .select('id, nom_complet, telephone_1, telephone_2, entreprise_id')
    .is('supprime_le', null);

  if (entrepriseId) {
    clientsQuery = clientsQuery.eq('entreprise_id', entrepriseId);
  }

  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error(clientsError.message || 'Erreur chargement clients.');

  const clientMap = new Map((clients || []).map((client) => [client.id, client]));
  const clientIds = [...clientMap.keys()];
  if (!clientIds.length) return [];

  const { data: chantiers, error: chantiersError } = await ACTIVE_FILTER(
    supabase.from('chantiers').select('id, client_id, nom, adresse, status, notes, cree_le').in('client_id', clientIds)
  ).order('cree_le', { ascending: false });

  if (chantiersError) throw new Error(chantiersError.message || 'Erreur chargement chantiers.');

  const chantierIds = (chantiers || []).map((row) => row.id);
  const releves = await fetchRelevesByChantierIds(supabase, chantierIds);
  const devisStatsByChantier = buildDevisStatsByChantier(releves);

  const firstReleveByChantier = new Map();
  [...releves]
    .sort((a, b) => new Date(a.cree_le).getTime() - new Date(b.cree_le).getTime())
    .forEach((releve) => {
      if (!firstReleveByChantier.has(releve.chantier_id)) {
        firstReleveByChantier.set(releve.chantier_id, releve);
      }
    });

  const rows = (chantiers || []).map((chantier, index) => {
    const client = clientMap.get(chantier.client_id) || {};
    const releve = firstReleveByChantier.get(chantier.id);
    const devisStats = devisStatsByChantier.get(chantier.id) || emptyDevisStats();

    return {
      id: chantier.id,
      numero: `#${String(index + 1).padStart(3, '0')}`,
      nom: chantier.nom,
      adresse: chantier.adresse,
      notes: chantier.notes || '',
      status: chantier.status,
      cree_le: chantier.cree_le,
      client_id: chantier.client_id,
      client_nom: client.nom_complet || '',
      client_telephone_1: client.telephone_1 || '',
      client_telephone_2: client.telephone_2 || '',
      prise_par_id: releve?.prise_par_id || null,
      prise_le: releve?.cree_le || null,
      devis_total: devisStats.devis_total,
      devis_valide: devisStats.devis_valide,
      devis_en_attente: devisStats.devis_en_attente,
    };
  });

  return filterChantiersForRole(rows, { role, profilId });
}

export async function fetchChantiersByClientId(clientId, { entrepriseId, role, profilId }) {
  if (!clientId) return [];
  const allRows = await fetchChantiersList({ entrepriseId, role, profilId });
  const rows = allRows.filter((row) => row.client_id === clientId);
  return rows.map((row, index) => ({
    ...row,
    numero: `#${String(index + 1).padStart(3, '0')}`,
  }));
}

export async function fetchClientById(clientId, { entrepriseId } = {}) {
  if (!clientId) return null;

  const supabase = createServerSupabaseClient();
  let query = ACTIVE_FILTER(
    supabase
      .from('clients')
      .select('id, nom_complet, telephone_1, telephone_2, entreprise_id, cree_le')
      .eq('id', clientId)
  );

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message || 'Erreur chargement client.');
  if (!data) return null;
  if (entrepriseId && data.entreprise_id !== entrepriseId) return null;

  return {
    id: data.id,
    nom_complet: data.nom_complet,
    telephone_1: data.telephone_1,
    telephone_2: data.telephone_2,
    cree_le: data.cree_le,
  };
}

export async function fetchClientsList({ entrepriseId, role, profilId }) {
  if (!entrepriseId) return [];

  const supabase = createServerSupabaseClient();
  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('clients')
      .select('id, nom_complet, telephone_1, telephone_2, cree_le')
      .eq('entreprise_id', entrepriseId)
  ).order('nom_complet', { ascending: true });

  if (error) throw new Error(error.message || 'Erreur chargement clients.');

  const chantiers = await fetchChantiersList({ entrepriseId, role, profilId });

  const chantierCountByClient = chantiers.reduce((acc, row) => {
    acc[row.client_id] = (acc[row.client_id] || 0) + 1;
    return acc;
  }, {});

  const devisCountByClient = chantiers.reduce((acc, row) => {
    acc[row.client_id] = (acc[row.client_id] || 0) + (row.devis_total || 0);
    return acc;
  }, {});

  return (data || []).map((client) => ({
    ...client,
    chantier_count: chantierCountByClient[client.id] || 0,
    devis_total: devisCountByClient[client.id] || 0,
  }));
}

export async function updateClient(clientId, { nom_complet, telephone_1, telephone_2 = null }, { entrepriseId } = {}) {
  if (!clientId) throw new Error('Client requis.');

  const trimmedNom = nom_complet?.trim();
  const trimmedTel1 = telephone_1?.trim();
  const trimmedTel2 = telephone_2?.trim() || null;

  if (!trimmedNom || !trimmedTel1) {
    throw new Error('Le nom du client et le téléphone principal sont requis.');
  }

  const existing = await fetchClientById(clientId, { entrepriseId });
  if (!existing) throw new Error('Client introuvable.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('clients')
    .update({
      nom_complet: trimmedNom,
      telephone_1: trimmedTel1,
      telephone_2: trimmedTel2,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', clientId)
    .is('supprime_le', null)
    .select('id, nom_complet, telephone_1, telephone_2, cree_le')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur mise à jour client.');
  if (!data) throw new Error('Client introuvable.');

  return {
    id: data.id,
    nom_complet: data.nom_complet,
    telephone_1: data.telephone_1,
    telephone_2: data.telephone_2,
    cree_le: data.cree_le,
  };
}

export async function fetchChantierDetail(chantierId, { entrepriseId, role, profilId }) {
  const supabase = createServerSupabaseClient();

  const { data: chantier, error } = await ACTIVE_FILTER(
    supabase
      .from('chantiers')
      .select(
        `
        id, client_id, nom, adresse, status, notes, cree_le,
        clients!inner (
          id, nom_complet, telephone_1, telephone_2, entreprise_id
        )
      `
      )
      .eq('id', chantierId)
  ).maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement chantier.');
  if (!chantier) return null;

  const client = Array.isArray(chantier.clients) ? chantier.clients[0] : chantier.clients;
  if (!client) return null;
  if (entrepriseId && client?.entreprise_id !== entrepriseId) {
    return null;
  }

  const releves = await fetchRelevesByChantierIds(supabase, [chantierId]);

  if (role === 'T') {
    const ownsChantier = releves.some((releve) => releve.prise_par_id === profilId);
    if (!ownsChantier) return null;
  }

  return {
    id: chantier.id,
    nom: chantier.nom,
    adresse: chantier.adresse,
    status: chantier.status,
    notes: chantier.notes,
    cree_le: chantier.cree_le,
    client_id: client.id,
    client_nom: client.nom_complet,
    client_telephone_1: client.telephone_1,
    client_telephone_2: client.telephone_2,
    releves,
  };
}

export async function fetchEntrepriseForSession(entrepriseId) {
  if (!entrepriseId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('entreprises')
    .select('id, nom, telephone_1, telephone_2, adresse, logo, ind_pro, ind_tva')
    .eq('id', entrepriseId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement entreprise.');
  return data;
}

export async function searchClients(entrepriseId, query) {
  if (!query?.trim()) return [];

  const supabase = createServerSupabaseClient();
  const term = `%${query.trim()}%`;

  let clientsQuery = supabase
    .from('clients')
    .select('id, nom_complet, telephone_1, telephone_2')
    .is('supprime_le', null)
    .or(`nom_complet.ilike.${term},telephone_1.ilike.${term},telephone_2.ilike.${term}`)
    .order('nom_complet', { ascending: true })
    .limit(20);

  if (entrepriseId) {
    clientsQuery = clientsQuery.eq('entreprise_id', entrepriseId);
  }

  const { data, error } = await clientsQuery;
  if (error) throw new Error(error.message || 'Erreur recherche clients.');
  return data || [];
}

export async function searchChantiersByClient(clientId, query) {
  if (!clientId || !query?.trim()) return [];

  const supabase = createServerSupabaseClient();
  const term = `%${query.trim()}%`;

  const { data, error } = await ACTIVE_FILTER(
    supabase
      .from('chantiers')
      .select('id, nom, adresse, notes, status')
      .eq('client_id', clientId)
      .ilike('nom', term)
      .order('nom', { ascending: true })
      .limit(20)
  );

  if (error) throw new Error(error.message || 'Erreur recherche chantiers.');
  return data || [];
}

export async function updateChantierInfo(
  chantierId,
  {
    entrepriseId,
    clientId = null,
    clientNom,
    clientTelephone,
    nom,
    adresse = null,
    notes = null,
  }
) {
  const trimmedClientNom = clientNom?.trim();
  const trimmedClientTelephone = clientTelephone?.trim();
  const trimmedNom = nom?.trim();

  if (!trimmedClientNom || !trimmedClientTelephone || !trimmedNom) {
    throw new Error('Le nom du client, le numéro et le nom du chantier sont requis.');
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  let resolvedClientId = clientId;

  if (resolvedClientId) {
    const { error: clientError } = await supabase
      .from('clients')
      .update({
        nom_complet: trimmedClientNom,
        telephone_1: trimmedClientTelephone,
        mis_a_jour_le: now,
        _synced: 0,
      })
      .eq('id', resolvedClientId)
      .is('supprime_le', null);

    if (clientError) throw new Error(clientError.message || 'Erreur mise à jour client.');
  } else {
    if (!entrepriseId) {
      throw new Error('Entreprise requise pour créer un client.');
    }

    const { data: newClient, error: insertClientError } = await supabase
      .from('clients')
      .insert({
        entreprise_id: entrepriseId,
        nom_complet: trimmedClientNom,
        telephone_1: trimmedClientTelephone,
        _synced: 0,
      })
      .select('id')
      .single();

    if (insertClientError || !newClient) {
      throw new Error(insertClientError?.message || 'Erreur création client.');
    }

    resolvedClientId = newClient.id;
  }

  const { data: chantier, error: chantierError } = await supabase
    .from('chantiers')
    .update({
      client_id: resolvedClientId,
      nom: trimmedNom,
      adresse: adresse?.trim() || null,
      notes: notes?.trim() || null,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', chantierId)
    .is('supprime_le', null)
    .select(
      `
      id, nom, adresse, status, notes,
      clients!inner (
        id, nom_complet, telephone_1, telephone_2
      )
    `
    )
    .maybeSingle();

  if (chantierError || !chantier) {
    throw new Error(chantierError?.message || 'Erreur mise à jour chantier.');
  }

  const client = Array.isArray(chantier.clients) ? chantier.clients[0] : chantier.clients;

  return {
    id: chantier.id,
    nom: chantier.nom,
    adresse: chantier.adresse,
    status: chantier.status,
    notes: chantier.notes,
    client_id: client?.id || resolvedClientId,
    client_nom: client?.nom_complet || trimmedClientNom,
    client_telephone_1: client?.telephone_1 || trimmedClientTelephone,
    client_telephone_2: client?.telephone_2 || '',
  };
}

export async function updateChantierStatus(chantierId, status) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('chantiers')
    .update({ status, mis_a_jour_le: now, _synced: 0 })
    .eq('id', chantierId)
    .is('supprime_le', null)
    .select('id, status')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur mise à jour statut.');
  if (!data) throw new Error('Chantier introuvable.');
  return data.status;
}

export async function softDeleteReleve(releveId) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { error: lignesError } = await supabase
    .from('ligne_releves')
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
    .eq('releve_id', releveId)
    .is('supprime_le', null);

  if (lignesError) throw new Error(lignesError.message || 'Erreur suppression lignes.');

  const { error: releveError } = await supabase
    .from('releves')
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
    .eq('id', releveId);

  if (releveError) throw new Error(releveError.message || 'Erreur suppression relevé.');
}

export async function updateReleveStatus(releveId, status) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('releves')
    .update({ status, mis_a_jour_le: now, _synced: 0 })
    .eq('id', releveId)
    .is('supprime_le', null)
    .select('id, status, chantier_id')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur mise à jour statut relevé.');
  if (!data) throw new Error('Relevé introuvable.');

  const savedStatus = normalizeReleveRow(data).status;
  let chantierStatus = null;
  if (data.chantier_id) {
    chantierStatus = await syncChantierStatusFromReleves(data.chantier_id);
  }

  return { status: savedStatus, chantierStatus };
}

export async function syncChantierStatusFromReleves(chantierId) {
  if (!chantierId) return null;

  const supabase = createServerSupabaseClient();
  const { data: releves, error: relevesError } = await supabase
    .from('releves')
    .select('status')
    .eq('chantier_id', chantierId)
    .is('supprime_le', null);

  if (relevesError) {
    throw new Error(relevesError.message || 'Erreur chargement relevés.');
  }

  const nextStatus = computeChantierStatusFromReleves(
    (releves || []).map((row) => normalizeReleveRow(row))
  );
  if (!nextStatus) return null;

  const { data: chantier, error: chantierError } = await ACTIVE_FILTER(
    supabase.from('chantiers').select('status').eq('id', chantierId)
  ).maybeSingle();

  if (chantierError) throw new Error(chantierError.message || 'Erreur chargement chantier.');
  if (!chantier || chantier.status === nextStatus) return chantier?.status || null;

  return updateChantierStatus(chantierId, nextStatus);
}

export async function updateReleveLignesPrix(releveId, lignesPayload = [], options = {}) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  for (const ligne of lignesPayload) {
    const prixUnitaireApplique = Number(ligne.prix_unitaire_applique) || 0;
    const nombre = Number(ligne.nombre) || 0;
    const montant = Math.round(prixUnitaireApplique * nombre * 100) / 100;

    const { error } = await supabase
      .from('ligne_releves')
      .update({
        prix_unitaire_applique: prixUnitaireApplique,
        montant,
        mis_a_jour_le: now,
        _synced: 0,
      })
      .eq('id', ligne.id)
      .eq('releve_id', releveId)
      .is('supprime_le', null);

    if (error) throw new Error(error.message || 'Erreur mise à jour ligne.');
  }

  const { data: montants, error: sumError } = await supabase
    .from('ligne_releves')
    .select('montant')
    .eq('releve_id', releveId)
    .is('supprime_le', null);

  if (sumError) throw new Error(sumError.message || 'Erreur recalcul totaux.');

  const brutHt = (montants || []).reduce((sum, row) => sum + (Number(row.montant) || 0), 0);

  const { data: releve, error: releveError } = await supabase
    .from('releves')
    .select('*')
    .eq('id', releveId)
    .maybeSingle();

  if (releveError || !releve) {
    throw new Error(releveError?.message || 'Relevé introuvable.');
  }

  const normalizedReleve = normalizeReleveRow(releve);
  const remiseInput =
    options.remise != null ? Number(options.remise) || 0 : Number(normalizedReleve.remise) || 0;
  const remise = Math.min(Math.max(remiseInput, 0), brutHt);
  const indTva =
    options.ind_tva != null
      ? Number(options.ind_tva) === 1
        ? 1
        : 0
      : normalizedReleve.ind_tva;
  const totalHt = Math.max(0, brutHt - remise);
  const applyTva = Number(indTva) === 1;
  const taux = Number(normalizedReleve.tva_facture) || 18;
  const totalTtc = applyTva ? totalHt * (1 + taux / 100) : totalHt;

  const { error: updateReleveError } = await supabase
    .from('releves')
    .update({
      remise,
      ind_tva: indTva,
      total_ht_facture: totalHt,
      total_ttc_facture: totalTtc,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', releveId);

  if (updateReleveError) throw new Error(updateReleveError.message || 'Erreur mise à jour relevé.');
}
