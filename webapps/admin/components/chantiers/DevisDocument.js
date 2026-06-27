import DocumentExportLogo from '@/components/chantiers/DocumentExportLogo';
import { formatDevisDocumentDate } from '@/lib/chantiers/documentDates';
import { buildDevisTableRows } from '@/lib/format/devisGrouping';
import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';
import { montantEnLettresFcfa } from '@/lib/format/montantEnLettres';
import { computeReleveFacturation } from '@/lib/format/releveFacturation';

export default function DevisDocument({ chantier, lignes = [], releve, entreprise, bare = false }) {
  const tableRows = buildDevisTableRows(lignes);
  const brutHt = lignes.reduce((sum, ligne) => sum + (Number(ligne.montant) || 0), 0);
  const facturation = computeReleveFacturation({
    lignesMontantTotal: brutHt,
    remise: releve?.remise ?? 0,
    indTva: releve?.ind_tva ?? 0,
    tvaTaux: releve?.tva_facture,
  });
  const afficheTva = Number(entreprise?.ind_pro) === 1 && facturation.applyTva;
  const montantArrete = afficheTva ? facturation.totalTtc : facturation.totalHt;
  const montantArreteLettres = montantEnLettresFcfa(montantArrete, { includeTtcLabel: afficheTva });
  const tel = [entreprise?.telephone_1, entreprise?.telephone_2].filter(Boolean).join(' / ');

  return (
    <article className={`pdf-document pdf-document--devis${bare ? ' pdf-document--bare' : ''}`}>
      <header className="pdf-devis-header">
        <div className="pdf-devis-header-top">
          <DocumentExportLogo storageKey={entreprise?.logo} alt={entreprise?.nom || 'Entreprise'} />
          <div className="pdf-devis-company">
            <h1>{entreprise?.nom || 'Entreprise'}</h1>
            {tel ? <p className="pdf-muted">{tel}</p> : null}
            {entreprise?.adresse ? <p className="pdf-muted">{entreprise.adresse}</p> : null}
          </div>
        </div>
        <p className="pdf-devis-title">DEVIS ESTIMATIF</p>
      </header>

      <div className="pdf-devis-meta">
        <div className="pdf-devis-meta-row">
          <p className="pdf-devis-meta-highlight">
            <strong>Client :</strong> {chantier?.client_nom || 'Client'}
          </p>
          <p className="pdf-devis-meta-date">{formatDevisDocumentDate()}</p>
        </div>
        <p className="pdf-devis-meta-highlight">
          <strong>Chantier :</strong> {chantier?.nom || 'Chantier'}
        </p>
      </div>

      <div className="pdf-devis-table-wrap">
        <table className="pdf-devis-table">
          <thead>
            <tr>
              <th className="designation">Designation</th>
              <th className="num">Quantite</th>
              <th className="num">P.U</th>
              <th className="num">Montant</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length ? (
              tableRows.map((row, index) => {
                if (row.isSectionSeparator) {
                  return (
                    <tr key={`section-sep-${index}`} className="row-section-divider">
                      <td colSpan={4} />
                    </tr>
                  );
                }

                if (row.isSectionHeader) {
                  return (
                    <tr key={`section-header-${index}`} className="row-section-header">
                      <td colSpan={4}>
                        <p className="devis-section">{row.sectionNom}</p>
                      </td>
                    </tr>
                  );
                }

                return (
                <tr
                  key={`${row.metierId}-${row.ouvrageNom}-${index}`}
                  className={[
                    row.ouvrageLigneSuite ? 'row-ouvrage-suite' : '',
                    row.ouvrageLigneBeforeSuite ? 'row-ouvrage-before-suite' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <td className="designation-cell">
                    <div className="designation">
                      {row.showMetier ? (
                        <p className="devis-metier" style={{ color: row.metierColor }}>
                          {row.metierNom}
                        </p>
                      ) : null}
                      {row.showOuvrage ? <p className="devis-ouvrage">{row.ouvrageNom}</p> : null}
                      {row.dimension ? <p className="devis-dimension">{row.dimension}</p> : null}
                    </div>
                  </td>
                  <td className="num">{row.quantiteLabel}</td>
                  <td className="num">{formatMontantFcfa(row.prixUnitaire)}</td>
                  <td className="num">{formatMontantFcfa(row.montant)}</td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4}>Aucune ligne</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <table className="pdf-devis-totals">
        <tbody>
          <tr>
            <td className="label">Remise</td>
            <td className="value">{formatMontantFcfa(facturation.montantRemise)}</td>
          </tr>
          <tr>
            <td className="label">Total HT</td>
            <td className="value">{formatMontantFcfa(facturation.totalHt)}</td>
          </tr>
          {afficheTva ? (
            <>
              <tr>
                <td className="label">TVA 18%</td>
                <td className="value">{formatMontantFcfa(facturation.montantTva)}</td>
              </tr>
              <tr>
                <td className="label">Total TTC</td>
                <td className="value">{formatMontantFcfa(facturation.totalTtc)}</td>
              </tr>
            </>
          ) : null}
        </tbody>
      </table>

      <p className="pdf-devis-arrete">
        Arrêté le présent devis estimatif à la somme de <strong>{montantArreteLettres}</strong>.
      </p>

      <div className="pdf-devis-signatures">
        <div className="pdf-signature-block">
          <p className="pdf-signature-title">Le Client</p>
          <div className="pdf-signature-line" />
        </div>
        <div className="pdf-signature-block pdf-signature-block-right">
          <p className="pdf-signature-title">Le Fournisseur</p>
          <div className="pdf-signature-line" />
        </div>
      </div>

      <footer className="pdf-devis-footer">
        {entreprise?.nom || ''}
        {tel ? ` · ${tel}` : ''}
        {entreprise?.adresse ? ` · ${entreprise.adresse}` : ''}
      </footer>
    </article>
  );
}
