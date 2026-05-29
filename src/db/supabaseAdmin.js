import { assertSupabaseConfigured, supabase } from './supabaseClient';

export const ADMIN_TABLE_KEYS = [
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
];

const buildEmptyRecords = () => {
  const records = {};
  ADMIN_TABLE_KEYS.forEach((tableKey) => {
    records[tableKey] = [];
  });
  return records;
};

const getSupabaseErrorMessage = (error) => error?.message || 'Erreur Supabase inconnue.';

export const fetchAllAdminRecords = async () => {
  assertSupabaseConfigured();
  const records = buildEmptyRecords();

  const results = await Promise.all(
    ADMIN_TABLE_KEYS.map(async (tableKey) => {
      const { data, error } = await supabase.from(tableKey).select('*').order('cree_le', { ascending: false });
      if (error) throw new Error(`${tableKey}: ${getSupabaseErrorMessage(error)}`);
      return { tableKey, data: data || [] };
    })
  );

  results.forEach(({ tableKey, data }) => {
    records[tableKey] = data;
  });

  return records;
};

export const insertAdminRecord = async (tableKey, record) => {
  assertSupabaseConfigured();
  const payload = { ...record };
  if (Object.prototype.hasOwnProperty.call(payload, '_synced')) {
    payload._synced = 1;
  }

  const { data, error } = await supabase.from(tableKey).insert(payload).select('*').single();
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const updateAdminRecord = async (tableKey, recordId, record) => {
  assertSupabaseConfigured();
  const payload = { ...record };
  if (Object.prototype.hasOwnProperty.call(payload, '_synced')) {
    payload._synced = 1;
  }

  const { data, error } = await supabase.from(tableKey).update(payload).eq('id', recordId).select('*').single();
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const deleteAdminRecord = async (tableKey, recordId) => {
  assertSupabaseConfigured();
  const { error } = await supabase.from(tableKey).delete().eq('id', recordId);
  if (error) throw new Error(getSupabaseErrorMessage(error));
};
