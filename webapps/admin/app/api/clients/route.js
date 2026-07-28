import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { createClient } from '@/lib/chantiers/queries';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!canModifyChantiers(session.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }
    if (!session.entrepriseId) {
      return NextResponse.json({ ok: false, error: 'Entreprise requise.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const client = await createClient(
      {
        nom_complet: body?.nom_complet,
        telephone_1: body?.telephone_1,
        telephone_2: body?.telephone_2,
      },
      { entrepriseId: session.entrepriseId }
    );

    return NextResponse.json({ ok: true, client });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur création client.' },
      { status: 500 }
    );
  }
}
