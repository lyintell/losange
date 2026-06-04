import {
  assertMasterSecretsConfigured,
  corsHeaders,
  jsonResponse,
  verifySessionToken,
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
    const token = String(body?.token ?? '');
    const valid = await verifySessionToken(secrets.sessionSecret, token);

    if (!valid) {
      return jsonResponse({ ok: false, error: 'Session invalide ou expiree.' });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message });
  }
});
