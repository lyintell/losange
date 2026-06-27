export async function updateArticleClient(articleId, payload) {
  const response = await fetch(`/api/articles/${articleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour article.');
  }

  return data.article;
}

export async function fetchCatalogueUnitesClient() {
  const response = await fetch('/api/unites');
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur chargement unités.');
  }

  return data.unites || [];
}

export async function searchFournisseursClient({ metierId, query }) {
  const params = new URLSearchParams({
    metierId,
    q: query,
  });
  const response = await fetch(`/api/fournisseurs/search?${params.toString()}`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur recherche fournisseurs.');
  }

  return data.fournisseurs || [];
}
