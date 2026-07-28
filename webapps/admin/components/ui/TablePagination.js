'use client';

import { TABLE_PAGE_SIZE_OPTIONS } from '@/hooks/useTablePagination';

export default function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
}) {
  if (total === 0) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="table-pagination">
      <label className="table-pagination-size">
        <span>Par page</span>
        <select
          className="field-input table-pagination-select"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Nombre de lignes par page"
        >
          {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      <p className="table-pagination-summary">
        {from}–{to} sur {total}
      </p>

      <div className="table-pagination-nav">
        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
        >
          Précédent
        </button>
        <span className="table-pagination-page">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
