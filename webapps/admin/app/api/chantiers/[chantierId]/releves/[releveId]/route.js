import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { fetchChantierDetail, softDeleteReleve } from '@/lib/chantiers/queries';

export async function DELETE(_request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!canModifyChantiers(session.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { chantierId, releveId } = await params;
    const chantier = await fetchChantierDetail(chantierId, {
      entrepriseId: session.entrepriseId || null,
      role: session.role,
      profilId: session.profilId,
    });

    if (!chantier) {
      return NextResponse.json({ ok: false, error: 'Chantier introuvable.' }, { status: 404 });
    }

    const releve = (chantier.releves || []).find((row) => row.id === releveId);
    if (!releve) {
      return NextResponse.json({ ok: false, error: 'Devis introuvable.' }, { status: 404 });
    }

    await softDeleteReleve(releveId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur suppression devis.' },
      { status: 500 }
    );
  }
}
