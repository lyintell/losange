import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { searchClients } from '@/lib/chantiers/queries';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q') || '';
    const clients = await searchClients(session.entrepriseId || null, query);
    return NextResponse.json({ ok: true, clients });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur recherche clients.' },
      { status: 500 }
    );
  }
}
