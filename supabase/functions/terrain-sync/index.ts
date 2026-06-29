import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { filterTransactionalRowsForProPull } from './entrepriseTier.ts';

const FREE_MAX_METIERS = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const normalizeIdentifiant = (value: string) => value.trim().toUpperCase();

const timingSafeEqualString = (left: string, right: string) => {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.byteLength !== b.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    mismatch |= a[index] ^ b[index];
  }
  return mismatch === 0;
};

const stripProfil = (profil: Record<string, unknown>) => {
  const { mot_de_passe: _password, entreprises: _entreprise, ...safeProfil } = profil;
  return safeProfil;
};

const startOfUtcDayMs = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const isProEntrepriseExpired = (entreprise: Record<string, unknown> | null | undefined) => {
  if (!entreprise || Number(entreprise.ind_pro) !== 1) return false;
  const limitMs = startOfUtcDayMs(entreprise.date_actif_jusqua as string | undefined);
  if (limitMs == null) return false;
  const todayMs = startOfUtcDayMs(new Date().toISOString());
  return (todayMs ?? 0) > limitMs;
};

const deactivateExpiredProEntreprise = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown> | null | undefined
) => {
  if (!entreprise || !isProEntrepriseExpired(entreprise)) {
    return { expired: false as const, entreprise };
  }

  const entrepriseId = String(entreprise.id);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('entreprises')
    .update({ ind_active: 0, mis_a_jour_le: now })
    .eq('id', entrepriseId);

  if (error) {
    throw new Error(error.message || 'Impossible de desactiver le compte expire.');
  }

  return {
    expired: true as const,
    entreprise: { ...entreprise, ind_active: 0, mis_a_jour_le: now },
  };
};

const PUSH_ORDER = [
  'entreprises',
  'metiers',
  'sections',
  'fournisseurs',
  'ouvrages',
  'ouvrage_unites',
  'clients',
  'chantiers',
  'releves',
  'section_releves',
  'ligne_releves',
] as const;

const TIMESTAMP_COLUMNS = new Set(['cree_le', 'mis_a_jour_le', 'supprime_le']);
const FLAG_COLUMNS = new Set(['ind_pro', 'ind_active', 'ind_tva', '_synced', 'ind_dimension', 'ind_complete', 'ind_article', 'ind_actif', 'ind_default', 'ind_admin_connecte_mobile', 'ind_metiers_preselectionnes']);

