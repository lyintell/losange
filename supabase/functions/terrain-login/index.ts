import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { filterTransactionalRowsForProPull } from './entrepriseTier.ts';

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

const recordProfilFirstLogin = async (
  supabase: ReturnType<typeof createClient>,
  profil: Record<string, unknown>
) => {
  if (profil.date_premier_login) {
    return profil;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profils')
    .update({ date_premier_login: now, mis_a_jour_le: now })
    .eq('id', String(profil.id))
    .is('date_premier_login', null)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible d enregistrer le premier login.');
  }

  return data ?? { ...profil, date_premier_login: now, mis_a_jour_le: now };
};

const recordAdminMobileLogin = async (
  supabase: ReturnType<typeof createClient>,
  entreprise: Record<string, unknown>,
  profil: Record<string, unknown>,
  source: string
) => {
  if (source !== 'mobile') return entreprise;
  if (String(profil.role || '').toUpperCase() !== 'A') return entreprise;
  if (Number(entreprise.ind_admin_connecte_mobile) === 1) return entreprise;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('entreprises')
    .update({ ind_admin_connecte_mobile: 1, mis_a_jour_le: now })
    .eq('id', String(entreprise.id))
    .eq('ind_admin_connecte_mobile', 0)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Impossible d enregistrer la connexion admin mobile.');
  }

  return (data ?? { ...entreprise, ind_admin_connecte_mobile: 1, mis_a_jour_le: now }) as Record<
    string,
    unknown
  >;
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
    const source = String(body?.source ?? 'web').toLowerCase();

    if (!identifiant || !motDePasse) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    let { data: profilRow, error: profilError } = await supabase
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

    const profilWithFirstLogin = await recordProfilFirstLogin(supabase, profilRow as Record<string, unknown>);
    profilRow = { ...profilRow, ...profilWithFirstLogin };

    entreprise = await recordAdminMobileLogin(
      supabase,
      entreprise as Record<string, unknown>,
      profilRow as Record<string, unknown>,
      source
    );

    const entrepriseId = String(entreprise.id);
    const isProAccount = Number(entreprise.ind_pro) === 1;

    const [metiersPull, sectionsPull, unitesResult, profilsResult] = await Promise.all([
      fetchMetiersPullData(supabase, entrepriseId),
      fetchSectionsPullData(supabase, entrepriseId),
      supabase.from('unites').select('*'),
      supabase
        .from('profils')
        .select('id, entreprise_id, prenom, nom, telephone_1, telephone_2, role, identifiant, date_premier_login, cree_le, mis_a_jour_le, _synced')
        .eq('entreprise_id', entrepriseId),
    ]);

    const queryError = unitesResult.error || profilsResult.error;

    if (queryError) {
      return jsonResponse({ ok: false, error: queryError.message || 'Erreur chargement des donnees.' }, 500);
    }

    if (!isProAccount) {
      return jsonResponse({
        ok: true,
        payload: {
          entreprise,
          profil: stripProfil(profilRow as Record<string, unknown>),
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
        },
      });
    }

    const [fournisseursResult, ouvragesResult, clientsResult] = await Promise.all([
      supabase.from('fournisseurs').select('*').eq('entreprise_id', entrepriseId),
      supabase.from('ouvrages').select('*').eq('entreprise_id', entrepriseId),
      supabase.from('clients').select('*').eq('entreprise_id', entrepriseId),
    ]);

    if (fournisseursResult.error || ouvragesResult.error || clientsResult.error) {
      return jsonResponse(
        {
          ok: false,
          error:
            fournisseursResult.error?.message ||
            ouvragesResult.error?.message ||
            clientsResult.error?.message ||
            'Erreur chargement.',
        },
        500
      );
    }

    const proActivatedLe = entreprise.pro_activated_le as string | null | undefined;
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
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement ouvrage_unites.' }, 500);
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
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement chantiers.' }, 500);
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
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement releves.' }, 500);
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
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement ligne_releves.' }, 500);
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
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement section_releves.' }, 500);
      }
      sectionReleves = filterTransactionalRowsForProPull(data ?? [], proActivatedLe);
    }

    return jsonResponse({
      ok: true,
      payload: {
        entreprise,
        profil: stripProfil(profilRow as Record<string, unknown>),
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
