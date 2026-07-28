import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createSection, fetchSectionsByEntreprise } from '@/lib/sections/queries';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
    }
    if (!session.entrepriseId) {
      return NextResponse.json({ ok: false, error: 'Entreprise requise.' }, { status: 400 });
    }

    const sections = await fetchSectionsByEntreprise(session.entrepriseId);
    return NextResponse.json({ ok: true, sections });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur chargement sections.' },
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
    if (!session.entrepriseId) {
      return NextResponse.json({ ok: false, error: 'Entreprise requise.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const section = await createSection(session.entrepriseId, body?.nom);
    return NextResponse.json({ ok: true, section });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Erreur création section.' },
      { status: 500 }
    );
  }
}
