import DimensionLigne from '@/components/chantiers/DimensionLigne';
import DocumentExportLogo from '@/components/chantiers/DocumentExportLogo';
import { formatReleveDocumentDate } from '@/lib/chantiers/documentDates';
import { buildRelevesTableRows } from '@/lib/format/devisGrouping';

export default function ReleveDimensionsDocument({
  chantier,
  lignes = [],
  entreprise = null,
  bare = false,
}) {
  const rows = buildRelevesTableRows(lignes);
  const releveDateRaw = lignes.find((ligne) => ligne.releve_date_facture)?.releve_date_facture;
  const releveDateLabel = formatReleveDocumentDate(releveDateRaw);
  const clientNom = chantier?.client_nom?.trim() || 'Client';
  const chantierNom = chantier?.nom?.trim() || 'Chantier';
  const chantierNotes = chantier?.notes?.trim() || '';

  return (
    <article className={`pdf-document pdf-document--releve${bare ? ' pdf-document--bare' : ''}`}>
      <div className="pdf-releve-header">
        <div className="pdf-releve-company-row">
          <DocumentExportLogo storageKey={entreprise?.logo} alt={entreprise?.nom || 'Entreprise'} />
          <h1 className="pdf-releve-company">{entreprise?.nom || 'Entreprise'}</h1>
        </div>
        <h2 className="pdf-releve-title">RELEVÉS - {clientNom} / {chantierNom}</h2>
      </div>

      {chantierNotes ? (
        <p className="pdf-releve-notes">
          <span className="pdf-releve-notes-label">Notes:</span> {chantierNotes}
        </p>
      ) : null}

      <div className="dimensions-list">
        {rows.length ? (
          rows.map((row, index) => {
            if (row.isSectionSeparator) {
              return <div key={`section-sep-${index}`} className="dim-section-divider" />;
            }

            if (row.isSectionHeader) {
              return (
                <p key={`section-header-${index}`} className="dim-section">
                  {row.sectionNom}
                </p>
              );
            }

            return (
            <section
              key={`${row.metierId}-${row.ouvrageNom}-${index}`}
              className={`dim-block ${row.metierDivider ? 'dim-block--divider' : ''}`}
            >
              {row.showMetier ? (
                <p className="dim-metier" style={{ color: row.metierColor }}>
                  {row.metierNom}
                </p>
              ) : null}
              {row.showOuvrage ? <p className="dim-ouvrage">{row.ouvrageNom}</p> : null}
              <DimensionLigne row={row} />
            </section>
            );
          })
        ) : (
          <p className="empty-state">Aucune dimension dans ce relevé.</p>
        )}
      </div>

      {releveDateLabel ? <footer className="pdf-releve-footer">{releveDateLabel}</footer> : null}
    </article>
  );
}
