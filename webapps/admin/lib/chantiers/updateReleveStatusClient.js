export async function updateReleveStatusClient(chantierId, releveId, status) {
  const response = await fetch(`/api/chantiers/${chantierId}/releves/${releveId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour statut relevé.');
  }

  return {
    status: data.status,
    chantierStatus: data.chantierStatus ?? null,
  };
}
