'use client';

import { useRouter } from 'next/navigation';

export function shouldIgnoreRowClick(event) {
  return Boolean(event.target.closest('a, button, [data-row-ignore-click]'));
}

export function useRowNavigate(href) {
  const router = useRouter();

  return (event) => {
    if (shouldIgnoreRowClick(event)) return;
    if (!href) return;
    router.push(href);
  };
}

export function useRowOpen(href, { newTab = false } = {}) {
  return (event) => {
    if (shouldIgnoreRowClick(event)) return;
    if (!href) return;
    if (newTab) {
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.assign(href);
  };
}
