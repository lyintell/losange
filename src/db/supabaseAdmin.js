import { assertSupabaseConfigured, supabase } from './supabaseClient';
import { getMasterSessionToken } from '../auth/masterAdminAuth';

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

const invokeMasterCrud = async (body) => {
  assertSupabaseConfigured();
  const token = getMasterSessionToken();
  if (!token) {
    throw new Error('Session master invalide. Reconnectez-vous.');
  }

  const { data, error } = await supabase.functions.invoke('master-admin-crud', {
    body: { ...body, token },
  });

  if (error) {
    throw new Error(error.message || 'Erreur Edge Function master-admin-crud.');
  }

  if (!data?.ok) {
    throw new Error(data?.error || 'Operation admin refusee.');
  }

  return data;
};

export const fetchAllAdminRecords = async () => {
  const data = await invokeMasterCrud({ action: 'fetchAll' });
  return data.records || buildEmptyRecords();
};

export const insertAdminRecord = async (tableKey, record) => {
  const data = await invokeMasterCrud({
    action: 'insert',
    tableKey,
    record,
  });
  return data.record;
};

export const updateAdminRecord = async (tableKey, recordId, record) => {
  const data = await invokeMasterCrud({
    action: 'update',
    tableKey,
    recordId,
    record,
  });
  return { record: data.record, tierChange: data.tierChange ?? null };
};

export const deleteAdminRecord = async (tableKey, recordId) => {
  await invokeMasterCrud({
    action: 'delete',
    tableKey,
    recordId,
  });
};
