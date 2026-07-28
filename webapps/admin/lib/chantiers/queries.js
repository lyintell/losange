import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computeChantierStatusFromReleves } from '@/lib/chantiers/chantierStatusFromReleves';
import { normalizeReleveRow } from '@/lib/chantiers/releveNormalize';
import { withReleveNumbers } from '@/lib/chantiers/releveNumber';
import { normalizeReleveStatus } from '@/lib/chantiers/releveStatus';
import {
  computeMontantLigneReleve,
  computePrixUnitaireAppliqueDefault,
  computeQuantiteLigneReleve,
} from '@/lib/format/ligneReleveCalcul';
import { roundQuantite } from '@/lib/format/formatLigneMesures';

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
  if (role === 'C') {
    return rows.filter((row) => row.prise_par_id === profilId);
  }
  return rows;
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

  const devisValideByClient = chantiers.reduce((acc, row) => {
    acc[row.client_id] = (acc[row.client_id] || 0) + (row.devis_valide || 0);
    return acc;
  }, {});

  const devisEnAttenteByClient = chantiers.reduce((acc, row) => {
    acc[row.client_id] = (acc[row.client_id] || 0) + (row.devis_en_attente || 0);
    return acc;
  }, {});

  return (data || []).map((client) => ({
    ...client,
    chantier_count: chantierCountByClient[client.id] || 0,
    devis_total: devisCountByClient[client.id] || 0,
    devis_valide: devisValideByClient[client.id] || 0,
    devis_en_attente: devisEnAttenteByClient[client.id] || 0,
  }));
}

