import PageNavbar from '@/components/layout/PageNavbar';

export default function AdminPageShell({
  navItem,
  breadcrumbs = null,
  showNavbar = true,
  navbarTrailing = null,
  children,
}) {
  if (!navItem) return null;

  return (
    <div className="admin-page">
      {showNavbar ? (
        <PageNavbar
          icon={navItem.icon}
          title={navItem.label}
          breadcrumbs={breadcrumbs}
          trailing={navbarTrailing}
        />
      ) : null}
      <div className="admin-page-body">{children}</div>
    </div>
  );
}
