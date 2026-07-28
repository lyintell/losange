'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import EntrepriseLogoImage from '@/components/layout/EntrepriseLogoImage';
import TvaToggle from '@/components/chantiers/TvaToggle';
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

function StatusPill({ label, tone }) {
  return <span className={`account-status-pill account-status-pill--${tone}`}>{label}</span>;
}

export default function ConfigurationClient({ entreprise, canEdit = false }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(entreprise?.nom || '');
  const [telephone1, setTelephone1] = useState(entreprise?.telephone_1 || '');
  const [telephone2, setTelephone2] = useState(entreprise?.telephone_2 || '');
  const [adresse, setAdresse] = useState(entreprise?.adresse || '');
  const [entete1, setEntete1] = useState(entreprise?.entete_1 || '');
  const [entete2, setEntete2] = useState(entreprise?.entete_2 || '');
  const [indTva, setIndTva] = useState(Number(entreprise?.ind_tva) === 1 ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!entreprise) {
    return <p className="empty-state">Informations entreprise introuvables.</p>;
  }

  const startEdit = () => {
    setNom(entreprise.nom || '');
    setTelephone1(entreprise.telephone_1 || '');
    setTelephone2(entreprise.telephone_2 || '');
    setAdresse(entreprise.adresse || '');
    setEntete1(entreprise.entete_1 || '');
    setEntete2(entreprise.entete_2 || '');
    setIndTva(Number(entreprise.ind_tva) === 1 ? 1 : 0);
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/entreprise', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          telephone_1: telephone1,
          telephone_2: telephone2,
          adresse,
          entete_1: entete1,
          entete_2: entete2,
          ind_tva: indTva,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Enregistrement impossible.');
      }
      setEditing(false);
      setSuccess('Configuration mise à jour.');
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
            <h2 className="settings-card-title">Statut du compte</h2>
            <p className="settings-card-subtitle">Lecture seule — géré par Losange</p>
          </div>
          <div className="account-status-pills">
            <StatusPill
              label={entreprise.account_plan_label}
              tone={entreprise.is_pro ? 'pro' : 'free'}
            />
            <StatusPill
              label={entreprise.account_active_label}
              tone={entreprise.is_active ? 'active' : 'inactive'}
            />
          </div>
        </header>

        <div className="settings-card-body">
          <InfoRow label="Plan" value={entreprise.account_plan_label} />
          <InfoRow label="Statut" value={entreprise.account_active_label} />
          <InfoRow label="Actif jusqu’au" value={entreprise.date_actif_jusqua_label} />
          <InfoRow
            label="Activation PRO"
            value={
              entreprise.pro_activated_le ? formatDisplayDate(entreprise.pro_activated_le) : '—'
            }
          />
          <InfoRow
            label="Passage Gratuit"
            value={
              entreprise.pro_downgraded_le ? formatDisplayDate(entreprise.pro_downgraded_le) : '—'
            }
          />
        </div>
      </section>

      <section className="settings-card">
        <header className="settings-card-header">
          <div>
            <h2 className="settings-card-title">Entreprise</h2>
            <p className="settings-card-subtitle">Informations affichées sur les devis</p>
          </div>
        </header>

        {!editing ? (
          <div className="settings-card-body">
            {entreprise.logo ? (
              <div className="settings-logo-wrap">
                <EntrepriseLogoImage
                  storageKey={entreprise.logo}
                  alt={entreprise.nom || 'Logo entreprise'}
                  size={88}
                />
              </div>
            ) : null}

            <InfoRow label="Nom" value={entreprise.nom} />
            <InfoRow label="Téléphone 1" value={entreprise.telephone_1} />
            <InfoRow label="Téléphone 2" value={entreprise.telephone_2} />
            <InfoRow label="Adresse" value={entreprise.adresse} />
            <InfoRow label="En-tête 1 du devis" value={entreprise.entete_1} />
            <InfoRow label="En-tête 2 du devis" value={entreprise.entete_2} />
            <InfoRow label="Appliquer TVA" value={entreprise.ind_tva_label} />
            <InfoRow
              label="Créée le"
              value={entreprise.cree_le ? formatDisplayDate(entreprise.cree_le) : '—'}
            />

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
            ) : (
              <p className="settings-hint">Seul un administrateur peut modifier ces informations.</p>
            )}
          </div>
        ) : (
          <form className="settings-card-body" onSubmit={handleSave}>
            <p className="settings-hint">
              Modifications limitées : coordonnées et en-têtes devis. Le plan PRO / statut compte
              n’est pas modifiable.
            </p>

            {entreprise.logo ? (
              <div className="settings-logo-wrap">
                <EntrepriseLogoImage
                  storageKey={entreprise.logo}
                  alt={entreprise.nom || 'Logo entreprise'}
                  size={72}
                />
              </div>
            ) : null}

            <label className="field-label" htmlFor="entreprise-nom">
              Nom
            </label>
            <input
              id="entreprise-nom"
              type="text"
              className="field-input"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              disabled={saving}
              required
            />

            <label className="field-label" htmlFor="entreprise-tel1">
              Téléphone 1
            </label>
            <input
              id="entreprise-tel1"
              type="text"
              className="field-input"
              value={telephone1}
              onChange={(event) => setTelephone1(event.target.value)}
              disabled={saving}
            />

            <label className="field-label" htmlFor="entreprise-tel2">
              Téléphone 2
            </label>
            <input
              id="entreprise-tel2"
              type="text"
              className="field-input"
              value={telephone2}
              onChange={(event) => setTelephone2(event.target.value)}
              disabled={saving}
            />

            <label className="field-label" htmlFor="entreprise-adresse">
              Adresse
            </label>
            <textarea
              id="entreprise-adresse"
              className="field-input"
              rows={3}
              value={adresse}
              onChange={(event) => setAdresse(event.target.value)}
              disabled={saving}
            />

            <label className="field-label" htmlFor="entreprise-entete1">
              En-tête 1 du devis
            </label>
            <input
              id="entreprise-entete1"
              type="text"
              className="field-input"
              value={entete1}
              onChange={(event) => setEntete1(event.target.value)}
              disabled={saving}
            />

            <label className="field-label" htmlFor="entreprise-entete2">
              En-tête 2 du devis
            </label>
            <input
              id="entreprise-entete2"
              type="text"
              className="field-input"
              value={entete2}
              onChange={(event) => setEntete2(event.target.value)}
              disabled={saving}
            />

            {entreprise.is_pro ? (
              <>
                <p className="field-label">Appliquer TVA</p>
                <TvaToggle value={indTva} onChange={setIndTva} disabled={saving} />
              </>
            ) : (
              <InfoRow label="Appliquer TVA" value="Non (compte Gratuit)" />
            )}

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
