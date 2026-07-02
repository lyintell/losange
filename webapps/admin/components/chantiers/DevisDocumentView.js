'use client';

import { useState } from 'react';
import DocumentViewToolbar from '@/components/chantiers/DocumentViewToolbar';
import DevisDocument from '@/components/chantiers/DevisDocument';
import { buildDocumentFileName } from '@/lib/chantiers/format';
import { getNextReleveStatus } from '@/lib/chantiers/releveStatus';
import { updateReleveStatusClient } from '@/lib/chantiers/updateReleveStatusClient';

export default function DevisDocumentView({
  chantier,
  lignes,
  releve,
  entreprise,
  canModifyChantier = true,
  canChangeChantierStatus = true,
  canChangeDevisStatus = true,
}) {
  const [chantierStatus, setChantierStatus] = useState(chantier.status || 'D');
  const [releveStatus, setReleveStatus] = useState(releve.status);
  const [releveStatusSaving, setReleveStatusSaving] = useState(false);
  const [releveStatusError, setReleveStatusError] = useState('');
  const modifyHref = `/chantiers/${chantier.id}/devis/${releve.id}/modifier`;

  const handleReleveStatusClick = async () => {
    const nextStatus = getNextReleveStatus(releveStatus);
    setReleveStatusSaving(true);
    setReleveStatusError('');

    try {
      const { status: savedStatus, chantierStatus } = await updateReleveStatusClient(
        chantier.id,
        releve.id,
        nextStatus
      );
      setReleveStatus(savedStatus);
      if (chantierStatus) {
        setChantierStatus(chantierStatus);
      }
    } catch (error) {
      setReleveStatusError(error.message || 'Impossible de mettre à jour le statut du relevé.');
    } finally {
      setReleveStatusSaving(false);
    }
  };

  return (
    <div className="document-page">
      <DocumentViewToolbar
        fileName={buildDocumentFileName(chantier, 'devis')}
        modifyHref={modifyHref}
        canModifyChantier={canModifyChantier}
        canChangeChantierStatus={canChangeChantierStatus}
        canChangeDevisStatus={canChangeDevisStatus}
        chantierId={chantier.id}
        chantierStatus={chantierStatus}
        onStatusChange={setChantierStatus}
        releveStatus={releveStatus}
        onReleveStatusClick={handleReleveStatusClick}
        releveStatusSaving={releveStatusSaving}
        releveStatusError={releveStatusError}
      />
      <div id="document-print-root">
        <DevisDocument
          chantier={chantier}
          lignes={lignes}
          releve={{ ...releve, status: releveStatus }}
          entreprise={entreprise}
          bare
        />
      </div>
    </div>
  );
}
