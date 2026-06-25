import AdminIcon from '@/components/ui/AdminIcon';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function PageNavbar({ icon, title, breadcrumbs = null }) {
  const items = breadcrumbs?.length ? breadcrumbs : title ? [{ label: title }] : [];

  return (
    <header className="page-navbar">
      <span className="page-navbar-icon" aria-hidden="true">
        <AdminIcon name={icon} size={22} />
      </span>
      <Breadcrumb items={items} />
    </header>
  );
}
