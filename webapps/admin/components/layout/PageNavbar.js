import AdminIcon from '@/components/ui/AdminIcon';
import Breadcrumb from '@/components/layout/Breadcrumb';

export default function PageNavbar({ icon, title, breadcrumbs = null, trailing = null }) {
  const items = breadcrumbs?.length ? breadcrumbs : title ? [{ label: title }] : [];

  return (
    <header className="page-navbar">
      <span className="page-navbar-icon" aria-hidden="true">
        <AdminIcon name={icon} size={22} />
      </span>
      <Breadcrumb items={items} />
      {trailing ? <div className="page-navbar-trailing">{trailing}</div> : null}
    </header>
  );
}
