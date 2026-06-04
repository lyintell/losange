import {
  assertMasterSecretsConfigured,
  corsHeaders,
  createSessionToken,
  jsonResponse,
  normalizeIdentifiant,
  timingSafeEqualString,
} from './masterSession.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Methode non autorisee.' }, 405);
  }

  try {
    const secrets = assertMasterSecretsConfigured();
    const body = await req.json();
    const identifiant = String(body?.identifiant ?? '');
    const motDePasse = String(body?.motDePasse ?? '');

    const identifiantOk =
      normalizeIdentifiant(identifiant) === normalizeIdentifiant(secrets.identifiant);
    const motDePasseOk = timingSafeEqualString(motDePasse, secrets.motDePasse);

    if (!identifiantOk || !motDePasseOk) {
      return jsonResponse({ ok: false, error: 'Identifiant ou mot de passe incorrect.' });
    }

    const token = await createSessionToken(secrets.sessionSecret);
    return jsonResponse({ ok: true, token });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message });
  }
});
