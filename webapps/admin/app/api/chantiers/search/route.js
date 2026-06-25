import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { searchChantiersByClient } from '@/lib/chantiers/queries';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId') || '';
    const query = request.nextUrl.searchParams.get('q') || '';

    if (!clientId) {
      return NextResponse.json({ ok: false, error: 'Client requis.' }, { status: 400 });
    }

    const chantiers = await searchChantiersByClient(clientId, query);
    return NextResponse.json({ ok: true, chantiers });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur recherche chantiers.' },
      { status: 500 }
    );
  }
}
