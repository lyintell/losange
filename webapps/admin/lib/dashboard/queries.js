import {
  CHANTIER_STATUS_OPTIONS,
  getChantierStatusLabel,
} from '@/lib/chantiers/status';
import {
  RELEVE_STATUS_OPTIONS,
  getReleveStatusLabel,
  normalizeReleveStatus,
} from '@/lib/chantiers/releveStatus';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function emptyStatusCounts(options) {
  return Object.fromEntries(options.map((key) => [key, 0]));
}

function emptyMontantBuckets(options) {
  return Object.fromEntries(options.map((key) => [key, { sum: 0, count: 0 }]));
}

function emptyDashboardStats() {
  return {
    clients: { total: 0 },
    chantiers: {
      total: 0,
      byStatus: CHANTIER_STATUS_OPTIONS.map((status) => ({
        status,
        label: getChantierStatusLabel(status),
        count: 0,
      })),
      recent: [],
    },
    devis: {
      total: 0,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        count: 0,
      })),
      recent: [],
      validationRate: 0,
      avgHt: 0,
    },
    montants: {
      total: 0,
      totalTtc: 0,
      valide: 0,
      enAttente: 0,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        total: 0,
        count: 0,
      })),
    },
  };
}

export async function fetchDashboardStats({ entrepriseId }) {
  const supabase = createServerSupabaseClient();

  let clientsQuery = supabase
    .from('clients')
    .select('id, nom_complet')
    .is('supprime_le', null);
  if (entrepriseId) {
    clientsQuery = clientsQuery.eq('entreprise_id', entrepriseId);
  }

  const { data: clients, error: clientsError } = await clientsQuery;
  if (clientsError) throw new Error(clientsError.message || 'Erreur chargement clients.');

  const clientRows = clients || [];
  const clientIds = clientRows.map((client) => client.id);
  const clientMap = new Map(clientRows.map((client) => [client.id, client]));

  if (!clientIds.length) {
    return emptyDashboardStats();
  }

  const { data: chantiers, error: chantiersError } = await supabase
    .from('chantiers')
    .select('id, nom, status, cree_le, client_id, adresse')
    .in('client_id', clientIds)
    .is('supprime_le', null)
    .order('cree_le', { ascending: false });

  if (chantiersError) throw new Error(chantiersError.message || 'Erreur chargement chantiers.');

  const chantierRows = chantiers || [];
  const chantierIds = chantierRows.map((row) => row.id);
  const chantierMap = new Map(chantierRows.map((row) => [row.id, row]));
  const chantiersByStatus = emptyStatusCounts(CHANTIER_STATUS_OPTIONS);

  chantierRows.forEach((chantier) => {
    const status = CHANTIER_STATUS_OPTIONS.includes(chantier.status) ? chantier.status : 'D';
    chantiersByStatus[status] += 1;
  });

  const devisByStatus = emptyStatusCounts(RELEVE_STATUS_OPTIONS);
  const montantsByStatus = emptyMontantBuckets(RELEVE_STATUS_OPTIONS);

  let releves = [];
  if (chantierIds.length) {
    const { data, error } = await supabase
      .from('releves')
      .select('id, chantier_id, status, total_ht_facture, total_ttc_facture, date_facture, cree_le')
      .in('chantier_id', chantierIds)
      .is('supprime_le', null)
      .order('cree_le', { ascending: false });

    if (error) throw new Error(error.message || 'Erreur chargement statistiques devis.');
    releves = data || [];
  }

  let montantTotal = 0;
  let montantTotalTtc = 0;
  let montantValide = 0;
  let montantEnAttente = 0;

  releves.forEach((releve) => {
    const status = normalizeReleveStatus(releve.status);
    const amountHt = Math.round(Number(releve.total_ht_facture) || 0);
    const amountTtc = Math.round(Number(releve.total_ttc_facture) || amountHt);

    devisByStatus[status] = (devisByStatus[status] || 0) + 1;
    montantTotal += amountHt;
    montantTotalTtc += amountTtc;

    if (status === 'V') montantValide += amountHt;
    if (status === 'E') montantEnAttente += amountHt;

    if (montantsByStatus[status]) {
      montantsByStatus[status].sum += amountHt;
      montantsByStatus[status].count += 1;
    }
  });

  const devisTotal = releves.length;
  const valideCount = devisByStatus.V || 0;
  const validationRate = devisTotal ? Math.round((valideCount / devisTotal) * 100) : 0;
  const avgHt = devisTotal ? Math.round(montantTotal / devisTotal) : 0;

  const recentChantiers = chantierRows.slice(0, 5).map((chantier) => {
    const client = clientMap.get(chantier.client_id);
    return {
      id: chantier.id,
      nom: chantier.nom,
      status: chantier.status,
      cree_le: chantier.cree_le,
      adresse: chantier.adresse || '',
      client_id: chantier.client_id,
      client_nom: client?.nom_complet || '',
    };
  });

  const recentDevis = releves.slice(0, 5).map((releve) => {
    const chantier = chantierMap.get(releve.chantier_id);
    const client = chantier ? clientMap.get(chantier.client_id) : null;
    return {
      id: releve.id,
      chantier_id: releve.chantier_id,
      chantier_nom: chantier?.nom || 'Chantier',
      client_nom: client?.nom_complet || '',
      status: normalizeReleveStatus(releve.status),
      total_ht_facture: Math.round(Number(releve.total_ht_facture) || 0),
      date_facture: releve.date_facture,
      cree_le: releve.cree_le,
    };
  });

  return {
    clients: { total: clientRows.length },
    chantiers: {
      total: chantierRows.length,
      byStatus: CHANTIER_STATUS_OPTIONS.map((status) => ({
        status,
        label: getChantierStatusLabel(status),
        count: chantiersByStatus[status] || 0,
      })),
      recent: recentChantiers,
    },
    devis: {
      total: devisTotal,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        count: devisByStatus[status] || 0,
      })),
      recent: recentDevis,
      validationRate,
      avgHt,
    },
    montants: {
      total: montantTotal,
      totalTtc: montantTotalTtc,
      valide: montantValide,
      enAttente: montantEnAttente,
      byStatus: RELEVE_STATUS_OPTIONS.map((status) => ({
        status,
        label: getReleveStatusLabel(status),
        total: montantsByStatus[status].sum,
        count: montantsByStatus[status].count,
      })),
    },
  };
}
