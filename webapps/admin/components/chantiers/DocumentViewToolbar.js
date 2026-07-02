'use client';

import Link from 'next/link';
import { useState } from 'react';
import ReleveStatusBadge from '@/components/chantiers/ReleveStatusBadge';
import AdminIcon from '@/components/ui/AdminIcon';
import { markChantierAsDevisIfNeeded } from '@/lib/chantiers/updateChantierStatusClient';

export default function DocumentViewToolbar({
  fileName,
  modifyHref = null,
  canModifyChantier = true,
  canChangeChantierStatus = true,
  canChangeDevisStatus = true,
  chantierId = null,
  chantierStatus = null,
  onStatusChange = null,
  releveStatus = null,
  onReleveStatusClick = null,
  releveStatusSaving = false,
  releveStatusError = '',
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const maybeMarkAsDevis = async () => {
    if (!canChangeChantierStatus || !chantierId || chantierStatus !== 'D') return;

    try {
      const nextStatus = await markChantierAsDevisIfNeeded(chantierId, chantierStatus);
      onStatusChange?.(nextStatus);
    } catch (statusError) {
      console.error('Erreur mise à jour statut devis:', statusError);
    }
  };

  const handlePrint = async () => {
    await maybeMarkAsDevis();
    window.print();
  };

  const handleDownloadPdf = async () => {
    const root = document.getElementById('document-print-root');
    if (!root) {
      setError('Contenu introuvable.');
      return;
    }

    setDownloading(true);
    setError('');

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: fileName,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(root)
        .save();
      await maybeMarkAsDevis();
    } catch (downloadError) {
      console.error('Erreur export PDF:', downloadError);
      setError('Impossible de générer le PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="document-toolbar">
      <div className="document-toolbar-actions">
        <button
          type="button"
          className="secondary-button document-toolbar-button"
          onClick={handlePrint}
          disabled={downloading}
        >
          <AdminIcon name="printer" size={16} />
          <span>Imprimer</span>
        </button>
        <button
          type="button"
          className="primary-button document-toolbar-button"
          onClick={handleDownloadPdf}
          disabled={downloading}
        >
          <AdminIcon name="download" size={16} />
          <span>{downloading ? 'Génération…' : 'Télécharger PDF'}</span>
        </button>
        {modifyHref && canModifyChantier ? (
          <Link href={modifyHref} className="secondary-button document-toolbar-button">
            <AdminIcon name="pencil" size={16} />
            <span>Modifier</span>
          </Link>
        ) : null}
      </div>
      {releveStatus ? (
        <ReleveStatusBadge
          status={releveStatus}
          className="document-toolbar-status"
          saving={releveStatusSaving}
          onClick={canChangeDevisStatus ? onReleveStatusClick || undefined : undefined}
        />
      ) : null}
      {releveStatusError ? (
        <p className="field-error document-toolbar-error">{releveStatusError}</p>
      ) : null}
      {error ? <p className="field-error document-toolbar-error">{error}</p> : null}
    </div>
  );
}
