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

export function breadcrumbOuvragesMetiersList() {
  return breadcrumbSingle('Liste des métiers');
}

export function breadcrumbMetierOuvrages(metier) {
  const name = metier?.nom?.trim() || 'Métier';
  const metierId = metier?.id;

  return [
    { label: 'Liste des métiers', href: '/ouvrages' },
    { label: name, href: metierId ? `/ouvrages/${metierId}` : undefined },
    { label: 'Liste des ouvrages' },
  ];
}

export function breadcrumbOuvrageDetail({ metier, ouvrage }) {
  const metierLabel = metier?.nom?.trim() || 'Métier';
  const ouvrageLabel = ouvrage?.nom?.trim() || 'Ouvrage';
  const metierId = metier?.id;
  const ouvrageId = ouvrage?.id;

  return [
    { label: 'Liste des métiers', href: '/ouvrages' },
    { label: metierLabel, href: metierId ? `/ouvrages/${metierId}` : undefined },
    { label: 'Liste des ouvrages', href: metierId ? `/ouvrages/${metierId}` : undefined },
    { label: ouvrageLabel, href:
        metierId && ouvrageId ? `/ouvrages/${metierId}/ouvrages/${ouvrageId}` : undefined },
  ];
}

export function breadcrumbArticlesMetiersList() {
  return breadcrumbSingle('Liste des métiers');
}

export function breadcrumbMetierArticles(metier) {
  const name = metier?.nom?.trim() || 'Métier';
  const metierId = metier?.id;

  return [
    { label: 'Liste des métiers', href: '/articles' },
    { label: name, href: metierId ? `/articles/${metierId}` : undefined },
    { label: 'Liste des articles' },
  ];
}

export function breadcrumbArticleDetail({ metier, article }) {
  const metierLabel = metier?.nom?.trim() || 'Métier';
  const articleLabel = article?.nom?.trim() || 'Article';
  const metierId = metier?.id;
  const articleId = article?.id;

  return [
    { label: 'Liste des métiers', href: '/articles' },
    { label: metierLabel, href: metierId ? `/articles/${metierId}` : undefined },
    { label: 'Liste des articles', href: metierId ? `/articles/${metierId}` : undefined },
    { label: articleLabel, href:
        metierId && articleId ? `/articles/${metierId}/articles/${articleId}` : undefined },
  ];
}
