import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createArticle } from '@/lib/articles/queries';
import { fetchMetierById } from '@/lib/metiers/queries';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const metierId = body?.metierId;
    const entrepriseId = session.entrepriseId || null;

    const metier = await fetchMetierById(metierId, { entrepriseId });
    if (!metier) {
      return NextResponse.json({ ok: false, error: 'Métier introuvable.' }, { status: 404 });
    }

    const article = await createArticle(
      {
        metierId,
        nom: body?.nom,
        nomDevis: body?.nomDevis,
        unites: body?.unites,
        fournisseurId: body?.fournisseurId,
        fournisseurNom: body?.fournisseurNom,
      },
      { entrepriseId }
    );

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur création article.' },
      { status: 500 }
    );
  }
}
