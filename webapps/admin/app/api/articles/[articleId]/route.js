import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchArticleById, updateArticle } from '@/lib/articles/queries';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { articleId } = await params;
    const body = await request.json().catch(() => null);

    const article = await fetchArticleById(articleId, {
      entrepriseId: session.entrepriseId || null,
    });

    if (!article) {
      return NextResponse.json({ ok: false, error: 'Article introuvable.' }, { status: 404 });
    }

    const updated = await updateArticle(
      articleId,
      {
        nom: body?.nom,
        nomDevis: body?.nomDevis,
        unites: body?.unites,
        fournisseurId: body?.fournisseurId,
        fournisseurNom: body?.fournisseurNom,
      },
      { entrepriseId: session.entrepriseId || null }
    );

    return NextResponse.json({ ok: true, article: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour article.' },
      { status: 500 }
    );
  }
}
