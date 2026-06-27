'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import EntrepriseLogoImage from '@/components/layout/EntrepriseLogoImage';

export default function EntrepriseBrandHeader({ session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <EntrepriseLogoImage
          storageKey={session.entrepriseLogo}
          alt={`Logo ${session.entrepriseNom}`}
          size={42}
        />
        <p className="app-header-brand-name">{session.entrepriseNom}</p>
      </div>
      <button type="button" className="ghost-button" onClick={handleLogout} disabled={loading}>
        {loading ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
    </header>
  );
}
