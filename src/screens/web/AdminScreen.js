import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Checkbox, Divider, Menu, Text, TextInput } from 'react-native-paper';
import AdminImageFileField, {
  AdminImagePreview,
  uploadChantierPhotoAdmin,
  uploadEntrepriseLogoAdmin,
  uploadLignePhotoAdmin,
} from '../../components/terrain/AdminImageFileField';
import { CHANTIER_PHOTO_SLOTS } from '../../db/terrainImageStorage';
import LosangeLogoLoader from '../../components/terrain/LosangeLogoLoader';
import {
  deleteAdminRecord,
  fetchAllAdminRecords,
  insertAdminRecord,
  updateAdminRecord,
} from '../../db/supabaseAdmin';
import { isSupabaseConfigured } from '../../db/supabaseClient';
import { chantierColors } from '../../styles/theme';
import { computeQuantiteLigneReleve } from '../../utils/ligneReleveCalcul';

const ROLE_OPTIONS = [
  { value: 'A', label: 'A - admin' },
  { value: 'C', label: 'C - chantier' },
  { value: 'S', label: 'S - commercial' },
  { value: 'T', label: 'T - atelier' },
];

const FIELD_LABELS = {
  ind_pro: 'Compte Pro (sync cloud)',
  ind_active: 'Compte actif',
  ind_tva: 'Afficher TVA et TTC sur le devis',
  date_actif_jusqua: "Actif jusqu'au (AAAA-MM-JJ)",
  date_premier_login: 'Premier login terrain',
  date_facture: 'Date facture (AAAA-MM-JJ)',
  notes: 'Notes chantier',
  supprime_le: 'Supprimé le (tombstone sync)',
  note: 'Note relevé',
};

const getFieldLabel = (field) => FIELD_LABELS[field.name] || field.name;

const TABLE_GROUPS = [
  {
    title: 'COMPTES UTILISATEURS',
    tables: [
      { key: 'entreprises', label: 'Entreprises' },
      { key: 'profils', label: 'Profils' },
    ],
  },
  {
    title: "DONNÉES DE L'ENTREPRISE",
    tables: [
      { key: 'clients', label: 'Clients' },
      { key: 'chantiers', label: 'Chantiers' },
      { key: 'metiers', label: 'Métiers' },
      { key: 'ouvrages', label: 'Ouvrages' },
      { key: 'unites', label: 'Unités' },
      { key: 'ouvrage_unites', label: 'Ouvrage unités' },
      { key: 'releves', label: 'Relevés' },
      { key: 'ligne_releves', label: 'Ligne relevés' },
    ],
  },
];

