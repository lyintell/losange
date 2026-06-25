export default function DimensionLigne({ row }) {
  const measure = row.isDimensionLine
    ? row.dimensionLxhN || row.dimension || ''
    : row.nombrePdf ?? '';
  const equivalence = row.isDimensionLine ? row.dimensionEquivalence || '' : '';
  const note = row.note || '';
  const measureLine = [measure, equivalence].filter(Boolean).join(' ');
  const measureClass = measure || equivalence ? 'dim-measure' : 'dim-measure-secondary';

  if (measureLine && note) {
    return (
      <div className="dim-ligne">
        <span className={measureClass}>{measureLine}</span>
        <span className="dim-ligne-note">
          <span className="dim-ligne-arrow">→</span>
          {note}
        </span>
      </div>
    );
  }

  if (measureLine) {
    return (
      <div className="dim-ligne">
        <span className={measureClass}>{measureLine}</span>
      </div>
    );
  }

  if (note) {
    return (
      <div className="dim-ligne">
        <span className="dim-ligne-note">
          <span className="dim-ligne-arrow">→</span>
          {note}
        </span>
      </div>
    );
  }

  return null;
}
