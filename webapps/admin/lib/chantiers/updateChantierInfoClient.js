export async function updateChantierInfoClient(chantierId, payload) {
  const response = await fetch(`/api/chantiers/${chantierId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour chantier.');
  }

  return data.chantier;
}

export async function searchClientsClient(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/clients/search?${params.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur recherche clients.');
  }

  return data.clients || [];
}

export async function searchChantiersByClientClient(clientId, query) {
  const params = new URLSearchParams({ clientId, q: query });
  const response = await fetch(`/api/chantiers/search?${params.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur recherche chantiers.');
  }

  return data.chantiers || [];
}
