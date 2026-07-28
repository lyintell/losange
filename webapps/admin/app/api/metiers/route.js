import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchMetiersCatalogueList } from '@/lib/metiers/queries';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const metiers = await fetchMetiersCatalogueList({
      entrepriseId: session.entrepriseId || null,
    });

    return NextResponse.json({ ok: true, metiers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur chargement métiers.' },
      { status: 500 }
    );
  }
}
