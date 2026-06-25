import { formatMontantFcfa } from '@/lib/format/formatLigneMesures';

function FacturationRow({ label, value }) {
  return (
    <div className="facturation-row">
      <span className="facturation-row-label">{label}</span>
      <strong className="facturation-row-value">{formatMontantFcfa(value)}</strong>
    </div>
  );
}

export default function FacturationSummary({ facturation, showTva }) {
  return (
    <div className="facturation-summary">
      <FacturationRow label="Montant remise" value={facturation.montantRemise} />
      <FacturationRow label="Montant HT" value={facturation.totalHt} />
      {showTva ? (
        <>
          <FacturationRow label="Montant TVA" value={facturation.montantTva} />
          <FacturationRow label="Montant TTC" value={facturation.totalTtc} />
        </>
      ) : null}
    </div>
  );
}
