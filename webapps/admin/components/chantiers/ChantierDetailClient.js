'use client';

import { useState } from 'react';
import ChantierInfoModal from '@/components/chantiers/ChantierInfoModal';
import ChantierStatusModal from '@/components/chantiers/ChantierStatusModal';
import { ChantierStatusBadge } from '@/components/chantiers/ChantiersTable';
import AdminIcon from '@/components/ui/AdminIcon';
import ReleveStatusBadge from '@/components/chantiers/ReleveStatusBadge';
import { useRowOpen } from '@/components/ui/useRowNavigate';
import { formatDisplayDate, formatDisplayDateTime } from '@/lib/chantiers/format';
import { getNextReleveStatus } from '@/lib/chantiers/releveStatus';
import { updateChantierStatusClient } from '@/lib/chantiers/updateChantierStatusClient';
import { updateReleveStatusClient } from '@/lib/chantiers/updateReleveStatusClient';

function ReleveListItem({ chantierId, releve, index }) {
  const href = `/chantiers/${chantierId}/releves/${releve.id}`;
  const handleRowClick = useRowOpen(href, { newTab: true });

  return (
    <li className="doc-list-item doc-list-item--clickable" onClick={handleRowClick}>
      <div>
        <p className="doc-list-title">Relevé {index + 1}</p>
        <p className="doc-list-meta">
          {formatDisplayDateTime(releve.cree_le)} · {formatDisplayDate(releve.date_facture)}
        </p>
      </div>
    </li>
  );
}

function ReleveList({ chantierId, releves, emptyLabel }) {
  if (!releves.length) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <ul className="doc-list">
      {releves.map((releve, index) => (
        <ReleveListItem key={releve.id} chantierId={chantierId} releve={releve} index={index} />
      ))}
    </ul>
  );
}

function DevisListItem({ chantierId, releve, index, savingReleveId, onReleveStatusClick }) {
  const href = `/chantiers/${chantierId}/devis/${releve.id}`;
  const handleRowClick = useRowOpen(href, { newTab: true });

  return (
    <li className="doc-list-item doc-list-item--clickable" onClick={handleRowClick}>
      <div>
        <p className="doc-list-title">Devis {index + 1}</p>
        <p className="doc-list-meta">
          {formatDisplayDate(releve.date_facture)} · HT{' '}
          {Math.round(Number(releve.total_ht_facture) || 0).toLocaleString('fr-FR')} FCFA
        </p>
      </div>
      <div className="doc-list-actions">
        <ReleveStatusBadge
          status={releve.status}
          saving={savingReleveId === releve.id}
          onClick={() => onReleveStatusClick?.(releve)}
        />
      </div>
    </li>
  );
}

function DevisList({ chantierId, releves, savingReleveId, onReleveStatusClick }) {
  if (!releves.length) {
    return <p className="empty-state">Aucun devis pour ce chantier.</p>;
  }

  return (
    <ul className="doc-list">
      {releves.map((releve, index) => (
        <DevisListItem
          key={releve.id}
          chantierId={chantierId}
          releve={releve}
          index={index}
          savingReleveId={savingReleveId}
          onReleveStatusClick={onReleveStatusClick}
        />
      ))}
    </ul>
  );
}

