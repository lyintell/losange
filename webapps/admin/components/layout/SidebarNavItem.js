import Link from 'next/link';
import AdminIcon from '@/components/ui/AdminIcon';

export default function SidebarNavItem({ href, label, icon, active = false }) {
  return (
    <Link
      href={href}
      className={`sidebar-nav-item${active ? ' sidebar-nav-item--active' : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="sidebar-nav-icon" aria-hidden="true">
        <AdminIcon name={icon} size={20} />
      </span>
      <span>{label}</span>
    </Link>
  );
}
