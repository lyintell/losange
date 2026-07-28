'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import SidebarNavItem from '@/components/layout/SidebarNavItem';
import AdminIcon from '@/components/ui/AdminIcon';
import { APP_NAME } from '@/lib/theme/colors';
import { ADMIN_NAV_ITEMS, getSidebarFooterNavItems } from '@/lib/navigation/adminNav';

function isNavItemActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ session, open = false, onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const footerItems = getSidebarFooterNavItems(session);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onNavigate?.();
      router.replace('/login');
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <aside
      id="app-sidebar"
      className={`app-sidebar${open ? ' app-sidebar--open' : ''}`}
      aria-hidden={!open}
      {...(!open ? { inert: true } : {})}
    >
      <div className="sidebar-brand">
        <p className="sidebar-brand-name">{APP_NAME}</p>
      </div>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        {ADMIN_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-user-name">
          {session.prenom} {session.nom}
        </p>
        {footerItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isNavItemActive(pathname, item.href)}
            onClick={onNavigate}
          />
        ))}
        <button
          type="button"
          className="sidebar-logout-button"
          onClick={handleLogout}
          disabled={logoutLoading}
        >
          <span className="sidebar-nav-icon" aria-hidden="true">
            <AdminIcon name="logout" size={20} />
          </span>
          <span>{logoutLoading ? 'Déconnexion…' : 'Se déconnecter'}</span>
        </button>
      </div>
    </aside>
  );
}
