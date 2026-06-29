import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchOuvrageById, updateOuvrage } from '@/lib/ouvrages/queries';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { ouvrageId } = await params;
    const body = await request.json().catch(() => null);

    const ouvrage = await fetchOuvrageById(ouvrageId, {
      entrepriseId: session.entrepriseId || null,
    });

    if (!ouvrage) {
      return NextResponse.json({ ok: false, error: 'Ouvrage introuvable.' }, { status: 404 });
    }

    const updated = await updateOuvrage(
      ouvrageId,
      {
        nom: body?.nom,
        nomDevis: body?.nomDevis,
        unites: body?.unites,
      },
      { entrepriseId: session.entrepriseId || null }
    );

    return NextResponse.json({ ok: true, ouvrage: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour ouvrage.' },
      { status: 500 }
    );
  }
}
