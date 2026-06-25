import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchCatalogueUnites } from '@/lib/ouvrages/queries';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const unites = await fetchCatalogueUnites();
    return NextResponse.json({ ok: true, unites });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur chargement unités.' },
      { status: 500 }
    );
  }
}
