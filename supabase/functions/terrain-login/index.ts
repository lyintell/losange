import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const entreprise = profilRow.entreprises as Record<string, unknown> | null;
    if (!entreprise || Number(entreprise.ind_active) !== 1) {
      return jsonResponse({ ok: false, error: 'Compte inactif.' });
    }

    const entrepriseId = String(entreprise.id);

    const [
      metiersResult,
      unitesResult,
      ouvragesResult,
      clientsResult,
      profilsResult,
    ] = await Promise.all([
      supabase.from('metiers').select('*'),
      supabase.from('unites').select('*'),
      supabase.from('ouvrages').select('*').eq('entreprise_id', entrepriseId),
      supabase.from('clients').select('*').eq('entreprise_id', entrepriseId),
      supabase
        .from('profils')
        .select('id, entreprise_id, prenom, nom, telephone_1, telephone_2, role, identifiant, cree_le, mis_a_jour_le, _synced')
        .eq('entreprise_id', entrepriseId),
    ]);

    const queryError =
      metiersResult.error ||
      unitesResult.error ||
      ouvragesResult.error ||
      clientsResult.error ||
      profilsResult.error;

    if (queryError) {
      return jsonResponse({ ok: false, error: queryError.message || 'Erreur chargement des donnees.' }, 500);
    }

    const ouvrages = ouvragesResult.data ?? [];
    const ouvrageIds = ouvrages.map((item) => item.id);
    const clients = clientsResult.data ?? [];
    const clientIds = clients.map((item) => item.id);

    let ouvrageUnites: Record<string, unknown>[] = [];
    if (ouvrageIds.length > 0) {
      const { data, error } = await supabase.from('ouvrage_unites').select('*').in('ouvrage_id', ouvrageIds);
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement ouvrage_unites.' }, 500);
      }
      ouvrageUnites = data ?? [];
    }

    let chantiers: Record<string, unknown>[] = [];
    if (clientIds.length > 0) {
      const { data, error } = await supabase.from('chantiers').select('*').in('client_id', clientIds);
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement chantiers.' }, 500);
      }
      chantiers = data ?? [];
    }

    const chantierIds = chantiers.map((item) => String(item.id));
    let releves: Record<string, unknown>[] = [];
    if (chantierIds.length > 0) {
      const { data, error } = await supabase.from('releves').select('*').in('chantier_id', chantierIds);
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement releves.' }, 500);
      }
      releves = data ?? [];
    }

    const releveIds = releves.map((item) => String(item.id));
    let ligneReleves: Record<string, unknown>[] = [];
    if (releveIds.length > 0) {
      const { data, error } = await supabase.from('ligne_releves').select('*').in('releve_id', releveIds);
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur chargement ligne_releves.' }, 500);
      }
      ligneReleves = data ?? [];
    }

    return jsonResponse({
      ok: true,
      payload: {
        entreprise,
        profil: stripProfil(profilRow as Record<string, unknown>),
        profils: profilsResult.data ?? [],
        metiers: metiersResult.data ?? [],
        unites: unitesResult.data ?? [],
        ouvrages,
        ouvrage_unites: ouvrageUnites,
        clients,
        chantiers,
        releves,
        ligne_releves: ligneReleves,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
