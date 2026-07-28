'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import EntrepriseLogoImage from '@/components/layout/EntrepriseLogoImage';
import AdminIcon from '@/components/ui/AdminIcon';
import { formatDisplayDate } from '@/lib/chantiers/format';

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <p className="info-row-label">{label}</p>
      <p className="info-row-value">{value || '—'}</p>
    </div>
  );
}

function AccountBadge({ isPro }) {
  return (
    <span className={`account-badge ${isPro ? 'account-badge--pro' : 'account-badge--free'}`}>
      {isPro ? 'PRO' : 'Gratuit'}
    </span>
  );
}

export default function ProfilClient({ profil, entreprise = null, canEdit = false }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [prenom, setPrenom] = useState(profil?.prenom || '');
  const [nom, setNom] = useState(profil?.nom || '');
  const [telephone2, setTelephone2] = useState(profil?.telephone_2 || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!profil) {
    return <p className="empty-state">Profil introuvable.</p>;
  }

  const isPro = Boolean(entreprise?.is_pro);
  const fullName = [profil.prenom, profil.nom].filter(Boolean).join(' ') || '—';

  const startEdit = () => {
    setPrenom(profil.prenom || '');
    setNom(profil.nom || '');
    setTelephone2(profil.telephone_2 || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom,
          nom,
          telephone_2: telephone2,
          mot_de_passe_actuel: currentPassword,
          nouveau_mot_de_passe: newPassword,
          confirm_mot_de_passe: confirmPassword,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Enregistrement impossible.');
      }
      setEditing(false);
      setSuccess('Profil mis à jour.');
      router.refresh();
    } catch (saveError) {
      setError(saveError.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h2 className="settings-card-title">Mon profil</h2>
            <p className="settings-card-subtitle">{fullName}</p>
          </div>
          {entreprise ? <AccountBadge isPro={isPro} /> : null}
        </header>

        {!editing ? (
          <div className="settings-card-body">
            {entreprise?.logo ? (
              <div className="settings-logo-wrap">
                <EntrepriseLogoImage
                  storageKey={entreprise.logo}
                  alt={entreprise.nom || 'Logo entreprise'}
                  size={72}
                />
              </div>
            ) : null}

            <InfoRow label="Rôle" value={profil.role_label} />
            <InfoRow label="Prénom" value={profil.prenom} />
            <InfoRow label="Nom" value={profil.nom} />
            <InfoRow label="Identifiant" value={profil.identifiant} />
            <InfoRow label="Téléphone 1" value={profil.telephone_1} />
            <InfoRow label="Téléphone 2" value={profil.telephone_2} />
            <InfoRow
              label="Premier login"
              value={
                profil.date_premier_login ? formatDisplayDate(profil.date_premier_login) : '—'
              }
            />
            {entreprise ? (
              <>
                <InfoRow label="Entreprise" value={entreprise.nom} />
                <InfoRow label="Compte" value={entreprise.account_plan_label} />
              </>
            ) : null}

            {success ? <p className="settings-success">{success}</p> : null}

            {canEdit ? (
              <div className="settings-actions">
                <button
                  type="button"
                  className="secondary-button icon-text-button"
                  onClick={startEdit}
                >
                  <AdminIcon name="pencil" size={18} />
                  <span>Modifier</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <form className="settings-card-body" onSubmit={handleSave}>
            <p className="settings-hint">
              Vous pouvez modifier le prénom, le nom, le téléphone 2 et le mot de passe. Le
              téléphone 1, le rôle et l&apos;identifiant sont verrouillés.
            </p>

            <InfoRow label="Rôle" value={profil.role_label} />
            <InfoRow label="Identifiant" value={profil.identifiant} />
            <InfoRow label="Téléphone 1" value={profil.telephone_1} />

            <label className="field-label" htmlFor="profil-prenom">
              Prénom
            </label>
            <input
              id="profil-prenom"
              type="text"
              className="field-input"
              value={prenom}
              onChange={(event) => setPrenom(event.target.value)}
              disabled={saving}
              required
            />

            <label className="field-label" htmlFor="profil-nom">
              Nom
            </label>
            <input
              id="profil-nom"
              type="text"
              className="field-input"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              disabled={saving}
              required
            />

            <label className="field-label" htmlFor="profil-tel2">
              Téléphone 2
            </label>
            <input
              id="profil-tel2"
              type="text"
              className="field-input"
              value={telephone2}
              onChange={(event) => setTelephone2(event.target.value)}
              disabled={saving}
            />

            <p className="settings-section-label">Changer le mot de passe (optionnel)</p>

            <label className="field-label" htmlFor="profil-pwd-current">
              Mot de passe actuel
            </label>
            <input
              id="profil-pwd-current"
              type="password"
              className="field-input"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={saving}
              autoComplete="current-password"
            />

            <label className="field-label" htmlFor="profil-pwd-new">
              Nouveau mot de passe
            </label>
            <input
              id="profil-pwd-new"
              type="password"
              className="field-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={saving}
              autoComplete="new-password"
            />

            <label className="field-label" htmlFor="profil-pwd-confirm">
              Confirmer
            </label>
            <input
              id="profil-pwd-confirm"
              type="password"
              className="field-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={saving}
              autoComplete="new-password"
            />

            {error ? <p className="field-error">{error}</p> : null}

            <div className="settings-actions">
              <button
                type="button"
                className="secondary-button icon-text-button"
                onClick={cancelEdit}
                disabled={saving}
              >
                <AdminIcon name="close" size={18} />
                <span>Annuler</span>
              </button>
              <button type="submit" className="primary-button icon-text-button" disabled={saving}>
                <AdminIcon name="content-save" size={18} />
                <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