export default function ChantierDetailClient({
  chantier,
  activeTab: controlledTab = null,
  onTabChange = null,
}) {
  const [internalTab, setInternalTab] = useState('devis');
  const tab = controlledTab ?? internalTab;

  const setTab = (nextTab) => {
    onTabChange?.(nextTab);
    if (controlledTab == null) {
      setInternalTab(nextTab);
    }
  };
  const [info, setInfo] = useState({
    nom: chantier.nom || '',
    adresse: chantier.adresse || '',
    notes: chantier.notes || '',
    client_id: chantier.client_id,
    client_nom: chantier.client_nom || '',
    client_telephone_1: chantier.client_telephone_1 || '',
    client_telephone_2: chantier.client_telephone_2 || '',
  });
  const [chantierStatus, setChantierStatus] = useState(chantier.status || 'D');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [releves, setReleves] = useState(chantier.releves || []);
  const [releveStatusSavingId, setReleveStatusSavingId] = useState(null);
  const [releveStatusError, setReleveStatusError] = useState('');

  const chantierForModals = {
    id: chantier.id,
    ...info,
    status: chantierStatus,
    releves,
  };

  const handleStatusSelect = async (nextStatus) => {
    if (nextStatus === chantierStatus) {
      setStatusModalOpen(false);
      return;
    }

    setStatusSaving(true);
    setStatusError('');

    try {
      const updatedStatus = await updateChantierStatusClient(chantier.id, nextStatus);
      setChantierStatus(updatedStatus);
      setStatusModalOpen(false);
    } catch (statusUpdateError) {
      setStatusError(statusUpdateError.message || 'Impossible de mettre à jour le statut.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleInfoSaved = (updated) => {
    setInfo({
      nom: updated.nom || '',
      adresse: updated.adresse || '',
      notes: updated.notes || '',
      client_id: updated.client_id,
      client_nom: updated.client_nom || '',
      client_telephone_1: updated.client_telephone_1 || '',
      client_telephone_2: updated.client_telephone_2 || '',
    });
  };

  const openStatusModal = () => {
    setStatusError('');
    setStatusModalOpen(true);
  };

  const handleReleveStatusClick = async (releve) => {
    if (!releve?.id) return;

    const nextStatus = getNextReleveStatus(releve.status);
    setReleveStatusSavingId(releve.id);
    setReleveStatusError('');

    try {
      const { status: savedStatus, chantierStatus } = await updateReleveStatusClient(
        chantier.id,
        releve.id,
        nextStatus
      );
      setReleves((prev) =>
        prev.map((item) => (item.id === releve.id ? { ...item, status: savedStatus } : item))
      );
      if (chantierStatus) {
        setChantierStatus(chantierStatus);
      }
    } catch (error) {
      setReleveStatusError(error.message || 'Impossible de mettre à jour le statut du relevé.');
    } finally {
      setReleveStatusSavingId(null);
    }
  };

  return (
    <div className="chantier-detail">
      <div className="chantier-detail-header">
        <div>
          <div className="chantier-detail-title-row">
            <h2 className="chantier-detail-title">
              {info.client_nom || 'Client'} / {info.nom || 'Chantier'}
            </h2>
            <button
              type="button"
              className="status-trigger-button status-trigger-button--inline"
              onClick={openStatusModal}
            >
              <ChantierStatusBadge status={chantierStatus} />
            </button>
          </div>
          <p className="chantier-detail-meta">{info.adresse || 'Adresse non renseignée'}</p>
          {info.notes ? <p className="chantier-detail-meta chantier-detail-notes">{info.notes}</p> : null}
        </div>
        <button
          type="button"
          className="secondary-button icon-text-button"
          onClick={() => setInfoModalOpen(true)}
        >
          <AdminIcon name="pencil" size={16} />
          <span>Modifier info</span>
        </button>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-button ${tab === 'devis' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('devis')}
        >
          Les devis
        </button>
        <button
          type="button"
          className={`tab-button ${tab === 'releves' ? 'tab-button--active' : ''}`}
          onClick={() => setTab('releves')}
        >
          Les relevés
        </button>
      </div>

      {tab === 'devis' ? (
        <>
          {releveStatusError ? <p className="field-error">{releveStatusError}</p> : null}
          <DevisList
            chantierId={chantier.id}
            releves={releves}
            savingReleveId={releveStatusSavingId}
            onReleveStatusClick={handleReleveStatusClick}
          />
        </>
      ) : (
        <ReleveList
          chantierId={chantier.id}
          releves={releves}
          emptyLabel="Aucun relevé pour ce chantier."
        />
      )}

      <ChantierInfoModal
        open={infoModalOpen}
        chantier={chantierForModals}
        onClose={() => setInfoModalOpen(false)}
        onSaved={handleInfoSaved}
      />

      <ChantierStatusModal
        open={statusModalOpen}
        currentStatus={chantierStatus}
        saving={statusSaving}
        error={statusError}
        onClose={() => {
          if (statusSaving) return;
          setStatusModalOpen(false);
          setStatusError('');
        }}
        onSelect={handleStatusSelect}
      />
    </div>
  );
}