export async function createClient(
  { nom_complet, telephone_1, telephone_2 = null },
  { entrepriseId } = {}
) {
  if (!entrepriseId) throw new Error('Entreprise requise.');

  const trimmedNom = nom_complet?.trim();
  const trimmedTel1 = telephone_1?.trim();
  const trimmedTel2 = telephone_2?.trim() || null;

  if (!trimmedNom || !trimmedTel1) {
    throw new Error('Le nom du client et le téléphone principal sont requis.');
  }

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from('clients')
    .insert({
      id,
      entreprise_id: entrepriseId,
      nom_complet: trimmedNom,
      telephone_1: trimmedTel1,
      telephone_2: trimmedTel2,
      cree_le: now,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .select('id, nom_complet, telephone_1, telephone_2, cree_le')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur création client.');
  if (!data) throw new Error('Création client impossible.');

  return {
    id: data.id,
    nom_complet: data.nom_complet,
    telephone_1: data.telephone_1,
    telephone_2: data.telephone_2,
    cree_le: data.cree_le,
    chantier_count: 0,
    devis_total: 0,
  };
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
    .select('id, nom, telephone_1, telephone_2, adresse, logo, entete_1, entete_2, ind_pro, ind_tva')
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

export async function createChantier(
  {
    clientId,
    nom,
    adresse = null,
    notes = null,
  },
  { entrepriseId } = {}
) {
  if (!clientId) throw new Error('Client requis.');
  const trimmedNom = nom?.trim();
  if (!trimmedNom) throw new Error('Le nom du chantier est requis.');

  const client = await fetchClientById(clientId, { entrepriseId });
  if (!client) throw new Error('Client introuvable.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const trimmedAdresse = adresse?.trim() || null;
  const trimmedNotes = notes?.trim() || null;

  const { data, error } = await supabase
    .from('chantiers')
    .insert({
      id,
      client_id: clientId,
      nom: trimmedNom,
      adresse: trimmedAdresse,
      notes: trimmedNotes,
      status: 'D',
      cree_le: now,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .select('id, nom, adresse, notes, status, client_id, cree_le')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur création chantier.');
  if (!data) throw new Error('Création chantier impossible.');

  return {
    id: data.id,
    nom: data.nom,
    adresse: data.adresse,
    notes: data.notes,
    status: data.status,
    client_id: data.client_id,
    client_nom: client.nom_complet,
    client_telephone_1: client.telephone_1,
    client_telephone_2: client.telephone_2 || '',
    devis_total: 0,
    devis_valide: 0,
    devis_en_attente: 0,
  };
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

export async function softDeleteChantier(chantierId) {
  if (!chantierId) throw new Error('Chantier requis.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: releves, error: relevesError } = await supabase
    .from('releves')
    .select('id')
    .eq('chantier_id', chantierId)
    .is('supprime_le', null);

  if (relevesError) throw new Error(relevesError.message || 'Erreur lecture relevés.');

  const releveIds = (releves || []).map((row) => row.id).filter(Boolean);

  if (releveIds.length) {
    const { error: lignesError } = await supabase
      .from('ligne_releves')
      .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
      .in('releve_id', releveIds)
      .is('supprime_le', null);

    if (lignesError) throw new Error(lignesError.message || 'Erreur suppression lignes.');

    const { error: softRelevesError } = await supabase
      .from('releves')
      .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
      .in('id', releveIds);

    if (softRelevesError) throw new Error(softRelevesError.message || 'Erreur suppression relevés.');
  }

  const { data, error } = await supabase
    .from('chantiers')
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
    .eq('id', chantierId)
    .is('supprime_le', null)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur suppression chantier.');
  if (!data) throw new Error('Chantier introuvable.');
}

export async function softDeleteClient(clientId, { entrepriseId } = {}) {
  if (!clientId) throw new Error('Client requis.');

  const existing = await fetchClientById(clientId, { entrepriseId });
  if (!existing) throw new Error('Client introuvable.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: chantiers, error: chantiersError } = await supabase
    .from('chantiers')
    .select('id')
    .eq('client_id', clientId)
    .is('supprime_le', null);

  if (chantiersError) throw new Error(chantiersError.message || 'Erreur lecture chantiers.');

  const chantierIds = (chantiers || []).map((row) => row.id).filter(Boolean);
  for (const chantierId of chantierIds) {
    await softDeleteChantier(chantierId);
  }

  const { data, error } = await supabase
    .from('clients')
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
    .eq('id', clientId)
    .is('supprime_le', null)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur suppression client.');
  if (!data) throw new Error('Client introuvable.');
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

export async function markReleveChanged(releveId, identifiant) {
  if (!releveId) return;
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('releves')
    .update({
      ind_changement: 1,
      id_qui_change: identifiant != null && String(identifiant).trim() ? String(identifiant).trim() : null,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', releveId)
    .is('supprime_le', null);

  if (error) throw new Error(error.message || 'Erreur marquage changement.');
}

async function fetchOuvrageUniteContext(supabase, ouvrageUniteId) {
  const { data: ouvrageUnite, error: ouError } = await supabase
    .from('ouvrage_unites')
    .select('id, ouvrage_id, unite_id, prix_unitaire, prix_revient')
    .eq('id', ouvrageUniteId)
    .maybeSingle();
  if (ouError) throw new Error(ouError.message || 'Erreur chargement ouvrage_unite.');
  if (!ouvrageUnite) throw new Error('Ouvrage / unité introuvable.');

  const { data: unite, error: uniteError } = await supabase
    .from('unites')
    .select('id, nom_unite, formule, ind_dimension')
    .eq('id', ouvrageUnite.unite_id)
    .maybeSingle();
  if (uniteError) throw new Error(uniteError.message || 'Erreur chargement unité.');

  const { data: ouvrage, error: ouvrageError } = await supabase
    .from('ouvrages')
    .select('id, nom, metier_id, metiers ( nom, ordre )')
    .eq('id', ouvrageUnite.ouvrage_id)
    .maybeSingle();
  if (ouvrageError) throw new Error(ouvrageError.message || 'Erreur chargement ouvrage.');

  const metier = Array.isArray(ouvrage?.metiers) ? ouvrage.metiers[0] : ouvrage?.metiers;

  return {
    ouvrage_unite_id: ouvrageUnite.id,
    ouvrage_id: ouvrageUnite.ouvrage_id,
    unite_id: ouvrageUnite.unite_id,
    prix_unitaire: ouvrageUnite.prix_unitaire,
    prix_revient: ouvrageUnite.prix_revient,
    nom_unite: unite?.nom_unite || '',
    formule: unite?.formule || '',
    ind_dimension: unite?.ind_dimension ?? 0,
    ouvrage_nom: ouvrage?.nom || '',
    metier_id: ouvrage?.metier_id || null,
    metier_nom: metier?.nom || '',
    metier_ordre: metier?.ordre ?? 0,
  };
}

function parseOptionalCote(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? roundQuantite(n) : null;
}

function resolveLigneQtyFields(ligne, context, existing = null) {
  const indDimension = context?.ind_dimension ?? ligne.ind_dimension ?? 0;
  const nomUnite = context?.nom_unite ?? ligne.nom_unite ?? '';
  const formule = context?.formule ?? ligne.formule ?? '';

  const largeur = parseOptionalCote(
    ligne.largeur !== undefined ? ligne.largeur : existing?.largeur
  );
  const hauteur = parseOptionalCote(
    ligne.hauteur !== undefined ? ligne.hauteur : existing?.hauteur
  );
  const profondeur = parseOptionalCote(
    ligne.profondeur !== undefined ? ligne.profondeur : existing?.profondeur
  );

  let nombre = Number(ligne.nombre);
  if (!Number.isFinite(nombre)) nombre = Number(existing?.nombre);
  if (!Number.isFinite(nombre)) nombre = 1;

  const hasAnyCote = largeur != null || hauteur != null || profondeur != null;
  const explicitQuantite = Number(ligne.quantite);
  const hasExplicitQuantite = Number.isFinite(explicitQuantite);

  let quantite;
  if (hasExplicitQuantite) {
    // Qté saisie / override côté admin (création ou édition de ligne).
    quantite = explicitQuantite;
  } else if (Number(indDimension) === 1 && hasAnyCote) {
    quantite = computeQuantiteLigneReleve({
      indDimension,
      formule,
      largeur,
      hauteur,
      profondeur,
      nombre,
    });
  } else if (Number(indDimension) !== 1) {
    quantite = roundQuantite(nombre);
  } else if (Number.isFinite(Number(existing?.quantite))) {
    quantite = Number(existing.quantite);
  } else {
    quantite = roundQuantite(nombre);
  }

  return { nombre, quantite, largeur, hauteur, profondeur, indDimension, nomUnite, formule };
}

async function refreshReleveFacturationTotals(supabase, releveId, options = {}, now) {
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

  const relevePatch = {
    remise,
    ind_tva: indTva,
    total_ht_facture: totalHt,
    total_ttc_facture: totalTtc,
    mis_a_jour_le: now,
    _synced: 0,
  };

  if (options.markChanged) {
    relevePatch.ind_changement = 1;
    relevePatch.id_qui_change =
      options.changedByIdentifiant != null && String(options.changedByIdentifiant).trim()
        ? String(options.changedByIdentifiant).trim()
        : null;
  }

  const { error: updateReleveError } = await supabase
    .from('releves')
    .update(relevePatch)
    .eq('id', releveId);

  if (updateReleveError) throw new Error(updateReleveError.message || 'Erreur mise à jour relevé.');

  return { brutHt, remise, indTva, totalHt, totalTtc };
}

async function replaceSectionRelevesForReleve(supabase, releveId, lignesPayload = [], now) {
  const sectionOrder = [];
  const seen = new Set();
  (lignesPayload || []).forEach((ligne) => {
    const sectionId = ligne?.section_id || null;
    if (!sectionId || seen.has(sectionId)) return;
    seen.add(sectionId);
    sectionOrder.push(sectionId);
  });

  const { error: softDeleteError } = await supabase
    .from('section_releves')
    .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
    .eq('releve_id', releveId)
    .is('supprime_le', null);

  if (softDeleteError) {
    throw new Error(softDeleteError.message || 'Erreur mise à jour sections relevé.');
  }

  for (let ordre = 0; ordre < sectionOrder.length; ordre += 1) {
    const sectionId = sectionOrder[ordre];
    const { error } = await supabase.from('section_releves').insert({
      id: crypto.randomUUID(),
      section_id: sectionId,
      releve_id: releveId,
      ordre,
      cree_le: now,
      mis_a_jour_le: now,
      _synced: 0,
    });
    if (error) throw new Error(error.message || 'Erreur liaison section relevé.');
  }
}

/** Remplace / met à jour / soft-supprime les lignes d'un relevé (édition web). */
export async function syncReleveLignes(releveId, lignesPayload = [], options = {}) {
  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from('ligne_releves')
    .select('id')
    .eq('releve_id', releveId)
    .is('supprime_le', null);

  if (existingError) throw new Error(existingError.message || 'Erreur chargement lignes.');

  const keepIds = new Set(
    (lignesPayload || []).map((ligne) => ligne?.id).filter((id) => id && !String(id).startsWith('temp-'))
  );

  const toDelete = (existingRows || []).map((row) => row.id).filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    const { error: deleteError } = await supabase
      .from('ligne_releves')
      .update({ supprime_le: now, mis_a_jour_le: now, _synced: 0 })
      .in('id', toDelete)
      .eq('releve_id', releveId);

    if (deleteError) throw new Error(deleteError.message || 'Erreur suppression lignes.');
  }

  let nextOrdre = 0;
  const { data: maxOrdreRow } = await supabase
    .from('ligne_releves')
    .select('ordre')
    .eq('releve_id', releveId)
    .is('supprime_le', null)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxOrdreRow && Number.isFinite(Number(maxOrdreRow.ordre))) {
    nextOrdre = Number(maxOrdreRow.ordre) + 1;
  }

  const syncedLignes = [];

  for (const ligne of lignesPayload || []) {
    const isExisting = ligne?.id && !String(ligne.id).startsWith('temp-') && keepIds.has(ligne.id);
    let ouvrageUniteId = ligne.ouvrage_unite_id || null;
    let existing = null;

    if (isExisting) {
      const { data, error } = await supabase
        .from('ligne_releves')
        .select(
          'id, ouvrage_unite_id, nombre, quantite, largeur, hauteur, profondeur, note_2, section_id, ordre, metier_ordre'
        )
        .eq('id', ligne.id)
        .eq('releve_id', releveId)
        .is('supprime_le', null)
        .maybeSingle();
      if (error) throw new Error(error.message || 'Erreur chargement ligne.');
      if (!data) throw new Error('Ligne introuvable.');
      existing = data;
      if (!ouvrageUniteId) ouvrageUniteId = existing.ouvrage_unite_id;
    }

    if (!ouvrageUniteId) throw new Error('Ouvrage / unité requis pour chaque ligne.');

    const context = await fetchOuvrageUniteContext(supabase, ouvrageUniteId);
    const { nombre, quantite, largeur, hauteur, profondeur, indDimension, nomUnite, formule } =
      resolveLigneQtyFields(
        {
          nombre: ligne.nombre,
          quantite: ligne.quantite,
          largeur: ligne.largeur,
          hauteur: ligne.hauteur,
          profondeur: ligne.profondeur,
          ind_dimension: ligne.ind_dimension ?? context.ind_dimension,
          nom_unite: ligne.nom_unite ?? context.nom_unite,
          formule: ligne.formule ?? context.formule,
        },
        context,
        existing
      );

    const note2Raw = ligne.note_2 !== undefined ? ligne.note_2 : existing?.note_2;
    const note_2 =
      note2Raw != null && String(note2Raw).trim() ? String(note2Raw).trim() : null;

    const section_id =
      ligne.section_id !== undefined ? ligne.section_id || null : existing?.section_id || null;

    const ordre =
      ligne.ordre != null && Number.isFinite(Number(ligne.ordre))
        ? Number(ligne.ordre)
        : isExisting
          ? Number(existing?.ordre) || 0
          : nextOrdre;

    const metier_ordre =
      ligne.metier_ordre != null && Number.isFinite(Number(ligne.metier_ordre))
        ? Number(ligne.metier_ordre)
        : isExisting
          ? Number(existing?.metier_ordre) || 0
          : context.metier_ordre || 0;

    let prixUnitaireApplique;
    if (ligne.prix_unitaire_applique != null && ligne.prix_unitaire_applique !== '') {
      prixUnitaireApplique = Math.round(Number(ligne.prix_unitaire_applique) || 0);
    } else {
      prixUnitaireApplique = computePrixUnitaireAppliqueDefault({
        indDimension,
        prixUnitaire: context.prix_unitaire,
        formule,
        largeur,
        hauteur,
        profondeur,
        nomUnite,
      });
    }

    const montant = computeMontantLigneReleve({
      prixUnitaireApplique,
      quantite,
      nombre,
      indDimension,
      nomUnite,
    });

    if (isExisting) {
      const { error } = await supabase
        .from('ligne_releves')
        .update({
          ouvrage_unite_id: ouvrageUniteId,
          section_id,
          largeur,
          hauteur,
          profondeur,
          nombre,
          quantite,
          prix_unitaire_applique: prixUnitaireApplique,
          montant,
          note_2,
          ordre,
          metier_ordre,
          mis_a_jour_le: now,
          _synced: 0,
        })
        .eq('id', ligne.id)
        .eq('releve_id', releveId)
        .is('supprime_le', null);

      if (error) throw new Error(error.message || 'Erreur mise à jour ligne.');
      syncedLignes.push({ ...ligne, id: ligne.id, section_id, ordre, metier_ordre });
    } else {
      const ligneId = crypto.randomUUID();
      const { error } = await supabase.from('ligne_releves').insert({
        id: ligneId,
        releve_id: releveId,
        ouvrage_unite_id: ouvrageUniteId,
        section_id,
        largeur,
        hauteur,
        profondeur,
        nombre,
        quantite,
        prix_unitaire_applique: prixUnitaireApplique,
        montant,
        note_2,
        ordre,
        metier_ordre,
        prix_revient_applique:
          context.prix_revient != null ? Math.round(Number(context.prix_revient) || 0) : null,
        ind_complete: 0,
        cree_le: now,
        mis_a_jour_le: now,
        _synced: 0,
      });
      if (error) throw new Error(error.message || 'Erreur création ligne.');
      if (!(ligne.ordre != null && Number.isFinite(Number(ligne.ordre)))) {
        nextOrdre = ordre + 1;
      } else {
        nextOrdre = Math.max(nextOrdre, ordre + 1);
      }
      syncedLignes.push({ ...ligne, id: ligneId, section_id, ordre, metier_ordre });
    }
  }

  await replaceSectionRelevesForReleve(supabase, releveId, syncedLignes, now);

  await refreshReleveFacturationTotals(
    supabase,
    releveId,
    {
      ...options,
      markChanged: options.markChanged !== false,
      changedByIdentifiant: options.changedByIdentifiant,
    },
    now
  );
}

/** Compat : mises à jour P.U (et sync lignes si payload complet). */
export async function updateReleveLignesPrix(releveId, lignesPayload = [], options = {}) {
  return syncReleveLignes(releveId, lignesPayload, { ...options, markChanged: true });
}

export async function createReleveWithLignes(
  chantierId,
  { priseParId = null, lignes = [], remise = 0, indTva = 0, tvaFacture = 18 } = {}
) {
  if (!chantierId) throw new Error('Chantier requis.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const releveId = crypto.randomUUID();
  const dateFacture = now.slice(0, 10);
  const indTvaValue = Number(indTva) === 1 ? 1 : 0;

  const { error: releveError } = await supabase.from('releves').insert({
    id: releveId,
    chantier_id: chantierId,
    prise_par_id: priseParId || null,
    date_facture: dateFacture,
    total_ht_facture: 0,
    tva_facture: Number(tvaFacture) || 18,
    total_ttc_facture: 0,
    remise: Number(remise) || 0,
    ind_tva: indTvaValue,
    status: 'E',
    ind_dimension_terrain: 0,
    ind_changement: 0,
    id_qui_change: null,
    cree_le: now,
    mis_a_jour_le: now,
    _synced: 0,
  });

  if (releveError) throw new Error(releveError.message || 'Erreur création relevé.');

  if (lignes?.length) {
    await syncReleveLignes(releveId, lignes, {
      remise: Number(remise) || 0,
      ind_tva: indTvaValue,
      markChanged: false,
    });
  } else {
    await refreshReleveFacturationTotals(
      supabase,
      releveId,
      { remise: Number(remise) || 0, ind_tva: indTvaValue },
      now
    );
  }

  await syncChantierStatusFromReleves(chantierId);

  return { id: releveId };
}
