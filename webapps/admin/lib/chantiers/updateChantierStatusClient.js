export async function updateChantierStatusClient(chantierId, status) {
  const response = await fetch(`/api/chantiers/${chantierId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour statut.');
  }

  return data.status;
}

/** Passe le chantier en Devis si le statut actuel est Relevé (aligné mobile). */
export async function markChantierAsDevisIfNeeded(chantierId, currentStatus) {
  if (currentStatus !== 'D') return currentStatus;
  return updateChantierStatusClient(chantierId, 'V');
}
