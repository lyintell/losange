'use client';

import { useEffect, useState } from 'react';
import { APP_LOGO_PATH, resolveEntrepriseLogoUrl } from '@/lib/images/terrainImage';

export default function EntrepriseLogoImage({ storageKey, alt, size = 40, className = '' }) {
  const [src, setSrc] = useState(APP_LOGO_PATH);

  useEffect(() => {
    let cancelled = false;

    const loadLogo = async () => {
      if (!storageKey) {
        setSrc(APP_LOGO_PATH);
        return;
      }

      const signedUrl = await resolveEntrepriseLogoUrl(storageKey);
      if (!cancelled) {
        setSrc(signedUrl || APP_LOGO_PATH);
      }
    };

    loadLogo();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`entreprise-logo-image ${className}`.trim()}
      onError={() => setSrc(APP_LOGO_PATH)}
    />
  );
}
