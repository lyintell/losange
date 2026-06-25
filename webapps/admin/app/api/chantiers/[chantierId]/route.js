import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchChantierDetail, updateChantierInfo } from '@/lib/chantiers/queries';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { chantierId } = await params;
    const body = await request.json().catch(() => null);

    const chantier = await fetchChantierDetail(chantierId, {
      entrepriseId: session.entrepriseId || null,
      role: session.role,
      profilId: session.profilId,
    });

    if (!chantier) {
      return NextResponse.json({ ok: false, error: 'Chantier introuvable.' }, { status: 404 });
    }

    const updated = await updateChantierInfo(chantierId, {
      entrepriseId: session.entrepriseId || null,
      clientId: body?.clientId || null,
      clientNom: body?.clientNom,
      clientTelephone: body?.clientTelephone,
      nom: body?.nom,
      adresse: body?.adresse,
      notes: body?.notes,
    });

    return NextResponse.json({ ok: true, chantier: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour chantier.' },
      { status: 500 }
    );
  }
}
