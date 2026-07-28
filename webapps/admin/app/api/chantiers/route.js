import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { createChantier } from '@/lib/chantiers/queries';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!canModifyChantiers(session.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const chantier = await createChantier(
      {
        clientId: body?.clientId,
        nom: body?.nom,
        adresse: body?.adresse,
        notes: body?.notes,
      },
      { entrepriseId: session.entrepriseId || null }
    );

    return NextResponse.json({ ok: true, chantier });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur création chantier.' },
      { status: 500 }
    );
  }
}