const TABLE_COLUMNS: Record<string, string[]> = {
  metiers: [
    'id',
    'nom',
    'abbrev',
    'icon',
    'entreprise_id',
    'ordre',
    'ind_actif',
    'ind_default',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  sections: [
    'id',
    'nom',
    'entreprise_id',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  fournisseurs: [
    'id',
    'metier_id',
    'entreprise_id',
    'nom',
    'telephone_1',
    'telephone_2',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  ouvrages: [
    'id',
    'metier_id',
    'entreprise_id',
    'nom',
    'nom_devis',
    'ind_article',
    'fournisseur_id',
    'photo',
    'supprime_le',
    'ind_actif',
    'ordre',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  ouvrage_unites: [
    'id',
    'ouvrage_id',
    'unite_id',
    'prix_unitaire',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  clients: [
    'id',
    'entreprise_id',
    'nom_complet',
    'telephone_1',
    'telephone_2',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  chantiers: [
    'id',
    'client_id',
    'chef_chantier_id',
    'nom',
    'adresse',
    'responsable',
    'status',
    'notes',
    'photo_1',
    'photo_2',
    'photo_3',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  releves: [
    'id',
    'chantier_id',
    'prise_par_id',
    'date_facture',
    'total_ht_facture',
    'tva_facture',
    'total_ttc_facture',
    'remise',
    'ind_tva',
    'status',
    'note',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  section_releves: [
    'id',
    'section_id',
    'releve_id',
    'ordre',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
  ligne_releves: [
    'id',
    'releve_id',
    'ouvrage_unite_id',
    'largeur',
    'hauteur',
    'profondeur',
    'nombre',
    'quantite',
    'prix_unitaire_applique',
    'montant',
    'note',
    'photo',
    'section_id',
    'ordre',
    'ind_complete',
    'supprime_le',
    'cree_le',
    'mis_a_jour_le',
    '_synced',
  ],
};

const coerceFlag = (value: unknown) => {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  if (value == null) return null;
  return Number(value) === 1 ? 1 : 0;
};

const coerceTimestamp = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const sanitizePushRow = (tableName: string, rawRow: Record<string, unknown>) => {
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) return rawRow;

  const normalized: Record<string, unknown> = {};
  columns.forEach((column) => {
    if (!Object.prototype.hasOwnProperty.call(rawRow, column)) {
      if (tableName === 'releves' && column === 'ind_tva') {
        normalized[column] = 0;
      } else if (tableName === 'releves' && column === 'status') {
        normalized[column] = 'E';
      }
      return;
    }
    const value = rawRow[column];
    if (FLAG_COLUMNS.has(column)) {
      normalized[column] = coerceFlag(value);
    } else if (TIMESTAMP_COLUMNS.has(column)) {
      normalized[column] = coerceTimestamp(value);
    } else {
      normalized[column] = value;
    }
  });
  normalized._synced = 1;
  return normalized;
};

const sanitizePushRows = (tableName: string, rows: Record<string, unknown>[]) =>
  rows.map((row) => sanitizePushRow(tableName, row));

const upsertBatch = async (
  supabase: ReturnType<typeof createClient>,
  tableName: string,
  rows: Record<string, unknown>[]
) => {
  if (!rows.length) return null;
  const { error } = await supabase.from(tableName).upsert(rows, { onConflict: 'id' });
  return error;
};

const fetchMetiersPullData = async (
  supabase: ReturnType<typeof createClient>,
  entrepriseId: string
) => {
  const { data: metiers, error } = await supabase
    .from('metiers')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null)
    .order('ordre', { ascending: true })
    .order('nom', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erreur chargement métiers.');
  }

  return metiers ?? [];
};

const DEFAULT_SECTION_NOM = 'Pas de section';

const sortSectionsForPull = (sections: Record<string, unknown>[]) =>
  [...sections].sort((left, right) => {
    const leftDefault =
      String(left.nom ?? '')
        .trim()
        .toLowerCase() === DEFAULT_SECTION_NOM.toLowerCase();
    const rightDefault =
      String(right.nom ?? '')
        .trim()
        .toLowerCase() === DEFAULT_SECTION_NOM.toLowerCase();
    if (leftDefault && !rightDefault) return -1;
    if (!leftDefault && rightDefault) return 1;
    return String(left.nom ?? '').localeCompare(String(right.nom ?? ''), 'fr', {
      sensitivity: 'base',
    });
  });

const fetchSectionsPullData = async (
  supabase: ReturnType<typeof createClient>,
  entrepriseId: string
) => {
  const { data: sections, error } = await supabase
    .from('sections')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null)
    .order('nom', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erreur chargement sections.');
  }

  return sortSectionsForPull(sections ?? []);
};

const mapMetierRowsForInsert = (
  metierRows: Record<string, unknown>[],
  entrepriseId: string,
  now: string
) =>
  metierRows.map((row, index) => {
    const nom = String(row.nom ?? '').trim();
    if (!nom) throw new Error('Nom de metier requis.');
    return {
      id: String(row.id),
      nom,
      abbrev: String(row.abbrev ?? nom.slice(0, 3)).trim().toUpperCase(),
      icon: null,
      entreprise_id: entrepriseId,
      ordre: Number(row.ordre ?? index),
      ind_actif: 1,
      ind_default: Number(row.ind_default ?? 1) === 0 ? 0 : 1,
      supprime_le: null,
      cree_le: now,
      mis_a_jour_le: now,
      _synced: 1,
    };
  });

const commitMetiersPreselection = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown>,
  entrepriseId: string,
  metierRows: Record<string, unknown>[]
) => {
  if (Number(entreprise.ind_metiers_preselectionnes) === 1) {
    throw new Error('Les metiers ont deja ete selectionnes.');
  }

  const { count, error: countError } = await supabase
    .from('metiers')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null);

  if (countError) {
    throw new Error(countError.message || 'Erreur lecture metiers.');
  }
  if ((count ?? 0) > 0) {
    throw new Error('Des metiers existent deja pour cette entreprise.');
  }

  const isPro = Number(entreprise.ind_pro) === 1;
  const maxCount = isPro ? 11 : FREE_MAX_METIERS;
  if (metierRows.length < 1 || metierRows.length > maxCount) {
    throw new Error(
      isPro
        ? 'Selectionnez entre 1 et 11 metiers.'
        : `Selectionnez entre 1 et ${FREE_MAX_METIERS} metiers.`
    );
  }

  const now = new Date().toISOString();
  const rows = mapMetierRowsForInsert(metierRows, entrepriseId, now);

  const { error: insertError } = await supabase.from('metiers').insert(rows);
  if (insertError) {
    throw new Error(insertError.message || 'Erreur creation metiers.');
  }

  const { data: updatedEntreprise, error: entrepriseError } = await supabase
    .from('entreprises')
    .update({ ind_metiers_preselectionnes: 1, mis_a_jour_le: now })
    .eq('id', entrepriseId)
    .select('*')
    .maybeSingle();

  if (entrepriseError) {
    throw new Error(entrepriseError.message || 'Erreur validation metiers.');
  }

  return (updatedEntreprise ?? {
    ...entreprise,
    ind_metiers_preselectionnes: 1,
    mis_a_jour_le: now,
  }) as Record<string, unknown>;
};

const commitMetiersRepair = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown>,
  entrepriseId: string,
  metierRows: Record<string, unknown>[]
) => {
  const { count, error: countError } = await supabase
    .from('metiers')
    .select('id', { count: 'exact', head: true })
    .eq('entreprise_id', entrepriseId)
    .is('supprime_le', null);

  if (countError) {
    throw new Error(countError.message || 'Erreur lecture metiers.');
  }
  if ((count ?? 0) > 0) {
    throw new Error('Des metiers existent deja sur le cloud.');
  }
  if (!metierRows.length) {
    throw new Error('Aucun metier a reparer.');
  }

  const now = new Date().toISOString();
  const rows = mapMetierRowsForInsert(metierRows, entrepriseId, now);
  const { error: insertError } = await supabase.from('metiers').insert(rows);
  if (insertError) {
    throw new Error(insertError.message || 'Erreur reparation metiers.');
  }

  if (Number(entreprise.ind_metiers_preselectionnes) === 1) {
    return entreprise;
  }

  const { data: updatedEntreprise, error: entrepriseError } = await supabase
    .from('entreprises')
    .update({ ind_metiers_preselectionnes: 1, mis_a_jour_le: now })
    .eq('id', entrepriseId)
    .select('*')
    .maybeSingle();

  if (entrepriseError) {
    throw new Error(entrepriseError.message || 'Erreur validation metiers.');
  }

  return (updatedEntreprise ?? {
    ...entreprise,
    ind_metiers_preselectionnes: 1,
    mis_a_jour_le: now,
  }) as Record<string, unknown>;
};

const buildAccountPullPayload = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown>,
  profilRow: Record<string, unknown>,
  entrepriseId: string
) => {
  const [metiersPull, sectionsPull, unitesResult, profilsResult, refreshedEntreprise] = await Promise.all([
    fetchMetiersPullData(supabase, entrepriseId),
    fetchSectionsPullData(supabase, entrepriseId),
    supabase.from('unites').select('*'),
    supabase
      .from('profils')
      .select(
        'id, entreprise_id, prenom, nom, telephone_1, telephone_2, role, identifiant, date_premier_login, cree_le, mis_a_jour_le, _synced'
      )
      .eq('entreprise_id', entrepriseId),
    supabase.from('entreprises').select('*').eq('id', entrepriseId).maybeSingle(),
  ]);

  const queryError =
    unitesResult.error || profilsResult.error || refreshedEntreprise.error;
  if (queryError) {
    throw new Error(queryError.message || 'Erreur chargement des donnees.');
  }

  return {
    entreprise: (refreshedEntreprise.data ?? entreprise) as Record<string, unknown>,
    profil: stripProfil(profilRow),
    profils: profilsResult.data ?? [],
    metiers: metiersPull,
    sections: sectionsPull,
    unites: unitesResult.data ?? [],
    ouvrages: [],
    ouvrage_unites: [],
    fournisseurs: [],
    clients: [],
    chantiers: [],
    releves: [],
    section_releves: [],
    ligne_releves: [],
  };
};

const buildProPullPayload = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown>,
  profilRow: Record<string, unknown>,
  entrepriseId: string
) => {
  const proActivatedLe = entreprise.pro_activated_le as string | null | undefined;

  const [
    metiersPull,
    sectionsPull,
    unitesResult,
    fournisseursResult,
    ouvragesResult,
    clientsResult,
    profilsResult,
    refreshedEntreprise,
  ] = await Promise.all([
    fetchMetiersPullData(supabase, entrepriseId),
    fetchSectionsPullData(supabase, entrepriseId),
    supabase.from('unites').select('*'),
    supabase.from('fournisseurs').select('*').eq('entreprise_id', entrepriseId),
    supabase.from('ouvrages').select('*').eq('entreprise_id', entrepriseId),
    supabase.from('clients').select('*').eq('entreprise_id', entrepriseId),
    supabase
      .from('profils')
      .select(
        'id, entreprise_id, prenom, nom, telephone_1, telephone_2, role, identifiant, date_premier_login, cree_le, mis_a_jour_le, _synced'
      )
      .eq('entreprise_id', entrepriseId),
    supabase.from('entreprises').select('*').eq('id', entrepriseId).maybeSingle(),
  ]);

  const queryError =
    unitesResult.error ||
    fournisseursResult.error ||
    ouvragesResult.error ||
    clientsResult.error ||
    profilsResult.error ||
    refreshedEntreprise.error;

  if (queryError) {
    throw new Error(queryError.message || 'Erreur chargement des donnees.');
  }

  let fournisseurs = filterTransactionalRowsForProPull(fournisseursResult.data ?? [], proActivatedLe);
  let ouvrages = filterTransactionalRowsForProPull(ouvragesResult.data ?? [], proActivatedLe);
  let clients = filterTransactionalRowsForProPull(clientsResult.data ?? [], proActivatedLe);
  const ouvrageIds = ouvrages.map((item) => item.id);
  const clientIds = clients.map((item) => item.id);

  let ouvrageUnites: Record<string, unknown>[] = [];
  if (ouvrageIds.length > 0) {
    const { data, error } = await supabase
      .from('ouvrage_unites')
      .select('*')
      .in('ouvrage_id', ouvrageIds);
    if (error) {
      throw new Error(error.message || 'Erreur chargement ouvrage_unites.');
    }
    ouvrageUnites = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
  }

  let chantiers: Record<string, unknown>[] = [];
  if (clientIds.length > 0) {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .in('client_id', clientIds);
    if (error) {
      throw new Error(error.message || 'Erreur chargement chantiers.');
    }
    chantiers = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
  }

  const chantierIds = chantiers.map((item) => String(item.id));
  let releves: Record<string, unknown>[] = [];
  if (chantierIds.length > 0) {
    const { data, error } = await supabase
      .from('releves')
      .select('*')
      .in('chantier_id', chantierIds);
    if (error) {
      throw new Error(error.message || 'Erreur chargement releves.');
    }
    releves = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
  }

  const releveIds = releves.map((item) => String(item.id));
  let ligneReleves: Record<string, unknown>[] = [];
  if (releveIds.length > 0) {
    const { data, error } = await supabase
      .from('ligne_releves')
      .select('*')
      .in('releve_id', releveIds);
    if (error) {
      throw new Error(error.message || 'Erreur chargement ligne_releves.');
    }
    ligneReleves = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
  }

  let sectionReleves: Record<string, unknown>[] = [];
  if (releveIds.length > 0) {
    const { data, error } = await supabase
      .from('section_releves')
      .select('*')
      .in('releve_id', releveIds);
    if (error) {
      throw new Error(error.message || 'Erreur chargement section_releves.');
    }
    sectionReleves = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
  }

  return {
    entreprise: (refreshedEntreprise.data ?? entreprise) as Record<string, unknown>,
    profil: stripProfil(profilRow),
    profils: profilsResult.data ?? [],
    metiers: metiersPull,
    sections: sectionsPull,
    unites: unitesResult.data ?? [],
    fournisseurs,
    ouvrages,
    ouvrage_unites: ouvrageUnites,
    clients,
    chantiers,
    releves,
    section_releves: sectionReleves,
    ligne_releves: ligneReleves,
  };
};

const pushEntrepriseRow = async (
  supabase: ReturnType<typeof createClient>,
  profilRow: Record<string, unknown>,
  entrepriseId: string,
  rows: Record<string, unknown>[]
) => {
  if (String(profilRow.role) !== 'A') {
    return null;
  }

  const row = rows.find((item) => String(item.id) === entrepriseId);
  if (!row) {
    return null;
  }

  const nom = String(row.nom ?? '').trim();
  if (!nom) {
    throw new Error('Nom entreprise requis.');
  }

  const misAJourLe =
    typeof row.mis_a_jour_le === 'string' && row.mis_a_jour_le
      ? row.mis_a_jour_le
      : new Date().toISOString();

  const { error: entrepriseUpdateError } = await supabase
    .from('entreprises')
    .update({
      nom,
      ind_tva: Number(row.ind_tva) === 1 ? 1 : 0,
      mis_a_jour_le: misAJourLe,
    })
    .eq('id', entrepriseId);

  if (entrepriseUpdateError) {
    throw new Error(entrepriseUpdateError.message || 'Erreur mise a jour entreprise.');
  }

  const { data: refreshedEntreprise, error: refreshedEntrepriseError } = await supabase
    .from('entreprises')
    .select('*')
    .eq('id', entrepriseId)
    .maybeSingle();

  if (refreshedEntrepriseError) {
    throw new Error(refreshedEntrepriseError.message || 'Erreur chargement entreprise.');
  }

  return refreshedEntreprise as Record<string, unknown> | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Methode non autorisee.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: 'Configuration Supabase incomplete.' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const identifiant = normalizeIdentifiant(String(body?.identifiant ?? ''));
    const motDePasse = String(body?.motDePasse ?? '');
    const push = (body?.push ?? {}) as Record<string, Record<string, unknown>[]>;
    const deletePayload = (body?.delete ?? {}) as Record<string, string[]>;

    if (!identifiant || !motDePasse) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    const { data: profilRow, error: profilError } = await supabase
      .from('profils')
      .select('*, entreprises(*)')
      .eq('identifiant', identifiant)
      .maybeSingle();

    if (profilError || !profilRow) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    if (!timingSafeEqualString(motDePasse, String(profilRow.mot_de_passe ?? ''))) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    let entreprise = profilRow.entreprises as Record<string, unknown> | null;
    if (!entreprise) {
      return jsonResponse({ ok: false, error: 'Compte inactif.' });
    }

    const expiryCheck = await deactivateExpiredProEntreprise(supabase, entreprise);
    if (expiryCheck.expired) {
      return jsonResponse({ ok: false, error: 'Compte inactif.' });
    }
    entreprise = expiryCheck.entreprise as Record<string, unknown>;

    if (Number(entreprise.ind_active) !== 1) {
      return jsonResponse({ ok: false, error: 'Compte inactif.' });
    }

    const entrepriseId = String(entreprise.id);
    const isProAccount = Number(entreprise.ind_pro) === 1;
    const action = String(body?.action ?? '');

    if (action === 'preselect_metiers') {
      if (String(profilRow.role) !== 'A') {
        return jsonResponse({ ok: false, error: 'Acces reserve aux administrateurs.' }, 403);
      }

      try {
        const metierRows = Array.isArray(body?.metiers) ? (body.metiers as Record<string, unknown>[]) : [];
        entreprise = await commitMetiersPreselection(
          supabase,
          entreprise as Record<string, unknown>,
          entrepriseId,
          metierRows
        );

        const pull = isProAccount
          ? await buildProPullPayload(
              supabase,
              entreprise,
              profilRow as Record<string, unknown>,
              entrepriseId
            )
          : await buildAccountPullPayload(
              supabase,
              entreprise,
              profilRow as Record<string, unknown>,
              entrepriseId
            );

        return jsonResponse({
          ok: true,
          pull,
          entreprise: pull.entreprise ?? entreprise,
        });
      } catch (preselectError) {
        const message =
          preselectError instanceof Error ? preselectError.message : 'Erreur selection metiers.';
        return jsonResponse({ ok: false, error: message }, 500);
      }
    }

    if (action === 'repair_metiers') {
      if (String(profilRow.role) !== 'A') {
        return jsonResponse({ ok: false, error: 'Acces reserve aux administrateurs.' }, 403);
      }

      try {
        const metierRows = Array.isArray(body?.metiers) ? (body.metiers as Record<string, unknown>[]) : [];
        entreprise = await commitMetiersRepair(
          supabase,
          entreprise as Record<string, unknown>,
          entrepriseId,
          metierRows
        );

        const pull = isProAccount
          ? await buildProPullPayload(
              supabase,
              entreprise,
              profilRow as Record<string, unknown>,
              entrepriseId
            )
          : await buildAccountPullPayload(
              supabase,
              entreprise,
              profilRow as Record<string, unknown>,
              entrepriseId
            );

        return jsonResponse({
          ok: true,
          pull,
          entreprise: pull.entreprise ?? entreprise,
        });
      } catch (repairError) {
        const message =
          repairError instanceof Error ? repairError.message : 'Erreur reparation metiers.';
        return jsonResponse({ ok: false, error: message }, 500);
      }
    }

    if (!isProAccount) {
      try {
        const entrepriseRows = Array.isArray(push.entreprises) ? push.entreprises : [];
        const refreshed = await pushEntrepriseRow(
          supabase,
          profilRow as Record<string, unknown>,
          entrepriseId,
          entrepriseRows
        );
        if (refreshed) {
          entreprise = refreshed;
        }

        const pull = await buildAccountPullPayload(
          supabase,
          entreprise,
          profilRow as Record<string, unknown>,
          entrepriseId
        );

        return jsonResponse({
          ok: true,
          mode: 'free_account',
          pushedCounts: {
            entreprises: entrepriseRows.length,
            fournisseurs: 0,
            ouvrages: 0,
            ouvrage_unites: 0,
            clients: 0,
            chantiers: 0,
            releves: 0,
            section_releves: 0,
            ligne_releves: 0,
          },
          pull,
        });
      } catch (freeError) {
        const message = freeError instanceof Error ? freeError.message : 'Erreur synchronisation gratuite.';
        return jsonResponse({ ok: false, error: message }, 500);
      }
    }

    const { data: existingOuvrages, error: existingOuvragesError } = await supabase
      .from('ouvrages')
      .select('id')
      .eq('entreprise_id', entrepriseId);

    if (existingOuvragesError) {
      return jsonResponse(
        { ok: false, error: existingOuvragesError.message || 'Erreur chargement ouvrages.' },
        500
      );
    }

    const allowedOuvrageIds = new Set(
      (existingOuvrages ?? []).map((row) => String(row.id))
    );

    const { data: existingFournisseurs, error: existingFournisseursError } = await supabase
      .from('fournisseurs')
      .select('id')
      .eq('entreprise_id', entrepriseId);

    if (existingFournisseursError) {
      return jsonResponse(
        { ok: false, error: existingFournisseursError.message || 'Erreur chargement fournisseurs.' },
        500
      );
    }

    const allowedFournisseurIds = new Set(
      (existingFournisseurs ?? []).map((row) => String(row.id))
    );

    const ouvrageDeleteIds = (Array.isArray(deletePayload.ouvrages) ? deletePayload.ouvrages : [])
      .map((id) => String(id))
      .filter(Boolean);

    if (ouvrageDeleteIds.length > 0) {
      const { data: ouvragesToDelete, error: ouvragesToDeleteError } = await supabase
        .from('ouvrages')
        .select('id')
        .eq('entreprise_id', entrepriseId)
        .in('id', ouvrageDeleteIds);

      if (ouvragesToDeleteError) {
        return jsonResponse(
          { ok: false, error: ouvragesToDeleteError.message || 'Erreur suppression ouvrages.' },
          500
        );
      }

      const scopedOuvrageDeleteIds = (ouvragesToDelete ?? []).map((row) => String(row.id));
      if (scopedOuvrageDeleteIds.length > 0) {
        const now = new Date().toISOString();
        const { error: ouvrageUniteDeleteError } = await supabase
          .from('ouvrage_unites')
          .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
          .in('ouvrage_id', scopedOuvrageDeleteIds);
        if (ouvrageUniteDeleteError) {
          return jsonResponse(
            { ok: false, error: ouvrageUniteDeleteError.message || 'Erreur suppression ouvrages.' },
            500
          );
        }

        const { error: ouvrageDeleteError } = await supabase
          .from('ouvrages')
          .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
          .in('id', scopedOuvrageDeleteIds);

        if (ouvrageDeleteError) {
          return jsonResponse(
            { ok: false, error: ouvrageDeleteError.message || 'Erreur suppression ouvrages.' },
            500
          );
        }
      }
    }

    const allowedClientIds = new Set<string>();
    const allowedChantierIds = new Set<string>();
    const allowedReleveIds = new Set<string>();
    const allowedSectionIds = new Set<string>();

    const { data: existingClients, error: existingClientsError } = await supabase
      .from('clients')
      .select('id')
      .eq('entreprise_id', entrepriseId);

    if (existingClientsError) {
      return jsonResponse(
        { ok: false, error: existingClientsError.message || 'Erreur chargement clients.' },
        500
      );
    }

    (existingClients ?? []).forEach((row) => allowedClientIds.add(String(row.id)));

    const { data: existingSections, error: existingSectionsError } = await supabase
      .from('sections')
      .select('id')
      .eq('entreprise_id', entrepriseId);

    if (existingSectionsError) {
      return jsonResponse(
        { ok: false, error: existingSectionsError.message || 'Erreur chargement sections.' },
        500
      );
    }

    (existingSections ?? []).forEach((row) => allowedSectionIds.add(String(row.id)));

    for (const tableName of PUSH_ORDER) {
      const rows = Array.isArray(push[tableName]) ? push[tableName] : [];
      let scoped = sanitizePushRows(tableName, rows);

      if (tableName === 'entreprises') {
        try {
          const refreshed = await pushEntrepriseRow(
            supabase,
            profilRow as Record<string, unknown>,
            entrepriseId,
            rows
          );
          if (refreshed) {
            entreprise = refreshed;
          }
        } catch (entrepriseError) {
          const message =
            entrepriseError instanceof Error ? entrepriseError.message : 'Erreur mise a jour entreprise.';
          return jsonResponse({ ok: false, error: message }, 500);
        }
        continue;
      }

      if (tableName === 'metiers' && String(profilRow.role) !== 'A') {
        continue;
      }

      if (tableName === 'fournisseurs') {
        scoped = scoped.filter((row) => String(row.entreprise_id) === entrepriseId);
        scoped.forEach((row) => allowedFournisseurIds.add(String(row.id)));
      } else if (tableName === 'metiers') {
        scoped = scoped.filter((row) => String(row.entreprise_id) === entrepriseId);
      } else if (tableName === 'sections') {
        scoped = scoped.filter((row) => String(row.entreprise_id) === entrepriseId);
        scoped.forEach((row) => allowedSectionIds.add(String(row.id)));
      } else if (tableName === 'ouvrages') {
        scoped = scoped.filter((row) => String(row.entreprise_id) === entrepriseId);
        scoped = scoped.filter((row) => {
          if (Number(row.ind_article) === 1 && row.fournisseur_id) {
            return allowedFournisseurIds.has(String(row.fournisseur_id));
          }
          return true;
        });
        scoped.forEach((row) => allowedOuvrageIds.add(String(row.id)));
      } else if (tableName === 'ouvrage_unites') {
        scoped = scoped.filter((row) => allowedOuvrageIds.has(String(row.ouvrage_id)));
      } else if (tableName === 'clients') {
        scoped = scoped.filter((row) => String(row.entreprise_id) === entrepriseId);
        scoped.forEach((row) => allowedClientIds.add(String(row.id)));
      } else if (tableName === 'chantiers') {
        scoped = scoped.filter((row) => allowedClientIds.has(String(row.client_id)));
        scoped.forEach((row) => allowedChantierIds.add(String(row.id)));
      } else if (tableName === 'releves') {
        scoped = scoped.filter((row) => allowedChantierIds.has(String(row.chantier_id)));
        scoped.forEach((row) => allowedReleveIds.add(String(row.id)));
      } else if (tableName === 'section_releves') {
        scoped = scoped.filter(
          (row) =>
            allowedReleveIds.has(String(row.releve_id)) &&
            allowedSectionIds.has(String(row.section_id))
        );
      } else if (tableName === 'ligne_releves') {
        scoped = scoped.filter((row) => allowedReleveIds.has(String(row.releve_id)));
        scoped = scoped.filter((row) => {
          if (!row.section_id) return true;
          return allowedSectionIds.has(String(row.section_id));
        });
      }

      const error = await upsertBatch(supabase, tableName, scoped);
      if (error) {
        return jsonResponse({ ok: false, error: `${tableName}: ${error.message}` }, 500);
      }

      if (tableName === 'clients' && allowedClientIds.size > 0) {
        const { data: chantiersForClients, error: chantiersForClientsError } = await supabase
          .from('chantiers')
          .select('id, client_id')
          .in('client_id', [...allowedClientIds]);

        if (chantiersForClientsError) {
          return jsonResponse(
            { ok: false, error: chantiersForClientsError.message || 'Erreur chargement chantiers.' },
            500
          );
        }

        (chantiersForClients ?? []).forEach((row) => allowedChantierIds.add(String(row.id)));
      }

      if (tableName === 'chantiers' && allowedChantierIds.size > 0) {
        const { data: relevesForChantiers, error: relevesForChantiersError } = await supabase
          .from('releves')
          .select('id, chantier_id')
          .in('chantier_id', [...allowedChantierIds]);

        if (relevesForChantiersError) {
          return jsonResponse(
            { ok: false, error: relevesForChantiersError.message || 'Erreur chargement releves.' },
            500
          );
        }

        (relevesForChantiers ?? []).forEach((row) => allowedReleveIds.add(String(row.id)));
      }
    }

    let pull;
    try {
      pull = await buildProPullPayload(
        supabase,
        entreprise,
        profilRow as Record<string, unknown>,
        entrepriseId
      );
      entreprise = pull.entreprise;
    } catch (pullError) {
      const message = pullError instanceof Error ? pullError.message : 'Erreur chargement des donnees.';
      return jsonResponse({ ok: false, error: message }, 500);
    }

    const pushedCounts = {
      entreprises: Array.isArray(push.entreprises) ? push.entreprises.length : 0,
      fournisseurs: Array.isArray(push.fournisseurs) ? push.fournisseurs.length : 0,
      ouvrages: Array.isArray(push.ouvrages) ? push.ouvrages.length : 0,
      ouvrage_unites: Array.isArray(push.ouvrage_unites) ? push.ouvrage_unites.length : 0,
      clients: Array.isArray(push.clients) ? push.clients.length : 0,
      chantiers: Array.isArray(push.chantiers) ? push.chantiers.length : 0,
      releves: Array.isArray(push.releves) ? push.releves.length : 0,
      section_releves: Array.isArray(push.section_releves) ? push.section_releves.length : 0,
      ligne_releves: Array.isArray(push.ligne_releves) ? push.ligne_releves.length : 0,
    };

    return jsonResponse({
      ok: true,
      mode: 'pro',
      pushedCounts,
      pull,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
