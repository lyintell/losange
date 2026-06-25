'use client';

import EntrepriseLogoImage from '@/components/layout/EntrepriseLogoImage';

export default function DocumentExportLogo({ storageKey, alt = 'Logo' }) {
  return (
    <div className="pdf-export-logo">
      <EntrepriseLogoImage storageKey={storageKey} alt={alt} size={64} className="pdf-export-logo-image" />
    </div>
  );
}
