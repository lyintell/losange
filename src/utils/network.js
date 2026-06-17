import { isSupabaseConfigured } from '../db/supabaseClient';

const REACHABILITY_TIMEOUT_MS = 5000;

export const hasInternetConnection = async () => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REACHABILITY_TIMEOUT_MS);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: anonKey },
      signal: controller.signal,
    });
    return response.ok || response.status === 401 || response.status === 404;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};
