import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseAnonKey);

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase non configuré. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
