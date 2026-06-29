export async function updateOuvrageClient(ouvrageId, payload) {
  const response = await fetch(`/api/ouvrages/${ouvrageId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour ouvrage.');
  }

  return data.ouvrage;
}

export async function createOuvrageClient(payload) {
  const response = await fetch('/api/ouvrages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur création ouvrage.');
  }

  return data.ouvrage;
}

export async function fetchCatalogueUnitesClient() {
  const response = await fetch('/api/unites');
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur chargement unités.');
  }

  return data.unites || [];
}
