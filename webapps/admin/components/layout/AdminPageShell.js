import PageNavbar from '@/components/layout/PageNavbar';

export default function AdminPageShell({ navItem, breadcrumbs = null, children }) {
  if (!navItem) return null;

  return (
    <div className="admin-page">
      <PageNavbar icon={navItem.icon} title={navItem.label} breadcrumbs={breadcrumbs} />
      <div className="admin-page-body">{children}</div>
    </div>
  );
}
