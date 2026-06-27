'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import FacturationSummary from '@/components/chantiers/FacturationSummary';
import TvaToggle from '@/components/chantiers/TvaToggle';
import { formatRemiseDisplay, parseRemiseInput } from '@/lib/chantiers/remise';
import { formatDevisDimension } from '@/lib/format/devisGrouping';
import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';
import { computeMontantLigneReleve } from '@/lib/format/ligneReleveCalcul';
import { computeReleveFacturation } from '@/lib/format/releveFacturation';

export default function DevisEditClient({ chantier, releve, lignes = [], canEditRemise = false }) {
  const router = useRouter();
  const [rows, setRows] = useState(
    lignes.map((ligne) => ({
      id: ligne.id,
      ouvrage_nom: ligne.ouvrage_nom,
      metier_nom: ligne.metier_nom,
      nombre: ligne.nombre,
      prix_unitaire_applique: String(ligne.prix_unitaire_applique ?? ''),
    }))
  );
  const [releveRemise, setReleveRemise] = useState(formatRemiseDisplay(releve?.remise));
  const [releveIndTva, setReleveIndTva] = useState(Number(releve?.ind_tva) === 1 ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const ligneById = useMemo(() => new Map(lignes.map((ligne) => [ligne.id, ligne])), [lignes]);

  const updateRow = (id, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, prix_unitaire_applique: value } : row))
    );
  };

  const lignesBrutHt = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const pu = Number(String(row.prix_unitaire_applique).replace(',', '.')) || 0;
        return (
          sum +
          computeMontantLigneReleve({
            prixUnitaireApplique: pu,
            nombre: row.nombre,
          })
        );
      }, 0),
    [rows]
  );

  const facturation = useMemo(
    () =>
      computeReleveFacturation({
        lignesMontantTotal: lignesBrutHt,
        remise: parseRemiseInput(releveRemise),
        indTva: releveIndTva,
        tvaTaux: releve?.tva_facture,
      }),
    [lignesBrutHt, releveRemise, releveIndTva, releve?.tva_facture]
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const payload = rows.map((row) => ({
        id: row.id,
        prix_unitaire_applique: Number(String(row.prix_unitaire_applique).replace(',', '.')) || 0,
        nombre: Number(row.nombre) || 0,
      }));

      const body = { lignes: payload };
      if (canEditRemise) {
        body.remise = parseRemiseInput(releveRemise);
        body.ind_tva = Number(releveIndTva) === 1 ? 1 : 0;
      }

      const response = await fetch(`/api/chantiers/${chantier.id}/releves/${releve.id}/lignes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Enregistrement impossible.');
      }

      router.push(`/chantiers/${chantier.id}/devis/${releve.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="devis-edit">
      <p className="devis-edit-hint">
        Modifiez le prix unitaire appliqué de chaque ligne. Le montant est recalculé (P.U × n).
      </p>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Métier</th>
              <th>Ouvrage</th>
              <th className="num">n</th>
              <th className="num">P.U appliqué</th>
              <th className="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ligne = ligneById.get(row.id);
              const dimension = ligne ? formatDevisDimension(ligne) : null;
              const pu = Number(String(row.prix_unitaire_applique).replace(',', '.')) || 0;
              const montant = computeMontantLigneReleve({
                prixUnitaireApplique: pu,
                nombre: row.nombre,
              });

              return (
                <tr key={row.id}>
                  <td>{row.metier_nom}</td>
                  <td>
                    <div className="devis-edit-designation">
                      <p className="devis-ouvrage">{row.ouvrage_nom}</p>
                      {dimension ? <p className="devis-dimension">{dimension}</p> : null}
                    </div>
                  </td>
                  <td className="num">{row.nombre ?? 0}</td>
                  <td className="num">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="inline-number-input"
                      value={row.prix_unitaire_applique}
                      onChange={(event) => updateRow(row.id, event.target.value)}
                    />
                  </td>
                  <td className="num">{formatMontantFcfa(montant)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEditRemise ? (
        <section className="devis-edit-facturation">
          <label className="field-label" htmlFor="devis-remise">
            Remise
          </label>
          <input
            id="devis-remise"
            type="text"
            inputMode="decimal"
            className="field-input devis-edit-remise-input"
            value={releveRemise}
            onChange={(event) => setReleveRemise(event.target.value)}
            placeholder="0"
          />

          <p className="devis-edit-section-title">TVA</p>
          <TvaToggle value={releveIndTva} onChange={setReleveIndTva} disabled={saving} />

          <FacturationSummary facturation={facturation} showTva={Number(releveIndTva) === 1} />
        </section>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}

      <div className="document-actions">
        <button type="button" className="secondary-button" onClick={() => router.back()}>
          Annuler
        </button>
        <button type="button" className="primary-button" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
}