const TABLE_SCHEMAS = {
  entreprises: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'telephone_1', type: 'TEXT', required: true },
    { name: 'telephone_2', type: 'TEXT' },
    { name: 'adresse', type: 'TEXT' },
    { name: 'logo', type: 'TEXT', isImageFile: true },
    { name: 'ind_pro', type: 'INTEGER', required: true, isBinaryToggle: true, defaultValue: 0, section: 'Compte' },
    { name: 'ind_active', type: 'INTEGER', required: true, isBinaryToggle: true, defaultValue: 1, section: 'Compte' },
    {
      name: 'ind_tva',
      type: 'INTEGER',
      required: true,
      isBinaryToggle: true,
      defaultValue: 0,
      section: 'Devis et validité',
    },
    {
      name: 'date_actif_jusqua',
      type: 'TEXT',
      section: 'Devis et validité',
      placeholder: 'AAAA-MM-JJ',
    },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  profils: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'entreprise_id', type: 'TEXT', fkTable: 'entreprises' },
    { name: 'prenom', type: 'TEXT', required: true },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'telephone_1', type: 'TEXT', required: true },
    { name: 'telephone_2', type: 'TEXT' },
    { name: 'role', type: 'TEXT', required: true, enumOptions: ROLE_OPTIONS, defaultValue: 'A' },
    { name: 'identifiant', type: 'TEXT' },
    { name: 'mot_de_passe', type: 'TEXT' },
    {
      name: 'date_premier_login',
      type: 'TEXT',
      isReadOnly: true,
      section: 'Connexion terrain',
    },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  clients: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'entreprise_id', type: 'TEXT', required: true, fkTable: 'entreprises' },
    { name: 'nom_complet', type: 'TEXT', required: true },
    { name: 'telephone_1', type: 'TEXT', required: true },
    { name: 'telephone_2', type: 'TEXT' },
    { name: 'supprime_le', type: 'TEXT' },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  chantiers: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'client_id', type: 'TEXT', required: true, fkTable: 'clients' },
    { name: 'chef_chantier_id', type: 'TEXT', fkTable: 'profils' },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'adresse', type: 'TEXT' },
    { name: 'responsable', type: 'TEXT' },
    {
      name: 'status',
      type: 'TEXT',
      required: true,
      enumOptions: [
        { value: 'D', label: 'D - dimension' },
        { value: 'V', label: 'V - devis' },
        { value: 'E', label: 'E - en cours' },
        { value: 'X', label: 'X - termine' },
        { value: 'Z', label: 'Z - annule' },
      ],
      defaultValue: 'D',
    },
    { name: 'notes', type: 'TEXT', isMultiline: true },
    { name: 'photo_1', type: 'TEXT', isImageFile: true },
    { name: 'photo_2', type: 'TEXT', isImageFile: true },
    { name: 'photo_3', type: 'TEXT', isImageFile: true },
    { name: 'supprime_le', type: 'TEXT' },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  metiers: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'abbrev', type: 'TEXT' },
    { name: 'icon', type: 'TEXT' },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
  ],
  ouvrages: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'metier_id', type: 'TEXT', required: true, fkTable: 'metiers' },
    { name: 'entreprise_id', type: 'TEXT', required: true, fkTable: 'entreprises' },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  unites: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'formule', type: 'TEXT', required: true },
    { name: 'nom', type: 'TEXT', required: true },
    { name: 'nom_unite', type: 'TEXT', required: true, maxLength: 10 },
    { name: 'ind_dimension', type: 'INTEGER', required: true, isBinaryToggle: true, defaultValue: 0 },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
  ],
  ouvrage_unites: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'ouvrage_id', type: 'TEXT', required: true, fkTable: 'ouvrages' },
    { name: 'unite_id', type: 'TEXT', required: true, fkTable: 'unites' },
    { name: 'prix_unitaire', type: 'REAL', required: true },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  releves: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'chantier_id', type: 'TEXT', required: true, fkTable: 'chantiers' },
    { name: 'prise_par_id', type: 'TEXT', fkTable: 'profils' },
    { name: 'date_facture', type: 'TEXT', defaultToday: true, placeholder: 'AAAA-MM-JJ' },
    { name: 'total_ht_facture', type: 'REAL' },
    { name: 'tva_facture', type: 'REAL' },
    { name: 'total_ttc_facture', type: 'REAL' },
    { name: 'note', type: 'TEXT', isMultiline: true },
    { name: 'supprime_le', type: 'TEXT' },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
  ligne_releves: [
    { name: 'id', type: 'TEXT', required: true, isId: true },
    { name: 'releve_id', type: 'TEXT', required: true, fkTable: 'releves' },
    { name: 'ouvrage_unite_id', type: 'TEXT', required: true, fkTable: 'ouvrage_unites' },
    { name: 'largeur', type: 'REAL' },
    { name: 'hauteur', type: 'REAL' },
    { name: 'profondeur', type: 'REAL' },
    { name: 'nombre', type: 'INTEGER' },
    { name: 'quantite', type: 'REAL', required: true, isAutoComputed: true },
    { name: 'prix_unitaire_applique', type: 'REAL', required: true },
    { name: 'montant', type: 'REAL', required: true, isAutoComputed: true },
    { name: 'note', type: 'TEXT', isMultiline: true },
    { name: 'photo', type: 'TEXT', isImageFile: true },
    { name: 'ind_complete', type: 'INTEGER', defaultValue: 0 },
    { name: 'supprime_le', type: 'TEXT' },
    { name: 'cree_le', type: 'TEXT' },
    { name: 'mis_a_jour_le', type: 'TEXT' },
    { name: '_synced', type: 'INTEGER', isSynced: true, defaultValue: 0 },
  ],
};

const ALL_TABLES = TABLE_GROUPS.flatMap((group) => group.tables);

const buildInitialRecords = () => {
  const records = {};
  ALL_TABLES.forEach((table) => {
    records[table.key] = [];
  });
  return records;
};

const createUuid = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

const nowIso = () => new Date().toISOString();

const castFieldValue = (fieldType, rawValue) => {
  const value = String(rawValue ?? '').trim();
  if (!value.length) return null;
  if (fieldType === 'INTEGER') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (fieldType === 'REAL') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return value;
};

const getTableLabel = (tableKey) => ALL_TABLES.find((item) => item.key === tableKey)?.label || tableKey;

