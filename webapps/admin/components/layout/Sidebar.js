'use client';

import { usePathname } from 'next/navigation';
import SidebarNavItem from '@/components/layout/SidebarNavItem';
import { APP_NAME } from '@/lib/theme/colors';
import { ROLE_LABELS } from '@/lib/auth/constants';
import { ADMIN_FOOTER_NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/navigation/adminNav';

function isNavItemActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ session }) {
  const pathname = usePathname();
  const roleLabel = ROLE_LABELS[session.role] || session.role;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <p className="sidebar-brand-name">{APP_NAME}</p>
        <p className="sidebar-brand-sub">Administration</p>
      </div>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        {ADMIN_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        {ADMIN_FOOTER_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
          />
        ))}
        <p className="sidebar-user-name">
          {session.prenom} {session.nom}
        </p>
        <p className="sidebar-user-meta">
          {session.identifiant} · {roleLabel}
        </p>
      </div>
    </aside>
  );
}
