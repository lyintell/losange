import { NextResponse } from 'next/server';
import { getSession, setSession } from '@/lib/auth/session';
import { changePasswordViaEdge, updateProfilLimited } from '@/lib/profil/queries';

export async function PATCH(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (session.isMaster || !session.profilId) {
      return NextResponse.json(
        { ok: false, error: 'Profil Master non modifiable ici.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const profil = await updateProfilLimited(session.profilId, {
      prenom: body?.prenom,
      nom: body?.nom,
      telephone_2: body?.telephone_2,
    });

    const wantsPassword =
      Boolean(body?.mot_de_passe_actuel?.trim()) ||
      Boolean(body?.nouveau_mot_de_passe?.trim()) ||
      Boolean(body?.confirm_mot_de_passe?.trim());

    if (wantsPassword) {
      const current = String(body?.mot_de_passe_actuel || '');
      const next = String(body?.nouveau_mot_de_passe || '');
      const confirm = String(body?.confirm_mot_de_passe || '');

      if (!current.trim()) {
        return NextResponse.json(
          { ok: false, error: 'Indiquez votre mot de passe actuel.' },
          { status: 400 }
        );
      }
      if (!next.trim()) {
        return NextResponse.json(
          { ok: false, error: 'Indiquez le nouveau mot de passe.' },
          { status: 400 }
        );
      }
      if (next !== confirm) {
        return NextResponse.json(
          { ok: false, error: 'La confirmation ne correspond pas.' },
          { status: 400 }
        );
      }

      await changePasswordViaEdge({
        identifiant: session.identifiant,
        motDePasseActuel: current,
        nouveauMotDePasse: next,
      });
    }

    await setSession({
      ...session,
      prenom: profil.prenom,
      nom: profil.nom,
    });

    return NextResponse.json({ ok: true, profil });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur mise à jour profil.' },
      { status: 500 }
    );
  }
}