const getPrimaryText = (record) =>
  record?.nom || record?.nom_complet || `${record?.prenom || ''} ${record?.nom || ''}`.trim() || record?.id || 'Sans titre';

const truncateText = (value, maxLength = 80) => {
  const text = String(value ?? '').trim();
  if (!text.length) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
};

const getById = (list, id) => (list || []).find((item) => String(item.id) === String(id));

const getListLabel = (tableKey, record, recordsByTable) => {
  if (!record) return 'Sans titre';

  if (tableKey === 'ouvrage_unites') {
    const ouvrage = getById(recordsByTable.ouvrages, record.ouvrage_id);
    const unite = getById(recordsByTable.unites, record.unite_id);
    const ouvrageNom = ouvrage?.nom || 'Ouvrage inconnu';
    const uniteNom = unite?.nom_unite || 'Unité inconnue';
    return `${ouvrageNom} / ${uniteNom}`;
  }

  if (tableKey === 'releves') {
    const chantier = getById(recordsByTable.chantiers, record.chantier_id);
    const client = chantier ? getById(recordsByTable.clients, chantier.client_id) : null;
    const clientNom = client?.nom_complet || 'Client inconnu';
    const chantierNom = chantier?.nom || 'Chantier inconnu';
    const notePreview = truncateText(record.note, 60);
    const base = `${clientNom} / ${chantierNom}`;
    return notePreview ? `${base} — ${notePreview}` : base;
  }

  if (tableKey === 'ligne_releves') {
    const releve = getById(recordsByTable.releves, record.releve_id);
    const chantier = releve ? getById(recordsByTable.chantiers, releve.chantier_id) : null;
    const client = chantier ? getById(recordsByTable.clients, chantier.client_id) : null;
    const ouvrageUnite = getById(recordsByTable.ouvrage_unites, record.ouvrage_unite_id);
    const ouvrage = ouvrageUnite ? getById(recordsByTable.ouvrages, ouvrageUnite.ouvrage_id) : null;
    const unite = ouvrageUnite ? getById(recordsByTable.unites, ouvrageUnite.unite_id) : null;

    const clientNom = client?.nom_complet || 'Client inconnu';
    const chantierNom = chantier?.nom || 'Chantier inconnu';
    const ouvrageNom = ouvrage?.nom || 'Ouvrage inconnu';
    const uniteNom = unite?.nom_unite || 'Unité inconnue';
    return `${clientNom} / ${chantierNom} / ${ouvrageNom} / ${uniteNom}`;
  }

  return getPrimaryText(record);
};

const getFkDisplayLabel = (fkTable, recordId, recordsByTable) => {
  if (!recordId) return null;
  const record = getById(recordsByTable[fkTable], recordId);
  if (!record) return String(recordId);
  return getListLabel(fkTable, record, recordsByTable);
};

const applyLigneReleveAutoCalculations = (record, recordsByTable) => {
  const ouvrageUnite = getById(recordsByTable.ouvrage_unites, record.ouvrage_unite_id);
  const unite = ouvrageUnite ? getById(recordsByTable.unites, ouvrageUnite.unite_id) : null;
  const quantite = computeQuantiteLigneReleve({
    indDimension: unite?.ind_dimension,
    formule: unite?.formule,
    largeur: record.largeur,
    hauteur: record.hauteur,
    profondeur: record.profondeur,
    nombre: record.nombre,
  });
  record.quantite = quantite;
  record.montant = quantite * (Number(record.prix_unitaire_applique) || 0);
  return record;
};

const formatDetailValue = (field, value, recordsByTable) => {
  if (field.isImageFile) {
    return value ? 'Fichier image' : '-';
  }
  if (value === null || value === undefined || value === '') return '-';
  if (field.fkTable) {
    return getFkDisplayLabel(field.fkTable, value, recordsByTable);
  }
  if (field.enumOptions) {
    const option = field.enumOptions.find((item) => item.value === value);
    return option?.label || String(value);
  }
  return String(value);
};

