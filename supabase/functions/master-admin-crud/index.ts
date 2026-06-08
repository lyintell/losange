import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  applyFreeTierDowngrade,
  applyProUpgradeFields,
  detectEntrepriseTierChange,
} from './entrepriseTier.ts';

const encoder = new TextEncoder();

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
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);

const verifySessionToken = async (secret: string, token: string) => {
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

const assertMasterSessionSecretConfigured = () => {
  const sessionSecret = Deno.env.get('MASTER_SESSION_SECRET') ?? '';
  if (!sessionSecret) {
    throw new Error('Secrets MASTER non configures sur Supabase.');
  }
  return { sessionSecret };
};

const ADMIN_TABLE_KEYS = [
  'entreprises',
  'profils',
  'clients',
  'chantiers',
  'metiers',
  'ouvrages',
  'unites',
  'ouvrage_unites',
  'releves',
  'ligne_releves',
] as const;

const SOFT_DELETE_TABLES = new Set([
  'clients',
  'chantiers',
  'releves',
  'ligne_releves',
  'ouvrages',
  'ouvrage_unites',
]);

const assertTableKey = (tableKey: string) => {
  if (!ADMIN_TABLE_KEYS.includes(tableKey as (typeof ADMIN_TABLE_KEYS)[number])) {
    throw new Error(`Table non autorisee: ${tableKey}`);
  }
};

const TIER_MARKER_FIELDS = ['pro_activated_le', 'pro_downgraded_le'] as const;

const normalizeRecordPayload = (record: Record<string, unknown>) => {
  const payload = { ...record };
  if (Object.prototype.hasOwnProperty.call(payload, '_synced')) {
    payload._synced = 1;
  }
  return payload;
};

const stripTierMarkersFromRecord = (record: Record<string, unknown>) => {
  TIER_MARKER_FIELDS.forEach((fieldName) => {
    delete record[fieldName];
  });
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

    const secrets = assertMasterSessionSecretConfigured();
    const body = await req.json();
    const token = String(body?.token ?? '');
    const action = String(body?.action ?? '');

    if (!token || !(await verifySessionToken(secrets.sessionSecret, token))) {
      return jsonResponse({ ok: false, error: 'Session master invalide ou expiree.' }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'fetchAll') {
      const records: Record<string, unknown[]> = {};
      for (const tableKey of ADMIN_TABLE_KEYS) {
        let query = supabase.from(tableKey).select('*').order('cree_le', { ascending: false });
        if (SOFT_DELETE_TABLES.has(tableKey)) {
          query = query.is('supprime_le', null);
        }
        const { data, error } = await query;
        if (error) {
          return jsonResponse({ ok: false, error: `${tableKey}: ${error.message}` }, 500);
        }
        records[tableKey] = data ?? [];
      }
      return jsonResponse({ ok: true, records });
    }

    const tableKey = String(body?.tableKey ?? '');
    assertTableKey(tableKey);

    if (action === 'insert') {
      const record = normalizeRecordPayload((body?.record ?? {}) as Record<string, unknown>);
      const { data, error } = await supabase.from(tableKey).insert(record).select('*').single();
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur insertion.' }, 500);
      }
      return jsonResponse({ ok: true, record: data });
    }

    const recordId = String(body?.recordId ?? '');
    if (!recordId) {
      return jsonResponse({ ok: false, error: 'Identifiant enregistrement requis.' }, 400);
    }

    if (action === 'update') {
      const record = normalizeRecordPayload((body?.record ?? {}) as Record<string, unknown>);
      let tierChangeSummary: Record<string, unknown> | null = null;

      if (tableKey === 'entreprises') {
        stripTierMarkersFromRecord(record);

        const { data: previousEntreprise, error: previousError } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', recordId)
          .maybeSingle();
        if (previousError) {
          return jsonResponse({ ok: false, error: previousError.message || 'Erreur lecture entreprise.' }, 500);
        }

        const tierChange = detectEntrepriseTierChange(previousEntreprise, Number(record.ind_pro));
        const now = new Date().toISOString();

        if (tierChange.kind === 'upgrade') {
          Object.assign(record, applyProUpgradeFields(now));
          tierChangeSummary = { tierChange: 'upgrade', pro_activated_le: now };
        } else if (tierChange.kind === 'downgrade') {
          record.ind_tva = 0;
          record.logo = null;
          record.pro_downgraded_le = now;
          record.mis_a_jour_le = now;
          record._synced = 1;
          tierChangeSummary = { tierChange: 'downgrade', pro_downgraded_le: now };
        }
      }

      const { data, error } = await supabase
        .from(tableKey)
        .update(record)
        .eq('id', recordId)
        .select('*')
        .single();
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur mise a jour.' }, 500);
      }

      if (tableKey === 'entreprises' && tierChangeSummary?.tierChange === 'downgrade') {
        try {
          await applyFreeTierDowngrade(supabase, recordId);
          const { data: refreshed, error: refreshError } = await supabase
            .from('entreprises')
            .select('*')
            .eq('id', recordId)
            .maybeSingle();
          if (refreshError) {
            return jsonResponse({ ok: false, error: refreshError.message || 'Erreur relecture entreprise.' }, 500);
          }
          return jsonResponse({ ok: true, record: refreshed ?? data, tierChange: tierChangeSummary });
        } catch (downgradeError) {
          const message = downgradeError instanceof Error ? downgradeError.message : 'Erreur downgrade.';
          return jsonResponse({ ok: false, error: message }, 500);
        }
      }

      return jsonResponse({ ok: true, record: data, tierChange: tierChangeSummary });
    }

    if (action === 'delete') {
      const now = new Date().toISOString();

      if (SOFT_DELETE_TABLES.has(tableKey)) {
        if (tableKey === 'clients') {
          const { data: chantiers, error: chantiersError } = await supabase
            .from('chantiers')
            .select('id')
            .eq('client_id', recordId);
          if (chantiersError) {
            return jsonResponse({ ok: false, error: chantiersError.message || 'Erreur suppression.' }, 500);
          }

          const chantierIds = (chantiers ?? []).map((row) => String(row.id));
          if (chantierIds.length > 0) {
            const { data: releves, error: relevesError } = await supabase
              .from('releves')
              .select('id')
              .in('chantier_id', chantierIds);
            if (relevesError) {
              return jsonResponse({ ok: false, error: relevesError.message || 'Erreur suppression.' }, 500);
            }

            const releveIds = (releves ?? []).map((row) => String(row.id));
            if (releveIds.length > 0) {
              const { error: ligneError } = await supabase
                .from('ligne_releves')
                .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
                .in('releve_id', releveIds);
              if (ligneError) {
                return jsonResponse({ ok: false, error: ligneError.message || 'Erreur suppression.' }, 500);
              }
            }

            const { error: releveError } = await supabase
              .from('releves')
              .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
              .in('chantier_id', chantierIds);
            if (releveError) {
              return jsonResponse({ ok: false, error: releveError.message || 'Erreur suppression.' }, 500);
            }

            const { error: chantierError } = await supabase
              .from('chantiers')
              .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
              .in('id', chantierIds);
            if (chantierError) {
              return jsonResponse({ ok: false, error: chantierError.message || 'Erreur suppression.' }, 500);
            }
          }
        }

        if (tableKey === 'chantiers') {
          const { data: releves, error: relevesError } = await supabase
            .from('releves')
            .select('id')
            .eq('chantier_id', recordId);
          if (relevesError) {
            return jsonResponse({ ok: false, error: relevesError.message || 'Erreur suppression.' }, 500);
          }

          const releveIds = (releves ?? []).map((row) => String(row.id));
          if (releveIds.length > 0) {
            const { error: ligneError } = await supabase
              .from('ligne_releves')
              .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
              .in('releve_id', releveIds);
            if (ligneError) {
              return jsonResponse({ ok: false, error: ligneError.message || 'Erreur suppression.' }, 500);
            }

            const { error: releveError } = await supabase
              .from('releves')
              .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
              .in('id', releveIds);
            if (releveError) {
              return jsonResponse({ ok: false, error: releveError.message || 'Erreur suppression.' }, 500);
            }
          }
        }

        if (tableKey === 'releves') {
          const { error: ligneError } = await supabase
            .from('ligne_releves')
            .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
            .eq('releve_id', recordId);
          if (ligneError) {
            return jsonResponse({ ok: false, error: ligneError.message || 'Erreur suppression.' }, 500);
          }
        }

        if (tableKey === 'ouvrages') {
          const { error: ouvrageUniteError } = await supabase
            .from('ouvrage_unites')
            .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
            .eq('ouvrage_id', recordId);
          if (ouvrageUniteError) {
            return jsonResponse({ ok: false, error: ouvrageUniteError.message || 'Erreur suppression.' }, 500);
          }
        }

        const { error } = await supabase
          .from(tableKey)
          .update({ supprime_le: now, mis_a_jour_le: now, _synced: 1 })
          .eq('id', recordId);
        if (error) {
          return jsonResponse({ ok: false, error: error.message || 'Erreur suppression.' }, 500);
        }
        return jsonResponse({ ok: true, softDeleted: true });
      }

      const { error } = await supabase.from(tableKey).delete().eq('id', recordId);
      if (error) {
        return jsonResponse({ ok: false, error: error.message || 'Erreur suppression.' }, 500);
      }
      return jsonResponse({ ok: true, softDeleted: false });
    }

    return jsonResponse({ ok: false, error: 'Action non autorisee.' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur.';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
