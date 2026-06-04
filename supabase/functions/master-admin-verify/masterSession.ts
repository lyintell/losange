const encoder = new TextEncoder();

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const normalizeIdentifiant = (value: string) => value.trim().toUpperCase();

export const timingSafeEqualString = (left: string, right: string) => {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.byteLength !== b.byteLength) return false;
  let mismatch = 0;
  for (let index = 0; index < a.byteLength; index += 1) {
    mismatch |= a[index] ^ b[index];
  }
  return mismatch === 0;
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  const normalized = padded + '='.repeat(padLength);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const importHmacKey = async (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export const createSessionToken = async (secret: string, ttlSeconds = 60 * 60 * 24) => {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = JSON.stringify({ role: 'master', exp });
  const payloadPart = toBase64Url(encoder.encode(payload));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadPart));
  return `${payloadPart}.${toBase64Url(new Uint8Array(signature))}`;
};

export const verifySessionToken = async (secret: string, token: string) => {
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return false;

  const key = await importHmacKey(secret);
  const signatureBytes = fromBase64Url(signaturePart);
  const validSignature = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payloadPart));
  if (!validSignature) return false;

  const payloadJson = new TextDecoder().decode(fromBase64Url(payloadPart));
  const payload = JSON.parse(payloadJson) as { role?: string; exp?: number };
  if (payload.role !== 'master' || !payload.exp) return false;
  return payload.exp > Math.floor(Date.now() / 1000);
};

export const readMasterSecrets = () => ({
  identifiant: Deno.env.get('MASTER_ADMIN_IDENTIFIANT') ?? '',
  motDePasse: Deno.env.get('MASTER_ADMIN_PASSWORD') ?? '',
  sessionSecret: Deno.env.get('MASTER_SESSION_SECRET') ?? '',
});

export const assertMasterSecretsConfigured = () => {
  const secrets = readMasterSecrets();
  if (!secrets.identifiant || !secrets.motDePasse || !secrets.sessionSecret) {
    throw new Error('Secrets MASTER non configures sur Supabase.');
  }
  return secrets;
};
