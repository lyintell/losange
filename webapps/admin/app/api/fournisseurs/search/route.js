import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { searchFournisseurs } from '@/lib/articles/queries';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metierId = searchParams.get('metierId');
    const query = searchParams.get('q') || '';

    if (!metierId) {
      return NextResponse.json({ ok: false, error: 'Métier requis.' }, { status: 400 });
    }

    const fournisseurs = await searchFournisseurs({
      metierId,
      entrepriseId: session.entrepriseId || null,
      query,
    });

    return NextResponse.json({ ok: true, fournisseurs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur recherche fournisseurs.' },
      { status: 500 }
    );
  }
}
