const METIER_PALETTE = [
  '#0D6EFD',
  '#198754',
  '#DC3545',
  '#6F42C1',
  '#E8590C',
  '#20C997',
  '#D63384',
  '#0AA2C0',
  '#795548',
  '#495057',
];

function hashString(value) {
  const text = String(value || 'default');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getMetierColor(metierId) {
  return METIER_PALETTE[hashString(metierId) % METIER_PALETTE.length];
}

export function getMetierTint(metierId, alpha = '14') {
  return `${getMetierColor(metierId)}${alpha}`;
}
