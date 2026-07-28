'use client';

import EntrepriseLogoImage from '@/components/layout/EntrepriseLogoImage';
import AdminIcon from '@/components/ui/AdminIcon';

export default function EntrepriseBrandHeader({ session, onMenuClick, menuOpen = false }) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="app-header-menu-button"
          onClick={onMenuClick}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
        >
          <AdminIcon name="menu" size={24} />
        </button>
        <div className="app-header-brand">
          <EntrepriseLogoImage
            storageKey={session.entrepriseLogo}
            alt={`Logo ${session.entrepriseNom}`}
            size={42}
          />
          <p className="app-header-brand-name">{session.entrepriseNom}</p>
        </div>
      </div>
    </header>
  );
}