export default function AdminScreen({ onLogout }) {
  const [recordsByTable, setRecordsByTable] = useState(() => buildInitialRecords());
  const [selectedTable, setSelectedTable] = useState(ALL_TABLES[0].key);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [formError, setFormError] = useState('');
  const [openSelectField, setOpenSelectField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const fields = useMemo(() => TABLE_SCHEMAS[selectedTable] || [], [selectedTable]);

  const isLogoFieldDisabled = (field) =>
    field.name === 'logo' &&
    selectedTable === 'entreprises' &&
    String(formValues.ind_pro ?? selectedItem?.ind_pro ?? '0') !== '1';

  const items = useMemo(() => recordsByTable[selectedTable] || [], [recordsByTable, selectedTable]);
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) || items[0] || null, [items, selectedItemId]);

  const resolveChantierEntrepriseId = (clientId) => {
    const client = getById(recordsByTable.clients, clientId);
    return client?.entreprise_id || null;
  };

  const resolveLignePhotoContext = (releveId) => {
    const releve = getById(recordsByTable.releves, releveId);
    const chantier = releve ? getById(recordsByTable.chantiers, releve.chantier_id) : null;
    const client = chantier ? getById(recordsByTable.clients, chantier.client_id) : null;
    return {
      chantierId: chantier?.id || null,
      entrepriseId: client?.entreprise_id || null,
    };
  };

  const renderImageFormField = (field) => {
    const fieldLabel = getFieldLabel(field);
    const storageKey = formValues[field.name] || '';
    const imageHint = 'Fichier image (JPEG, PNG, WebP).';

    if (field.name === 'logo' && selectedTable === 'entreprises') {
      const disabled = isLogoFieldDisabled(field);
      return (
        <AdminImageFileField
          label={`${fieldLabel}${field.required ? ' *' : ''}`}
          storageKey={storageKey || null}
          disabled={disabled}
          hint={disabled ? 'Logo disponible uniquement pour les comptes Pro.' : imageHint}
          onUploaded={async (file) => {
            const entrepriseId = formValues.id || selectedItem?.id;
            const uploadedKey = await uploadEntrepriseLogoAdmin(entrepriseId, file);
            setFormValues((prev) => ({ ...prev, logo: uploadedKey }));
            return uploadedKey;
          }}
          onClear={() => setFormValues((prev) => ({ ...prev, logo: '' }))}
        />
      );
    }

    if (selectedTable === 'chantiers' && CHANTIER_PHOTO_SLOTS.includes(field.name)) {
      const chantierId = formValues.id || selectedItem?.id;
      const entrepriseId = resolveChantierEntrepriseId(formValues.client_id);
      const missingContext = !chantierId || !entrepriseId;
      return (
        <AdminImageFileField
          label={fieldLabel}
          storageKey={storageKey || null}
          disabled={missingContext}
          hint={
            missingContext
              ? "Sélectionnez un client (entreprise connue) et conservez l'identifiant chantier."
              : imageHint
          }
          onUploaded={async (file) => {
            const uploadedKey = await uploadChantierPhotoAdmin(
              entrepriseId,
              chantierId,
              field.name,
              file
            );
            setFormValues((prev) => ({ ...prev, [field.name]: uploadedKey }));
            return uploadedKey;
          }}
          onClear={() => setFormValues((prev) => ({ ...prev, [field.name]: '' }))}
        />
      );
    }

    if (selectedTable === 'ligne_releves' && field.name === 'photo') {
      const ligneId = formValues.id || selectedItem?.id;
      const { chantierId, entrepriseId } = resolveLignePhotoContext(formValues.releve_id);
      const missingContext = !ligneId || !chantierId || !entrepriseId;
      return (
        <AdminImageFileField
          label={fieldLabel}
          storageKey={storageKey || null}
          disabled={missingContext}
          hint={
            missingContext
              ? "Sélectionnez un relevé (chantier et entreprise connus) et conservez l'identifiant ligne."
              : imageHint
          }
          onUploaded={async (file) => {
            const uploadedKey = await uploadLignePhotoAdmin(entrepriseId, chantierId, ligneId, file);
            setFormValues((prev) => ({ ...prev, photo: uploadedKey }));
            return uploadedKey;
          }}
          onClear={() => setFormValues((prev) => ({ ...prev, photo: '' }))}
        />
      );
    }

    return (
      <View style={styles.fieldWrapper}>
        <Text style={styles.fieldHint}>
          {fieldLabel} : clé de stockage ({storageKey || 'aucune'})
        </Text>
      </View>
    );
  };

  const reloadRecords = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoadError('Supabase non configuré. Copiez .env.example vers .env et renseignez vos clés.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const next = await fetchAllAdminRecords();
      setRecordsByTable(next);
    } catch (error) {
      console.error('Erreur chargement Supabase admin:', error);
      setLoadError(error.message || 'Impossible de charger les données Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadRecords();
  }, [reloadRecords]);

  useEffect(() => {
    if (!items.length) {
      setSelectedItemId(null);
      return;
    }
    if (!items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectedItemId]);

  const handleTableSelect = (tableKey) => {
    setSelectedTable(tableKey);
    setSelectedItemId(recordsByTable[tableKey]?.[0]?.id || null);
    setFormMode(null);
    setFormError('');
  };

  const handleOpenCreate = () => {
    const values = {};
    const schema = TABLE_SCHEMAS[selectedTable] || [];
    schema.forEach((field) => {
      if (field.isId) {
        values[field.name] = createUuid();
      } else if (field.isSynced || field.isBinaryToggle) {
        values[field.name] = String(field.defaultValue ?? 0);
      } else if (field.defaultToday) {
        values[field.name] = new Date().toISOString().slice(0, 10);
      } else if (field.defaultValue !== undefined) {
        values[field.name] = String(field.defaultValue);
      } else if (field.type === 'INTEGER' || field.type === 'REAL') {
        values[field.name] = '';
      } else {
        values[field.name] = '';
      }
    });
    setFormValues(values);
    setFormMode('create');
    setFormError('');
    setOpenSelectField(null);
  };

  const handleOpenEdit = () => {
    if (!selectedItem) return;
    const values = {};
    fields.forEach((field) => {
      const currentValue = selectedItem[field.name];
      values[field.name] = currentValue === null || currentValue === undefined ? '' : String(currentValue);
    });
    setFormValues(values);
    setFormMode('edit');
    setFormError('');
    setOpenSelectField(null);
  };

  const handleSaveForm = async () => {
    const schema = TABLE_SCHEMAS[selectedTable] || [];
    const nextRecord = {};
    const currentTs = nowIso();
    const hasCreatedAt = schema.some((field) => field.name === 'cree_le');
    const hasUpdatedAt = schema.some((field) => field.name === 'mis_a_jour_le');

    for (const field of schema) {
      if (field.isAutoComputed) continue;
      if (field.isReadOnly) {
        if (formMode === 'edit' && selectedItem) {
          nextRecord[field.name] = selectedItem[field.name] ?? null;
        } else {
          nextRecord[field.name] = null;
        }
        continue;
      }
      const rawValue = formValues[field.name] ?? '';
      if (field.maxLength && String(rawValue).length > field.maxLength) {
        setFormError(`Le champ ${field.name} doit contenir au maximum ${field.maxLength} caractères.`);
        return;
      }
      const casted = castFieldValue(field.type, rawValue);
      if (field.required && (casted === null || casted === '')) {
        setFormError(`Le champ ${field.name} est obligatoire.`);
        return;
      }
      nextRecord[field.name] = casted;
    }

    if (selectedTable === 'ligne_releves') {
      try {
        applyLigneReleveAutoCalculations(nextRecord, recordsByTable);
        if (!nextRecord.ouvrage_unite_id) {
          setFormError('Le champ ouvrage_unite_id est obligatoire.');
          return;
        }
      } catch (error) {
        setFormError(error.message || 'Impossible de calculer la quantité.');
        return;
      }
    }

    setSaving(true);
    setFormError('');

    try {
      if (formMode === 'create') {
        if (hasCreatedAt) nextRecord.cree_le = currentTs;
        if (hasUpdatedAt) nextRecord.mis_a_jour_le = currentTs;
        const created = await insertAdminRecord(selectedTable, nextRecord);
        setSelectedItemId(String(created.id));
      } else if (formMode === 'edit' && selectedItem) {
        if (hasCreatedAt) {
          nextRecord.cree_le = selectedItem.cree_le || currentTs;
        }
        if (hasUpdatedAt) {
          nextRecord.mis_a_jour_le = currentTs;
        }
        const updated = await updateAdminRecord(selectedTable, selectedItem.id, nextRecord);
        setSelectedItemId(String(updated.id));
      }

      await reloadRecords();
      setFormMode(null);
      setOpenSelectField(null);
    } catch (error) {
      setFormError(error.message || 'Erreur lors de la sauvegarde Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    setSaving(true);
    setFormError('');

    try {
      await deleteAdminRecord(selectedTable, selectedItem.id);
      await reloadRecords();
      setFormMode(null);
      setOpenSelectField(null);
    } catch (error) {
      setFormError(error.message || 'Erreur lors de la suppression Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const renderSelectField = (field) => {
    const sourceTable = field.fkTable || selectedTable;
    const options = recordsByTable[sourceTable] || [];
    const currentValue = formValues[field.name] ?? '';
    const selectedLabel = getFkDisplayLabel(sourceTable, currentValue, recordsByTable) || 'Sélectionner';

    return (
      <Menu
        key={field.name}
        visible={openSelectField === field.name}
        onDismiss={() => setOpenSelectField(null)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setOpenSelectField(field.name)}
            style={styles.selectButton}
            contentStyle={styles.selectButtonContent}
          >
            {getFieldLabel(field)}: {selectedLabel}
          </Button>
        }
      >
        {!field.required && (
          <Menu.Item
            title="Aucune valeur"
            onPress={() => {
              setFormValues((prev) => ({ ...prev, [field.name]: '' }));
              setOpenSelectField(null);
            }}
          />
        )}
        {options.map((item) => (
          <Menu.Item
            key={String(item.id)}
            title={getListLabel(sourceTable, item, recordsByTable)}
            onPress={() => {
              setFormValues((prev) => ({ ...prev, [field.name]: String(item.id) }));
              setOpenSelectField(null);
            }}
          />
        ))}
      </Menu>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <Text variant="headlineSmall" style={styles.sidebarTitle}>
          Admin
        </Text>
        <Text variant="bodyMedium" style={styles.sidebarSubtitle}>
          Données Supabase
        </Text>

        <ScrollView style={styles.sidebarScroll} contentContainerStyle={styles.sidebarScrollContent}>
          {TABLE_GROUPS.map((group, index) => (
            <View key={group.title}>
              {index > 0 && <Divider style={styles.groupDivider} />}
              <Text variant="labelLarge" style={styles.groupLabel}>
                {group.title}
              </Text>
              <View style={styles.tableList}>
                {group.tables.map((table) => (
                  <Button
                    key={table.key}
                    mode={table.key === selectedTable ? 'contained' : 'text'}
                    style={styles.tableButton}
                    contentStyle={styles.tableButtonContent}
                    onPress={() => handleTableSelect(table.key)}
                  >
                    {table.label}
                  </Button>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.logoutContainer}>
          <Button mode="outlined" icon="logout" onPress={onLogout}>
            Logout
          </Button>
        </View>
      </View>

      <View style={styles.mainArea}>
        {!!loadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{loadError}</Text>
            <Button mode="outlined" onPress={reloadRecords} disabled={loading}>
              Réessayer
            </Button>
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <LosangeLogoLoader size="large" />
          </View>
        )}

        <View style={styles.main}>
        <View style={[styles.listPane, loading && styles.paneDisabled]}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Liste {getTableLabel(selectedTable)}
            </Text>
            <Button mode="contained" icon="plus" onPress={handleOpenCreate}>
              Ajouter
            </Button>
          </View>

          <FlatList
            style={styles.listScroll}
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <Divider />}
            renderItem={({ item }) => (
              <Pressable onPress={() => setSelectedItemId(String(item.id))}>
                <View style={[styles.rowItem, String(item.id) === String(selectedItem?.id) && styles.rowItemActive]}>
                  <Text variant="titleMedium" style={styles.rowTitle}>
                    {getListLabel(selectedTable, item, recordsByTable)}
                  </Text>
                  <Text variant="bodyMedium" style={styles.rowSubtitle}>
                    {selectedTable === 'releves' && item.note
                      ? `Note: ${truncateText(item.note, 120)}`
                      : String(item.id || '')}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </View>

        <View style={[styles.detailsPane, loading && styles.paneDisabled]}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Détails
          </Text>
          <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsScrollContent}>
            {formMode ? (
              <Card style={styles.detailsCardForm}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.formTitle}>
                    {formMode === 'create' ? 'Ajouter un élément' : 'Modifier élément'}
                  </Text>
                  {fields.map((field, fieldIndex) => {
                    const prevSection = fieldIndex > 0 ? fields[fieldIndex - 1].section : null;
                    const showSection = field.section && field.section !== prevSection;
                    const fieldLabel = getFieldLabel(field);
                    const isDisabled =
                      field.isReadOnly ||
                      field.isId ||
                      field.name === 'cree_le' ||
                      field.name === 'mis_a_jour_le' ||
                      field.isAutoComputed ||
                      isLogoFieldDisabled(field);

                    return (
                      <View key={field.name}>
                        {showSection ? (
                          <View style={styles.fieldSection}>
                            <Divider />
                            <Text style={styles.fieldSectionTitle}>{field.section}</Text>
                          </View>
                        ) : null}
                        <View style={styles.fieldWrapper}>
                          {field.isImageFile ? (
                            renderImageFormField(field)
                          ) : field.fkTable || field.enumOptions ? (
                            <Menu
                              visible={openSelectField === field.name}
                              onDismiss={() => setOpenSelectField(null)}
                              anchor={
                                <Button
                                  mode="outlined"
                                  onPress={() => setOpenSelectField(field.name)}
                                  style={styles.selectButton}
                                  contentStyle={styles.selectButtonContent}
                                  disabled={isDisabled}
                                >
                                  {fieldLabel}:{' '}
                                  {field.enumOptions
                                    ? field.enumOptions.find((option) => option.value === formValues[field.name])
                                        ?.label || 'Sélectionner'
                                    : getFkDisplayLabel(field.fkTable, formValues[field.name], recordsByTable) ||
                                      'Sélectionner'}
                                </Button>
                              }
                            >
                              {!field.required && (
                                <Menu.Item
                                  title="Aucune valeur"
                                  onPress={() => {
                                    setFormValues((prev) => ({ ...prev, [field.name]: '' }));
                                    setOpenSelectField(null);
                                  }}
                                />
                              )}
                              {field.fkTable &&
                                (recordsByTable[field.fkTable] || []).map((item) => (
                                  <Menu.Item
                                    key={String(item.id)}
                                    title={getListLabel(field.fkTable, item, recordsByTable)}
                                    onPress={() => {
                                      setFormValues((prev) => ({ ...prev, [field.name]: String(item.id) }));
                                      setOpenSelectField(null);
                                    }}
                                  />
                                ))}
                              {field.enumOptions &&
                                field.enumOptions.map((option) => (
                                  <Menu.Item
                                    key={option.value}
                                    title={option.label}
                                    onPress={() => {
                                      setFormValues((prev) => ({ ...prev, [field.name]: option.value }));
                                      setOpenSelectField(null);
                                    }}
                                  />
                                ))}
                            </Menu>
                          ) : field.isSynced || field.isBinaryToggle ? (
                            <Pressable
                              style={styles.checkboxRow}
                              onPress={() => {
                                if (isDisabled) return;
                                setFormValues((prev) => ({
                                  ...prev,
                                  [field.name]: prev[field.name] === '1' ? '0' : '1',
                                }));
                              }}
                            >
                              <Checkbox status={formValues[field.name] === '1' ? 'checked' : 'unchecked'} />
                              <Text style={styles.checkboxLabel}>
                                {fieldLabel}
                                {field.required ? ' *' : ''}
                              </Text>
                            </Pressable>
                          ) : (
                            <TextInput
                              label={`${fieldLabel}${field.required ? ' *' : ''}`}
                              mode="outlined"
                              value={formValues[field.name] ?? ''}
                              placeholder={field.placeholder}
                              maxLength={field.maxLength}
                              multiline={!!field.isMultiline}
                              numberOfLines={field.isMultiline ? 4 : 1}
                              keyboardType={field.type === 'TEXT' ? 'default' : 'numeric'}
                              onChangeText={(value) =>
                                setFormValues((prev) => ({ ...prev, [field.name]: value }))
                              }
                              style={[styles.formInput, field.isMultiline && styles.formInputMultiline]}
                              disabled={isDisabled}
                            />
                          )}
                          {field.isReadOnly ? (
                            <Text style={styles.fieldHint}>Renseigné automatiquement par l'application mobile.</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  {!!formError && <Text style={styles.formError}>{formError}</Text>}
                </Card.Content>
              </Card>
            ) : (
              <Card style={styles.detailsCard}>
                <Card.Content>
                  {!selectedItem ? (
                    <Text variant="bodyLarge" style={styles.detailSubTitle}>
                      Sélectionnez un élément dans la liste.
                    </Text>
                  ) : (
                    fields.map((field) => (
                      <View key={field.name} style={styles.detailRow}>
                        <Text variant="bodyMedium" style={styles.detailLabel}>
                          {getFieldLabel(field)}
                        </Text>
                        {field.isImageFile && selectedItem[field.name] ? (
                          <AdminImagePreview storageKey={selectedItem[field.name]} />
                        ) : null}
                        <Text
                          variant="bodyLarge"
                          style={[styles.detailValue, field.isMultiline && styles.detailValueMultiline]}
                        >
                          {formatDetailValue(field, selectedItem[field.name], recordsByTable)}
                        </Text>
                      </View>
                    ))
                  )}
                </Card.Content>
              </Card>
            )}
          </ScrollView>

          <View style={styles.actionRow}>
            {formMode ? (
              <>
                <Button mode="contained" icon="content-save" onPress={handleSaveForm} loading={saving} disabled={saving}>
                  Enregistrer
                </Button>
                <Button mode="outlined" onPress={() => setFormMode(null)} disabled={saving}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <Button
                  mode="contained"
                  icon="pencil"
                  style={styles.editButton}
                  onPress={handleOpenEdit}
                  disabled={!selectedItem || saving}
                >
                  Modifier
                </Button>
                <Button
                  mode="contained"
                  icon="trash-can"
                  buttonColor="#9CA3AF"
                  onPress={handleDelete}
                  disabled={!selectedItem || saving}
                  loading={saving}
                >
                  Supprimer
                </Button>
              </>
            )}
          </View>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    backgroundColor: chantierColors.background,
  },
  sidebar: {
    width: 260,
    flexDirection: 'column',
    minHeight: 0,
    backgroundColor: chantierColors.surface,
    borderRightWidth: 1,
    borderRightColor: chantierColors.border,
    padding: 16,
  },
  sidebarScroll: {
    flex: 1,
    minHeight: 0,
  },
  sidebarScrollContent: {
    paddingBottom: 8,
  },
  sidebarTitle: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  sidebarSubtitle: {
    color: chantierColors.muted,
    marginTop: 4,
    marginBottom: 14,
  },
  tableList: {
    gap: 8,
  },
  groupLabel: {
    color: chantierColors.muted,
    marginBottom: 8,
    marginTop: 4,
  },
  groupDivider: {
    marginVertical: 12,
    backgroundColor: chantierColors.border,
  },
  tableButton: {
    justifyContent: 'flex-start',
  },
  tableButtonContent: {
    justifyContent: 'flex-start',
    minHeight: 44,
  },
  logoutContainer: {
    paddingTop: 12,
  },
  mainArea: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    padding: 16,
    gap: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    zIndex: 2,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    color: chantierColors.danger,
    fontWeight: '700',
  },
  paneDisabled: {
    opacity: 0.6,
  },
  listPane: {
    flex: 0.8,
    minHeight: 0,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    padding: 12,
  },
  listScroll: {
    flex: 1,
    minHeight: 0,
  },
  detailsPane: {
    flex: 1.4,
    minHeight: 0,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 10,
    padding: 12,
  },
  detailsScroll: {
    flex: 1,
    minHeight: 0,
    marginTop: 12,
    ...(Platform.OS === 'web' ? { overflow: 'auto' } : {}),
  },
  detailsScrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 10,
  },
  rowItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowItemActive: {
    backgroundColor: chantierColors.background,
  },
  rowTitle: {
    color: chantierColors.text,
    fontWeight: '700',
  },
  rowSubtitle: {
    color: chantierColors.muted,
    marginTop: 2,
  },
  detailsCard: {
    backgroundColor: chantierColors.background,
    borderWidth: 1,
    borderColor: chantierColors.border,
  },
  detailsCardForm: {
    backgroundColor: chantierColors.background,
    borderWidth: 1,
    borderColor: chantierColors.border,
  },
  formTitle: {
    color: chantierColors.text,
    fontWeight: '700',
    marginBottom: 8,
  },
  formInput: {
    marginBottom: 10,
    backgroundColor: chantierColors.surface,
  },
  formInputMultiline: {
    minHeight: 100,
  },
  fieldWrapper: {
    marginBottom: 10,
  },
  fieldSection: {
    marginTop: 8,
    marginBottom: 10,
    gap: 8,
  },
  fieldSectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldHint: {
    color: chantierColors.muted,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 4,
  },
  selectButton: {
    justifyContent: 'flex-start',
  },
  selectButtonContent: {
    justifyContent: 'flex-start',
    minHeight: 46,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: chantierColors.border,
    borderRadius: 8,
    backgroundColor: chantierColors.surface,
    paddingHorizontal: 8,
    minHeight: 52,
  },
  checkboxLabel: {
    color: chantierColors.text,
    fontWeight: '600',
  },
  formError: {
    color: chantierColors.danger,
    fontWeight: '700',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    color: chantierColors.muted,
  },
  detailValue: {
    color: chantierColors.text,
    fontWeight: '600',
  },
  detailValueMultiline: {
    whiteSpace: 'pre-wrap',
  },
  detailSubTitle: {
    color: chantierColors.muted,
    marginTop: 6,
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: chantierColors.warning,
  },
});
