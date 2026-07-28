'use client';

import { useEffect, useMemo, useState } from 'react';

export const TABLE_PAGE_SIZE_OPTIONS = [100, 200, 500];
export const DEFAULT_TABLE_PAGE_SIZE = 100;

export function useTablePagination(items = [], defaultPageSize = DEFAULT_TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [total, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return {
    pageItems,
    paginationProps: {
      page,
      pageSize,
      total,
      totalPages,
      from,
      to,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    },
  };
}
