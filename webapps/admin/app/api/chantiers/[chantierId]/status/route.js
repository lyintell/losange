import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { CHANTIER_STATUS_OPTIONS } from '@/lib/chantiers/status';
import { fetchChantierDetail, updateChantierStatus } from '@/lib/chantiers/queries';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { chantierId } = await params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (!CHANTIER_STATUS_OPTIONS.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Statut invalide.' }, { status: 400 });
    }

    const chantier = await fetchChantierDetail(chantierId, {
      entrepriseId: session.entrepriseId || null,
      role: session.role,
      profilId: session.profilId,
    });

    if (!chantier) {
      return NextResponse.json({ ok: false, error: 'Chantier introuvable.' }, { status: 404 });
    }

    const nextStatus = await updateChantierStatus(chantierId, status);
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour statut.' },
      { status: 500 }
    );
  }
}
