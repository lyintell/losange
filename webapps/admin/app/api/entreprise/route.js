import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fetchEntrepriseConfig, updateEntrepriseLimited } from '@/lib/profil/queries';

export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (session.role !== 'A') {
      return NextResponse.json(
        { ok: false, error: 'Seul un administrateur peut modifier la configuration.' },
        { status: 403 }
      );
    }
    if (!session.entrepriseId) {
      return NextResponse.json({ ok: false, error: 'Entreprise requise.' }, { status: 400 });
    }

    const current = await fetchEntrepriseConfig(session.entrepriseId);
    if (!current) {
      return NextResponse.json({ ok: false, error: 'Entreprise introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const entreprise = await updateEntrepriseLimited(
      session.entrepriseId,
      {
        nom: body?.nom,
        telephone_1: body?.telephone_1,
        telephone_2: body?.telephone_2,
        adresse: body?.adresse,
        entete_1: body?.entete_1,
        entete_2: body?.entete_2,
        ind_tva: body?.ind_tva,
      },
      { allowTva: Boolean(current.is_pro) }
    );

    return NextResponse.json({ ok: true, entreprise });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour entreprise.' },
      { status: 500 }
    );
  }
}
