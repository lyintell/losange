export function breadcrumbSingle(label) {
  return [{ label }];
}

export function breadcrumbClientsList() {
  return breadcrumbSingle('Liste des clients');
}

export function breadcrumbClientChantiers(client) {
  const name = client?.nom_complet?.trim() || 'Client';
  const clientId = client?.id;

  return [
    { label: 'Liste des clients', href: '/clients' },
    { label: name, href: clientId ? `/clients/${clientId}` : undefined },
    { label: 'Liste des chantiers' },
  ];
}

export function breadcrumbChantierDetail({
  clientId,
  clientName,
  chantierId,
  chantierName,
  tab = 'devis',
}) {
  const clientLabel = clientName?.trim() || 'Client';
  const chantierLabel = chantierName?.trim() || 'Chantier';
  const listLabel = tab === 'releves' ? 'Liste des relevés' : 'Liste des devis';

  return [
    { label: 'Liste des clients', href: '/clients' },
    { label: clientLabel, href: `/clients/${clientId}` },
    { label: 'Liste des chantiers', href: `/clients/${clientId}` },
    { label: chantierLabel, href: `/clients/${clientId}/chantiers/${chantierId}` },
    { label: listLabel },
  ];
}

export function breadcrumbMetiersList() {
  return breadcrumbSingle('Liste des métiers');
}

export function breadcrumbMetierCatalogue(metier, tab = 'ouvrages') {
  const name = metier?.nom?.trim() || 'Métier';
  const metierId = metier?.id;
  const listLabel = tab === 'articles' ? 'Liste des articles' : 'Liste des ouvrages';

  return [
    { label: 'Liste des métiers', href: '/ouvrages' },
    { label: name, href: metierId ? `/ouvrages/${metierId}` : undefined },
    { label: listLabel },
  ];
}
