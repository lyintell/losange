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
    const motDePasseActuel = String(body?.motDePasseActuel ?? '');
    const nouveauMotDePasse = String(body?.nouveauMotDePasse ?? '');

    if (!identifiant || !motDePasseActuel || !nouveauMotDePasse) {
      return jsonResponse({ ok: false, error: 'Identifiant et mots de passe requis.' });
    }

    if (nouveauMotDePasse.length < 4) {
      return jsonResponse({ ok: false, error: 'Le nouveau mot de passe est trop court.' });
    }

    if (timingSafeEqualString(motDePasseActuel, nouveauMotDePasse)) {
      return jsonResponse({ ok: false, error: 'Le nouveau mot de passe doit etre different.' });
    }

    const { data: profilRow, error: profilError } = await supabase
      .from('profils')
      .select('id, identifiant, mot_de_passe')
      .eq('identifiant', identifiant)
      .maybeSingle();

    if (profilError || !profilRow) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    if (!timingSafeEqualString(motDePasseActuel, String(profilRow.mot_de_passe ?? ''))) {
      return jsonResponse({ ok: false, error: 'Mot de passe actuel incorrect.' });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('profils')
      .update({ mot_de_passe: nouveauMotDePasse, mis_a_jour_le: now, _synced: 1 })
      .eq('id', profilRow.id);

    if (updateError) {
      return jsonResponse({ ok: false, error: updateError.message || 'Impossible de changer le mot de passe.' }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
