import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { createReleveWithLignes, fetchChantierDetail } from '@/lib/chantiers/queries';
import { canEditReleveRemise } from '@/lib/chantiers/remise';

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!canModifyChantiers(session.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { chantierId } = await params;
    const chantier = await fetchChantierDetail(chantierId, {
      entrepriseId: session.entrepriseId || null,
      role: session.role,
      profilId: session.profilId,
    });

    if (!chantier) {
      return NextResponse.json({ ok: false, error: 'Chantier introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const lignes = Array.isArray(body?.lignes) ? body.lignes : [];

    const options = {
      priseParId: session.profilId || null,
      lignes,
      remise: 0,
      indTva: 0,
    };

    if (canEditReleveRemise(session.role)) {
      if (body?.remise != null) options.remise = Number(body.remise) || 0;
      if (body?.ind_tva != null) options.indTva = Number(body.ind_tva) === 1 ? 1 : 0;
    }

    const releve = await createReleveWithLignes(chantierId, options);
    return NextResponse.json({ ok: true, releve });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur création devis.' },
      { status: 500 }
    );
  }
}
