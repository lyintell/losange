export async function updateClientClient(clientId, payload) {
  const response = await fetch(`/api/clients/${clientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur mise à jour client.');
  }

  return data.client;
}

export async function createClientClient(payload) {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur création client.');
  }

  return data.client;
}

export async function deleteClientClient(clientId) {
  const response = await fetch(`/api/clients/${clientId}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Erreur suppression client.');
  }

  return true;
}
