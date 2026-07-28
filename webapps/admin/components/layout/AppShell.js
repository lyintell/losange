'use client';

import { useCallback, useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import EntrepriseBrandHeader from '@/components/layout/EntrepriseBrandHeader';

export default function AppShell({ session, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSidebar();
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className={`app-shell${sidebarOpen ? ' app-shell--sidebar-open' : ''}`}>
      <div
        className="app-sidebar-backdrop"
        aria-hidden={!sidebarOpen}
        onClick={closeSidebar}
      />
      <Sidebar session={session} open={sidebarOpen} onNavigate={closeSidebar} />
      <div className="app-main">
        <EntrepriseBrandHeader
          session={session}
          onMenuClick={toggleSidebar}
          menuOpen={sidebarOpen}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
