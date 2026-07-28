import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { fetchChantierDetail, syncReleveLignes } from '@/lib/chantiers/queries';
import { canEditReleveRemise } from '@/lib/chantiers/remise';

export async function PATCH(request, { params }) {
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

    const body = await request.json();
    const lignes = Array.isArray(body?.lignes) ? body.lignes : [];

    const options = {
      markChanged: true,
      changedByIdentifiant: session.identifiant || null,
    };
    const allowRemiseEdit = canEditReleveRemise(session.role);
    if (allowRemiseEdit) {
      if (body?.remise != null) {
        options.remise = Number(body.remise) || 0;
      }
      if (body?.ind_tva != null) {
        options.ind_tva = Number(body.ind_tva) === 1 ? 1 : 0;
      }
    }

    await syncReleveLignes(releveId, lignes, options);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour devis.' },
      { status: 500 }
    );
  }
}
