export function formatChantierNumero(chantierId, index = null) {
  if (index != null) {
    return `#${String(index + 1).padStart(3, '0')}`;
  }
  const id = String(chantierId || '');
  return id ? `#${id.slice(0, 6).toUpperCase()}` : '—';
}

export function formatDisplayDate(value) {
  if (!value) return '—';
  const normalized = String(value).includes('T') ? value : String(value).replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(value) {
  if (!value) return '—';
  const normalized = String(value).includes('T') ? value : String(value).replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesChantierSearch(row, query) {
  const term = normalizeSearchText(query);
  if (!term) return true;

  const haystack = [
    row.nom,
    row.adresse,
    row.client_nom,
    row.client_telephone_1,
    row.client_telephone_2,
    row.numero,
  ]
    .map(normalizeSearchText)
    .join(' ');

  return haystack.includes(term);
}

/** Recherche chantiers d'un client : nom, adresse, notes uniquement. */
export function matchesClientChantierSearch(row, query) {
  const term = normalizeSearchText(query);
  if (!term) return true;

  const haystack = [row.nom, row.adresse, row.notes, row.numero].map(normalizeSearchText).join(' ');

  return haystack.includes(term);
}

export function formatClientNamePhoneLine(client) {
  const name = client?.nom_complet?.trim() || 'Client';
  const tel1 = client?.telephone_1?.trim();
  const tel2 = client?.telephone_2?.trim();

  if (!tel1) return name;
  if (tel2) return `${name} - ${tel1} (/ ${tel2})`;
  return `${name} - ${tel1}`;
}

const slugifyClient = (value) =>
  String(value || 'client')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'client';

export function buildDocumentFileName(chantier, kind) {
  const client = slugifyClient(chantier?.client_nom);
  const date = new Date().toISOString().slice(0, 10);
  if (kind === 'devis') return `devis_${client}_${date}.pdf`;
  if (kind === 'devis-excel') return `devis_${client}_${date}.xlsx`;
  return `releves_${client}_${date}.pdf`;
}
