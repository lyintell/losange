import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/auth/constants';
import { formatDisplayDate } from '@/lib/chantiers/format';

export async function fetchProfilForSession(session) {
  if (!session?.profilId || session.isMaster) {
    return {
      id: session?.profilId || null,
      prenom: session?.prenom || 'Master',
      nom: session?.nom || '',
      identifiant: session?.identifiant || '',
      role: session?.role || 'M',
      role_label: ROLE_LABELS[session?.role] || session?.role || 'Master',
      telephone_1: '',
      telephone_2: '',
      date_premier_login: null,
      is_master: true,
    };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('profils')
    .select('id, prenom, nom, identifiant, role, telephone_1, telephone_2, date_premier_login, entreprise_id')
    .eq('id', session.profilId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement profil.');
  if (!data) {
    return {
      id: session.profilId,
      prenom: session.prenom || '',
      nom: session.nom || '',
      identifiant: session.identifiant || '',
      role: session.role || '',
      role_label: ROLE_LABELS[session.role] || session.role || '—',
      telephone_1: '',
      telephone_2: '',
      date_premier_login: null,
      is_master: false,
    };
  }

  const role = String(data.role || session.role || '').toUpperCase();
  return {
    id: data.id,
    prenom: data.prenom || '',
    nom: data.nom || '',
    identifiant: data.identifiant || session.identifiant || '',
    role,
    role_label: ROLE_LABELS[role] || role || '—',
    telephone_1: data.telephone_1 || '',
    telephone_2: data.telephone_2 || '',
    date_premier_login: data.date_premier_login || null,
    is_master: false,
  };
}

export async function fetchEntrepriseConfig(entrepriseId) {
  if (!entrepriseId) return null;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('entreprises')
    .select(
      `
      id,
      nom,
      telephone_1,
      telephone_2,
      adresse,
      logo,
      entete_1,
      entete_2,
      ind_pro,
      ind_tva,
      ind_active,
      date_actif_jusqua,
      pro_activated_le,
      pro_downgraded_le,
      cree_le
    `
    )
    .eq('id', entrepriseId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erreur chargement entreprise.');
  if (!data) return null;

  const isPro = Number(data.ind_pro) === 1;
  const isActive = Number(data.ind_active) === 1;

  return {
    ...data,
    is_pro: isPro,
    is_active: isActive,
    account_plan_label: isPro ? 'PRO' : 'Gratuit',
    account_active_label: isActive ? 'Actif' : 'Inactif',
    date_actif_jusqua_label: data.date_actif_jusqua
      ? formatDisplayDate(data.date_actif_jusqua)
      : '—',
    ind_tva_label: Number(data.ind_tva) === 1 ? 'Oui' : 'Non',
  };
}

export function buildAccountStatus(entreprise) {
  if (!entreprise) {
    return {
      plan: '—',
      planTone: 'muted',
      active: '—',
      activeTone: 'muted',
      until: '—',
      summary: 'Compte non disponible',
    };
  }

  return {
    plan: entreprise.account_plan_label,
    planTone: entreprise.is_pro ? 'pro' : 'free',
    active: entreprise.account_active_label,
    activeTone: entreprise.is_active ? 'active' : 'inactive',
    until: entreprise.date_actif_jusqua_label,
    summary: `${entreprise.account_plan_label} · ${entreprise.account_active_label}`,
  };
}

/** Modifications limitées : prénom, nom, téléphone 2. Téléphone 1 verrouillé. */
export async function updateProfilLimited(profilId, { prenom, nom, telephone_2 }) {
  if (!profilId) throw new Error('Profil requis.');

  const trimmedPrenom = String(prenom || '').trim();
  const trimmedNom = String(nom || '').trim();
  if (!trimmedPrenom) throw new Error('Le prénom est requis.');
  if (!trimmedNom) throw new Error('Le nom est requis.');

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profils')
    .update({
      prenom: trimmedPrenom,
      nom: trimmedNom,
      telephone_2: String(telephone_2 || '').trim() || null,
      mis_a_jour_le: now,
      _synced: 0,
    })
    .eq('id', profilId)
    .select('id, prenom, nom, identifiant, role, telephone_1, telephone_2, date_premier_login')
    .single();

  if (error) throw new Error(error.message || 'Erreur mise à jour profil.');

  const role = String(data.role || '').toUpperCase();
  return {
    id: data.id,
    prenom: data.prenom || '',
    nom: data.nom || '',
    identifiant: data.identifiant || '',
    role,
    role_label: ROLE_LABELS[role] || role || '—',
    telephone_1: data.telephone_1 || '',
    telephone_2: data.telephone_2 || '',
    date_premier_login: data.date_premier_login || null,
    is_master: false,
  };
}

/**
 * Modifications limitées entreprise (admin A) :
 * nom, téléphones, adresse, entêtes, TVA (si PRO).
 * Pas de modification du plan / statut compte.
 */
export async function updateEntrepriseLimited(
  entrepriseId,
  { nom, telephone_1, telephone_2, adresse, entete_1, entete_2, ind_tva },
  { allowTva = false } = {}
) {
  if (!entrepriseId) throw new Error('Entreprise requise.');

  const trimmedNom = String(nom || '').trim();
  if (!trimmedNom) throw new Error("Le nom de l'entreprise est requis.");

  const payload = {
    nom: trimmedNom,
    telephone_1: String(telephone_1 || '').trim() || null,
    telephone_2: String(telephone_2 || '').trim() || null,
    adresse: String(adresse || '').trim() || null,
    entete_1: String(entete_1 || '').trim() || null,
    entete_2: String(entete_2 || '').trim() || null,
    mis_a_jour_le: new Date().toISOString(),
    _synced: 0,
  };

  if (allowTva) {
    payload.ind_tva = Number(ind_tva) === 1 ? 1 : 0;
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('entreprises').update(payload).eq('id', entrepriseId);
  if (error) throw new Error(error.message || 'Erreur mise à jour entreprise.');

  return fetchEntrepriseConfig(entrepriseId);
}

export async function changePasswordViaEdge({ identifiant, motDePasseActuel, nouveauMotDePasse }) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.functions.invoke('terrain-change-password', {
    body: { identifiant, motDePasseActuel, nouveauMotDePasse },
  });

  if (error) {
    throw new Error(error.message || 'Impossible de changer le mot de passe.');
  }
  if (!data?.ok) {
    throw new Error(data?.error || 'Impossible de changer le mot de passe.');
  }
  return true;
}
