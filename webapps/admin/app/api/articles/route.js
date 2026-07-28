import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createArticle, fetchArticlesByMetierId } from '@/lib/articles/queries';
import { fetchMetierById } from '@/lib/metiers/queries';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metierId = searchParams.get('metierId');
    if (!metierId) {
      return NextResponse.json({ ok: false, error: 'metierId requis.' }, { status: 400 });
    }

    const articles = await fetchArticlesByMetierId(metierId, {
      entrepriseId: session.entrepriseId || null,
    });

    return NextResponse.json({ ok: true, articles });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur chargement articles.' },
      { status: 500 }
    );
  }
}

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
