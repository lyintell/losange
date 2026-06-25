'use client';

import DocumentViewToolbar from '@/components/chantiers/DocumentViewToolbar';
import ReleveDimensionsDocument from '@/components/chantiers/ReleveDimensionsDocument';
import { buildDocumentFileName } from '@/lib/chantiers/format';

export default function ReleveDocumentView({ chantier, lignes, entreprise }) {
  return (
    <div className="document-page">
      <DocumentViewToolbar fileName={buildDocumentFileName(chantier, 'releve')} />
      <div id="document-print-root">
        <ReleveDimensionsDocument chantier={chantier} lignes={lignes} entreprise={entreprise} bare />
      </div>
    </div>
  );
}
