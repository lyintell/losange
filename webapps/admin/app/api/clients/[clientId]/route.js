import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { canModifyChantiers } from '@/lib/chantiers/access';
import { fetchClientById, softDeleteClient, updateClient } from '@/lib/chantiers/queries';

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json().catch(() => null);

    const client = await fetchClientById(clientId, {
      entrepriseId: session.entrepriseId || null,
    });

    if (!client) {
      return NextResponse.json({ ok: false, error: 'Client introuvable.' }, { status: 404 });
    }

    const updated = await updateClient(
      clientId,
      {
        nom_complet: body?.nom_complet,
        telephone_1: body?.telephone_1,
        telephone_2: body?.telephone_2,
      },
      { entrepriseId: session.entrepriseId || null }
    );

    return NextResponse.json({ ok: true, client: updated });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour client.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!canModifyChantiers(session.role)) {
      return NextResponse.json({ ok: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { clientId } = await params;
    await softDeleteClient(clientId, { entrepriseId: session.entrepriseId || null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur suppression client.' },
      { status: 500 }
    );
  }
}
