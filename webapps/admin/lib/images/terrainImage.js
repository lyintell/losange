import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export const TERRAIN_IMAGE_BUCKET = 'terrain-files';
export const APP_LOGO_PATH = '/logo.png';

export async function resolveEntrepriseLogoUrl(storageKey) {
  const key = String(storageKey || '').trim();
  if (!key) return null;

  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.storage
      .from(TERRAIN_IMAGE_BUCKET)
      .createSignedUrl(key, 3600);

    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
