import { NextResponse } from 'next/server';
import { loginAdminWeb } from '@/lib/auth/login';
import { setSession } from '@/lib/auth/session';
import { IDENTIFIANT_PATTERN } from '@/lib/auth/constants';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Supabase non configuré. Définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  const identifiant = String(body?.identifiant || '')
    .trim()
    .toUpperCase();
  const motDePasse = String(body?.motDePasse || '');

  if (!IDENTIFIANT_PATTERN.test(identifiant) || !motDePasse.trim()) {
    return NextResponse.json(
      { ok: false, error: 'Identifiant ou mot de passe incorrect.' },
      { status: 401 }
    );
  }

  const result = await loginAdminWeb(identifiant, motDePasse);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  await setSession(result.session);

  return NextResponse.json({ ok: true });
}
