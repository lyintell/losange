'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleEditModal from '@/components/articles/ArticleEditModal';
import FacturationSummary from '@/components/chantiers/FacturationSummary';
import SectionCreateModal from '@/components/chantiers/SectionCreateModal';
import TvaToggle from '@/components/chantiers/TvaToggle';
import OuvrageEditModal from '@/components/ouvrages/OuvrageEditModal';
import AdminIcon from '@/components/ui/AdminIcon';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import { matchesArticleSearch } from '@/lib/articles/format';
import { formatRemiseDisplay, parseRemiseInput } from '@/lib/chantiers/remise';
import {
  DEFAULT_SECTION_NOM,
  isDefaultSectionNom,
  sortSectionsForSelection,
} from '@/lib/format/defaultSection';
import { formatDevisDimension, formatDevisUnite } from '@/lib/format/devisGrouping';
import { formatMontantNombre } from '@/lib/format/formatLigneMesures';
import { groupLignesByMetier } from '@/lib/format/groupLignesByMetier';
import { groupLignesBySection } from '@/lib/format/groupLignesBySection';
import {
  computeMontantLigneReleve,
  computePrixUnitaireAppliqueDefault,
  computeQuantiteLigneReleve,
  getRequiredCotesFromFormula,
} from '@/lib/format/ligneReleveCalcul';
import { computeReleveFacturation } from '@/lib/format/releveFacturation';
import { getLigneOuvrageNomPourDevis } from '@/lib/format/ouvrageNomDevis';
import { formatUniteChoiceLabel, matchesOuvrageSearch } from '@/lib/ouvrages/format';

function compareAlpha(left, right) {
  return String(left || '').localeCompare(String(right || ''), 'fr', { sensitivity: 'base' });
}

function matchesSectionSearch(section, search) {
  const term = String(search || '').trim().toLowerCase();
  if (!term) return true;
  return String(section?.nom || '').toLowerCase().includes(term);
}

function buildSectionTree(rows = []) {
  return groupLignesBySection(rows).map((section) => ({
    ...section,
    metierGroups: groupLignesByMetier(section.lignes),
  }));
}

function flattenSectionTree(sectionTree = []) {
  let ordre = 0;
  return sectionTree.flatMap((section, sectionIndex) => {
    const sectionId = section.sectionId === 'sans-section' ? null : section.sectionId;
    const metierGroups = section.metierGroups || groupLignesByMetier(section.lignes || []);
    return metierGroups.flatMap((metier, metierIndex) =>
      (metier.lignes || []).map((ligne) => ({
        ...ligne,
        section_id: sectionId,
        section_nom: section.sectionNom || DEFAULT_SECTION_NOM,
        section_ordre: sectionIndex,
        metier_id: ligne.metier_id || metier.metierId,
        metier_nom: ligne.metier_nom || metier.metierNom,
        metier_ordre: metierIndex,
        ordre: ordre++,
      }))
    );
  });
}

function newTempId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `temp-${crypto.randomUUID()}`;
  }
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNum(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function mapLigneToRow(ligne) {
  const nombre = Number(ligne.nombre) || 0;
  const quantite = Number(ligne.quantite) || 0;
  return {
    id: ligne.id,
    ouvrage_unite_id: ligne.ouvrage_unite_id,
    ouvrage_nom: getLigneOuvrageNomPourDevis(ligne),
    metier_id: ligne.metier_id || null,
    metier_nom: ligne.metier_nom || '',
    metier_ordre: Number(ligne.metier_ordre) || 0,
    ordre: Number(ligne.ordre) || 0,
    nombre,
    quantite: String(quantite),
    ind_dimension: ligne.ind_dimension,
    nom_unite: ligne.nom_unite,
    formule: ligne.formule || '',
    largeur: ligne.largeur,
    hauteur: ligne.hauteur,
    profondeur: ligne.profondeur,
    prix_unitaire_applique: String(ligne.prix_unitaire_applique ?? ''),
    prix_catalogue: ligne.prix_unitaire_catalogue ?? ligne.prix_unitaire ?? null,
    note_2: ligne.note_2 || '',
    section_id: ligne.section_id || null,
    section_nom: ligne.section_nom?.trim() || DEFAULT_SECTION_NOM,
    section_ordre: Number.isFinite(Number(ligne.section_ordre)) ? Number(ligne.section_ordre) : 0,
  };
}

function recomputeRow(row) {
  const nombre = parseNum(row.nombre) ?? 0;
  const largeur = parseNum(row.largeur);
  const hauteur = parseNum(row.hauteur);
  const profondeur = parseNum(row.profondeur);
  const indDimension = row.ind_dimension;
  const formule = row.formule || '';

  let quantite = nombre;
  if (Number(indDimension) === 1) {
    quantite = computeQuantiteLigneReleve({
      indDimension,
      formule,
      largeur,
      hauteur,
      profondeur,
      nombre,
    });
  }

  return {
    ...row,
    nombre,
    largeur,
    hauteur,
    profondeur,
    quantite: String(quantite),
  };
}

export default function DevisEditClient({
  mode = 'edit',
  chantier,
  releve = null,
  lignes = [],
  metiers = [],
  canEditRemise = false,
}) {
  const router = useRouter();
  const isCreate = mode === 'create';
  const searchWrapRef = useRef(null);
  const sectionWrapRef = useRef(null);

  const [rows, setRows] = useState(() => (lignes || []).map(mapLigneToRow));
  const [releveRemise, setReleveRemise] = useState(formatRemiseDisplay(releve?.remise));
  const [releveIndTva, setReleveIndTva] = useState(Number(releve?.ind_tva) === 1 ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState(null);
  const [notesModalRowId, setNotesModalRowId] = useState(null);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [formError, setFormError] = useState('');

  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [sectionSearch, setSectionSearch] = useState(DEFAULT_SECTION_NOM);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);

  const [selectedMetierId, setSelectedMetierId] = useState('');
  const [catalogKind, setCatalogKind] = useState('ouvrage'); // ouvrage | article
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedUniteId, setSelectedUniteId] = useState('');
  const [largeur, setLargeur] = useState('');
  const [hauteur, setHauteur] = useState('');
  const [profondeur, setProfondeur] = useState('');
  const [nombre, setNombre] = useState('1');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [note2, setNote2] = useState('');

  const [ouvrageModalOpen, setOuvrageModalOpen] = useState(false);
  const [articleModalOpen, setArticleModalOpen] = useState(false);

  const busy = saving || deleting;
  const selectedMetier = metiers.find((m) => m.id === selectedMetierId) || null;

  const selectedUnite = useMemo(() => {
    if (!selectedItem) return null;
    const unites = selectedItem.unites || [];
    if (!unites.length) return null;
    if (unites.length === 1) return unites[0];
    return unites.find((u) => u.ouvrage_unite_id === selectedUniteId) || null;
  }, [selectedItem, selectedUniteId]);

  const isDimension = Number(selectedUnite?.ind_dimension) === 1;
  const requiredCotes = useMemo(
    () => getRequiredCotesFromFormula(selectedUnite?.formule, isDimension ? 1 : 0),
    [selectedUnite?.formule, isDimension]
  );

  useEffect(() => {
    const onDocClick = (event) => {
      if (!searchWrapRef.current?.contains(event.target)) {
        setShowItemDropdown(false);
      }
      if (!sectionWrapRef.current?.contains(event.target)) {
        setShowSectionDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sections')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) throw new Error(data.error || 'Chargement sections impossible.');
        const list = sortSectionsForSelection(data.sections || []);
        setSections(list);
        setSelectedSection((current) => {
          if (current) return current;
          const fromRows = rows.find((row) => row.section_id);
          const fallback =
            (fromRows && list.find((section) => section.id === fromRows.section_id)) ||
            list.find((section) => isDefaultSectionNom(section.nom)) ||
            list[0] ||
            null;
          if (fallback) setSectionSearch(fallback.nom || DEFAULT_SECTION_NOM);
          return fallback;
        });
      })
      .catch((err) => {
        if (!cancelled) setFormError(err.message || 'Chargement sections impossible.');
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMetierId) {
      setCatalogItems([]);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    const endpoint =
      catalogKind === 'article'
        ? `/api/articles?metierId=${encodeURIComponent(selectedMetierId)}`
        : `/api/ouvrages?metierId=${encodeURIComponent(selectedMetierId)}`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.ok) throw new Error(data.error || 'Chargement impossible.');
        setCatalogItems(catalogKind === 'article' ? data.articles || [] : data.ouvrages || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogItems([]);
          setFormError(err.message || 'Chargement catalogue impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedMetierId, catalogKind]);

  useEffect(() => {
    if (!selectedItem) {
      setSelectedUniteId('');
      setPrixUnitaire('');
      return;
    }
    const unites = selectedItem.unites || [];
    if (unites.length === 1) {
      setSelectedUniteId(unites[0].ouvrage_unite_id);
    } else if (!unites.some((u) => u.ouvrage_unite_id === selectedUniteId)) {
      setSelectedUniteId('');
    }
  }, [selectedItem]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedUnite) {
      setPrixUnitaire('');
      return;
    }
    const l = parseNum(largeur);
    const h = parseNum(hauteur);
    const p = parseNum(profondeur);
    const pu = computePrixUnitaireAppliqueDefault({
      indDimension: selectedUnite.ind_dimension,
      prixUnitaire: selectedUnite.prix_unitaire,
      formule: selectedUnite.formule,
      largeur: l,
      hauteur: h,
      profondeur: p,
      nomUnite: selectedUnite.nom_unite,
    });
    setPrixUnitaire(String(pu ?? selectedUnite.prix_unitaire ?? ''));
  }, [selectedUnite, largeur, hauteur, profondeur]);

  const filteredItems = useMemo(() => {
    const matchFn = catalogKind === 'article' ? matchesArticleSearch : matchesOuvrageSearch;
    return (catalogItems || [])
      .filter((row) => matchFn(row, itemSearch, { includeMetier: false }))
      .sort((left, right) => compareAlpha(left?.nom, right?.nom));
  }, [catalogItems, itemSearch, catalogKind]);

  const filteredSections = useMemo(
    () => sortSectionsForSelection(sections).filter((section) => matchesSectionSearch(section, sectionSearch)),
    [sections, sectionSearch]
  );

  const sortedUnites = useMemo(
    () =>
      [...(selectedItem?.unites || [])].sort((left, right) =>
        compareAlpha(formatUniteChoiceLabel(left), formatUniteChoiceLabel(right))
      ),
    [selectedItem]
  );

  const previewQuantite = useMemo(() => {
    if (!selectedUnite) return null;
    const n = parseNum(nombre) ?? 0;
    if (!isDimension) return n;
    return computeQuantiteLigneReleve({
      indDimension: 1,
      formule: selectedUnite.formule,
      largeur: parseNum(largeur),
      hauteur: parseNum(hauteur),
      profondeur: parseNum(profondeur),
      nombre: n,
    });
  }, [selectedUnite, isDimension, nombre, largeur, hauteur, profondeur]);

  const resetCotes = () => {
    setLargeur('');
    setHauteur('');
    setProfondeur('');
    setNombre('1');
    setNote2('');
    setFormError('');
  };

  const resetForm = ({ keepMetier = true } = {}) => {
    if (!keepMetier) setSelectedMetierId('');
    setSelectedItem(null);
    setItemSearch('');
    setSelectedUniteId('');
    setPrixUnitaire('');
    resetCotes();
    setShowItemDropdown(false);
  };

  const applyCreatedCatalogItem = (created, kind) => {
    setCatalogKind(kind);
    setSelectedItem(created);
    setItemSearch(created.nom || '');
    const unites = created.unites || [];
    if (unites.length === 1) {
      setSelectedUniteId(unites[0].ouvrage_unite_id);
    } else {
      setSelectedUniteId('');
    }
    resetCotes();
    setCatalogItems((prev) => {
      const without = prev.filter((row) => row.id !== created.id);
      return [created, ...without];
    });
  };

  const handleAddLine = () => {
    setFormError('');
    if (!selectedMetierId) {
      setFormError('Choisissez un métier.');
      return;
    }
    if (!selectedItem || !selectedUnite) {
      setFormError(catalogKind === 'article' ? 'Choisissez un article.' : 'Choisissez un ouvrage.');
      return;
    }

    const n = parseNum(nombre);
    if (n == null || n <= 0) {
      setFormError('Nombre invalide.');
      return;
    }

    if (isDimension) {
      if (requiredCotes.needsLargeur && (parseNum(largeur) == null || parseNum(largeur) <= 0)) {
        setFormError('Largeur requise.');
        return;
      }
      if (requiredCotes.needsHauteur && (parseNum(hauteur) == null || parseNum(hauteur) <= 0)) {
        setFormError('Hauteur requise.');
        return;
      }
      if (requiredCotes.needsProfondeur && (parseNum(profondeur) == null || parseNum(profondeur) <= 0)) {
        setFormError('Épaisseur requise.');
        return;
      }
    }

    const l = isDimension && requiredCotes.needsLargeur ? parseNum(largeur) : null;
    const h = isDimension && requiredCotes.needsHauteur ? parseNum(hauteur) : null;
    const p = isDimension && requiredCotes.needsProfondeur ? parseNum(profondeur) : null;
    const quantite = isDimension
      ? computeQuantiteLigneReleve({
          indDimension: 1,
          formule: selectedUnite.formule,
          largeur: l,
          hauteur: h,
          profondeur: p,
          nombre: n,
        })
      : n;

    const pu =
      parseNum(prixUnitaire) ??
      computePrixUnitaireAppliqueDefault({
        indDimension: selectedUnite.ind_dimension,
        prixUnitaire: selectedUnite.prix_unitaire,
        formule: selectedUnite.formule,
        largeur: l,
        hauteur: h,
        profondeur: p,
        nomUnite: selectedUnite.nom_unite,
      });

    setRows((prev) => {
      const metierId = selectedMetierId || selectedItem.metier_id || selectedMetier?.nom || '';
      const metierNom = selectedMetier?.nom || selectedItem.metier_nom || '';
      const sameMetier = prev.find(
        (row) => (row.metier_id || row.metier_nom) === (metierId || metierNom)
      );
      const sectionId = selectedSection?.id || null;
      const sectionNom = selectedSection?.nom || DEFAULT_SECTION_NOM;
      const sameSectionRow = prev.find((row) => (row.section_id || null) === sectionId);
      const sectionOrdre = Number.isFinite(Number(sameSectionRow?.section_ordre))
        ? Number(sameSectionRow.section_ordre)
        : prev.reduce((max, row) => Math.max(max, Number(row.section_ordre) || 0), -1) + 1;
      const maxMetierOrdre = prev
        .filter((row) => (row.section_id || null) === sectionId)
        .reduce((max, row) => Math.max(max, Number(row.metier_ordre) || 0), -1);
      const maxOrdre = prev.reduce((max, row) => Math.max(max, Number(row.ordre) || 0), -1);

      return [
        ...prev,
        {
          id: newTempId(),
          ouvrage_unite_id: selectedUnite.ouvrage_unite_id,
          ouvrage_nom: selectedItem.nom_devis || selectedItem.nom,
          metier_id: selectedMetierId || selectedItem.metier_id || null,
          metier_nom: metierNom,
          metier_ordre: sameMetier ? Number(sameMetier.metier_ordre) || 0 : maxMetierOrdre + 1,
          ordre: maxOrdre + 1,
          nombre: n,
          quantite: String(quantite),
          ind_dimension: selectedUnite.ind_dimension,
          nom_unite: selectedUnite.nom_unite,
          formule: selectedUnite.formule || '',
          largeur: l,
          hauteur: h,
          profondeur: p,
          prix_unitaire_applique: String(pu ?? 0),
          prix_catalogue: selectedUnite.prix_unitaire,
          note_2: note2.trim(),
          section_id: sectionId,
          section_nom: sectionNom,
          section_ordre: sectionOrdre,
        },
      ];
    });

    resetCotes();
  };

  const updateRow = (id, patch) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        // Édition directe Qté / P.U / note_2 : ne pas recalculer depuis les cotes.
        if ('quantite' in patch || 'prix_unitaire_applique' in patch || 'note_2' in patch) {
          const next = { ...row, ...patch };
          if ('quantite' in patch) {
            const qty = parseNum(patch.quantite);
            if (qty != null) {
              next.nombre = qty;
            }
          }
          return next;
        }

        return recomputeRow({ ...row, ...patch });
      })
    );
  };

  const duplicateRow = (id) => {
    setRows((prev) => {
      const tree = buildSectionTree(prev);
      for (let sectionIndex = 0; sectionIndex < tree.length; sectionIndex += 1) {
        const section = tree[sectionIndex];
        for (let metierIndex = 0; metierIndex < section.metierGroups.length; metierIndex += 1) {
          const metier = section.metierGroups[metierIndex];
          const lineIndex = metier.lignes.findIndex((ligne) => ligne.id === id);
          if (lineIndex < 0) continue;
          const nextLignes = [...metier.lignes];
          nextLignes.splice(lineIndex + 1, 0, { ...metier.lignes[lineIndex], id: newTempId() });
          const nextMetiers = [...section.metierGroups];
          nextMetiers[metierIndex] = { ...metier, lignes: nextLignes };
          const nextTree = [...tree];
          nextTree[sectionIndex] = { ...section, metierGroups: nextMetiers };
          return flattenSectionTree(nextTree);
        }
      }
      return prev;
    });
  };

  const moveSection = (sectionId, direction) => {
    setRows((prev) => {
      const tree = buildSectionTree(prev);
      const index = tree.findIndex((section) => section.sectionId === sectionId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= tree.length) return prev;
      const next = [...tree];
      [next[index], next[target]] = [next[target], next[index]];
      return flattenSectionTree(next);
    });
  };

  const moveMetier = (sectionId, metierId, direction) => {
    setRows((prev) => {
      const tree = buildSectionTree(prev);
      const sectionIndex = tree.findIndex((section) => section.sectionId === sectionId);
      if (sectionIndex < 0) return prev;
      const section = tree[sectionIndex];
      const index = section.metierGroups.findIndex((group) => group.metierId === metierId);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= section.metierGroups.length) return prev;
      const nextMetiers = [...section.metierGroups];
      [nextMetiers[index], nextMetiers[target]] = [nextMetiers[target], nextMetiers[index]];
      const nextTree = [...tree];
      nextTree[sectionIndex] = { ...section, metierGroups: nextMetiers };
      return flattenSectionTree(nextTree);
    });
  };

  const moveLigne = (ligneId, direction) => {
    setRows((prev) => {
      const tree = buildSectionTree(prev);
      for (let sectionIndex = 0; sectionIndex < tree.length; sectionIndex += 1) {
        const section = tree[sectionIndex];
        for (let metierIndex = 0; metierIndex < section.metierGroups.length; metierIndex += 1) {
          const metier = section.metierGroups[metierIndex];
          const lineIndex = metier.lignes.findIndex((ligne) => ligne.id === ligneId);
          if (lineIndex < 0) continue;
          const target = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
          if (target < 0 || target >= metier.lignes.length) return prev;
          const nextLignes = [...metier.lignes];
          [nextLignes[lineIndex], nextLignes[target]] = [nextLignes[target], nextLignes[lineIndex]];
          const nextMetiers = [...section.metierGroups];
          nextMetiers[metierIndex] = { ...metier, lignes: nextLignes };
          const nextTree = [...tree];
          nextTree[sectionIndex] = { ...section, metierGroups: nextMetiers };
          return flattenSectionTree(nextTree);
        }
      }
      return prev;
    });
  };

  const sectionTree = useMemo(() => buildSectionTree(rows), [rows]);

  const lignesBrutHt = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const pu = parseNum(row.prix_unitaire_applique) || 0;
        const qty = parseNum(row.quantite) || 0;
        const nombre = parseNum(row.nombre) ?? qty;
        return (
          sum +
          computeMontantLigneReleve({
            prixUnitaireApplique: pu,
            quantite: qty,
            nombre,
            indDimension: row.ind_dimension,
            nomUnite: row.nom_unite,
          })
        );
      }, 0),
    [rows]
  );

  const facturation = useMemo(
    () =>
      computeReleveFacturation({
        lignesMontantTotal: lignesBrutHt,
        remise: parseRemiseInput(releveRemise),
        indTva: releveIndTva,
        tvaTaux: releve?.tva_facture,
      }),
    [lignesBrutHt, releveRemise, releveIndTva, releve?.tva_facture]
  );

  const buildPayloadLignes = () =>
    flattenSectionTree(buildSectionTree(rows)).map((row) => {
      const qty = parseNum(row.quantite) || 0;
      const nombre = parseNum(row.nombre) ?? qty;
      return {
        id: String(row.id).startsWith('temp-') ? undefined : row.id,
        ouvrage_unite_id: row.ouvrage_unite_id,
        nombre,
        quantite: qty,
        largeur: row.largeur,
        hauteur: row.hauteur,
        profondeur: row.profondeur,
        prix_unitaire_applique: parseNum(row.prix_unitaire_applique) || 0,
        ind_dimension: row.ind_dimension,
        nom_unite: row.nom_unite,
        formule: row.formule,
        note_2: row.note_2?.trim() || null,
        section_id: row.section_id || null,
        ordre: Number(row.ordre) || 0,
        metier_ordre: Number(row.metier_ordre) || 0,
      };
    });

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const payloadLignes = buildPayloadLignes();
      const body = { lignes: payloadLignes };
      if (canEditRemise) {
        body.remise = parseRemiseInput(releveRemise);
        body.ind_tva = Number(releveIndTva) === 1 ? 1 : 0;
      }

      if (isCreate) {
        const response = await fetch(`/api/chantiers/${chantier.id}/releves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || 'Création impossible.');
        }
        router.push(`/chantiers/${chantier.id}/devis/${result.releve.id}`);
        router.refresh();
        return;
      }

      const response = await fetch(`/api/chantiers/${chantier.id}/releves/${releve.id}/lignes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Enregistrement impossible.');
      }

      router.push(`/chantiers/${chantier.id}/devis/${releve.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isCreate) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch(`/api/chantiers/${chantier.id}/releves/${releve.id}`, {
        method: 'DELETE',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Suppression impossible.');
      }
      setConfirmOpen(false);
      router.push(`/chantiers/${chantier.id}`);
      router.refresh();
    } catch (err) {
      setDeleteError(err.message || 'Suppression impossible.');
    } finally {
      setDeleting(false);
    }
  };

  const createStub = {
    metier_id: selectedMetierId,
    metier_nom: selectedMetier?.nom || '',
    unites: [],
  };

  return (
    <div className="devis-edit">
      <section className="devis-line-form">
        <div className="devis-line-form-toolbar">
          <div className="search-field search-field--dropdown" ref={sectionWrapRef}>
            <label className="search-field-label" htmlFor="devis-section-search">
              Section
            </label>
            <div className="devis-line-form-toolbar-row">
              <input
                id="devis-section-search"
                type="search"
                className="search-field-input"
                placeholder="Rechercher une section…"
                value={sectionSearch}
                disabled={busy}
                onFocus={() => setShowSectionDropdown(true)}
                onChange={(event) => {
                  setSectionSearch(event.target.value);
                  setShowSectionDropdown(true);
                }}
              />
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => setSectionModalOpen(true)}
              >
                Créer section
              </button>
            </div>
            {showSectionDropdown ? (
              <div className="search-dropdown">
                {filteredSections.length === 0 ? (
                  <p className="search-dropdown-empty">Aucun résultat</p>
                ) : (
                  filteredSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`search-dropdown-item ${
                        selectedSection?.id === section.id ? 'search-result-button--selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedSection(section);
                        setSectionSearch(section.nom || '');
                        setShowSectionDropdown(false);
                      }}
                    >
                      <span>{section.nom}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <label className="field-label" htmlFor="devis-metier">
            Métier
          </label>
          <div className="devis-line-form-toolbar-row">
            <select
              id="devis-metier"
              className="field-input"
              value={selectedMetierId}
              onChange={(event) => {
                const next = event.target.value;
                setSelectedMetierId(next);
                setSelectedItem(null);
                setItemSearch('');
                setSelectedUniteId('');
                setPrixUnitaire('');
                resetCotes();
                setShowItemDropdown(false);
              }}
              disabled={busy}
            >
              <option value="">— Choisir —</option>
              {[...metiers]
                .sort((left, right) => compareAlpha(left?.nom, right?.nom))
                .map((metier) => (
                  <option key={metier.id} value={metier.id}>
                    {metier.nom}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !selectedMetierId}
              onClick={() => setOuvrageModalOpen(true)}
            >
              Créer ouvrage
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !selectedMetierId}
              onClick={() => setArticleModalOpen(true)}
            >
              Créer article
            </button>
          </div>
        </div>

        <div className="devis-line-form-tabs">
          <button
            type="button"
            className={`tab-button ${catalogKind === 'ouvrage' ? 'tab-button--active' : ''}`}
            onClick={() => {
              setCatalogKind('ouvrage');
              setSelectedItem(null);
              setItemSearch('');
              setSelectedUniteId('');
              resetCotes();
            }}
            disabled={busy}
          >
            Ouvrage
          </button>
          <button
            type="button"
            className={`tab-button ${catalogKind === 'article' ? 'tab-button--active' : ''}`}
            onClick={() => {
              setCatalogKind('article');
              setSelectedItem(null);
              setItemSearch('');
              setSelectedUniteId('');
              resetCotes();
            }}
            disabled={busy}
          >
            Article
          </button>
        </div>

        <div className="search-field search-field--dropdown" ref={searchWrapRef}>
          <label className="search-field-label" htmlFor="devis-item-search">
            {catalogKind === 'article' ? 'Article' : 'Ouvrage'}
          </label>
          <input
            id="devis-item-search"
            type="search"
            className="search-field-input"
            placeholder={
              !selectedMetierId
                ? 'Choisissez d’abord un métier'
                : catalogLoading
                  ? 'Chargement…'
                  : 'Rechercher…'
            }
            value={itemSearch}
            disabled={busy || !selectedMetierId || catalogLoading}
            onFocus={() => setShowItemDropdown(true)}
            onChange={(event) => {
              setItemSearch(event.target.value);
              setSelectedItem(null);
              setSelectedUniteId('');
              setShowItemDropdown(true);
            }}
          />
          {showItemDropdown && selectedMetierId ? (
            <div className="search-dropdown">
              {filteredItems.length === 0 ? (
                <p className="search-dropdown-empty">Aucun résultat</p>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`search-dropdown-item ${
                      selectedItem?.id === item.id ? 'search-result-button--selected' : ''
                    }`}
                    onClick={() => {
                      setSelectedItem(item);
                      setItemSearch(item.nom || '');
                      setShowItemDropdown(false);
                      resetCotes();
                    }}
                  >
                    <span>{item.nom}</span>
                    {item.fournisseur_nom ? (
                      <span className="search-dropdown-meta">{item.fournisseur_nom}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {selectedItem ? (
          <>
            {sortedUnites.length > 1 ? (
              <>
                <label className="field-label" htmlFor="devis-unite">
                  Unité
                </label>
                <select
                  id="devis-unite"
                  className="field-input"
                  value={selectedUniteId}
                  onChange={(event) => setSelectedUniteId(event.target.value)}
                  disabled={busy}
                >
                  <option value="">— Choisir —</option>
                  {sortedUnites.map((unite) => (
                    <option key={unite.ouvrage_unite_id} value={unite.ouvrage_unite_id}>
                      {formatUniteChoiceLabel(unite)}
                    </option>
                  ))}
                </select>
              </>
            ) : selectedUnite ? (
              <p className="devis-line-form-unite-locked">
                Unité : <strong>{formatUniteChoiceLabel(selectedUnite)}</strong>
              </p>
            ) : null}

            {selectedUnite ? (
              <div className="devis-line-form-cotes">
                {isDimension && requiredCotes.needsLargeur ? (
                  <div>
                    <label className="field-label" htmlFor="devis-largeur">
                      Largeur (cm)
                    </label>
                    <input
                      id="devis-largeur"
                      type="text"
                      inputMode="decimal"
                      className="field-input"
                      value={largeur}
                      onChange={(event) => setLargeur(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                ) : null}
                {isDimension && requiredCotes.needsHauteur ? (
                  <div>
                    <label className="field-label" htmlFor="devis-hauteur">
                      Hauteur (cm)
                    </label>
                    <input
                      id="devis-hauteur"
                      type="text"
                      inputMode="decimal"
                      className="field-input"
                      value={hauteur}
                      onChange={(event) => setHauteur(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                ) : null}
                {isDimension && requiredCotes.needsProfondeur ? (
                  <div>
                    <label className="field-label" htmlFor="devis-profondeur">
                      Épaisseur (cm)
                    </label>
                    <input
                      id="devis-profondeur"
                      type="text"
                      inputMode="decimal"
                      className="field-input"
                      value={profondeur}
                      onChange={(event) => setProfondeur(event.target.value)}
                      disabled={busy}
                    />
                  </div>
                ) : null}
                <div>
                  <label className="field-label" htmlFor="devis-nombre">
                    {isDimension ? 'Nombre' : 'Qté'}
                  </label>
                  <input
                    id="devis-nombre"
                    type="text"
                    inputMode="decimal"
                    className="field-input"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="devis-pu">
                    P.U
                  </label>
                  <input
                    id="devis-pu"
                    type="text"
                    inputMode="decimal"
                    className="field-input"
                    value={prixUnitaire}
                    onChange={(event) => setPrixUnitaire(event.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>
            ) : null}

            {selectedUnite ? (
              <>
                <label className="field-label" htmlFor="devis-note2">
                  Note devis
                </label>
                <input
                  id="devis-note2"
                  type="text"
                  className="field-input"
                  value={note2}
                  onChange={(event) => setNote2(event.target.value)}
                  disabled={busy}
                  placeholder="Optionnel — affichée sous l’ouvrage"
                />
              </>
            ) : null}

            {selectedUnite && previewQuantite != null ? (
              <p className="devis-line-form-preview">
                Qté = {previewQuantite} {selectedUnite.nom_unite || ''}
              </p>
            ) : null}
          </>
        ) : null}

        {formError ? <p className="field-error">{formError}</p> : null}

        <div className="devis-line-form-actions">
          <button
            type="button"
            className="primary-button icon-only-button devis-add-line-button"
            onClick={handleAddLine}
            disabled={busy || !selectedUnite}
            title="Ajouter la ligne"
            aria-label="Ajouter la ligne"
          >
            <AdminIcon name="plus" size={22} />
          </button>
          <button
            type="button"
            className="secondary-button icon-only-button"
            onClick={() => resetForm({ keepMetier: true })}
            disabled={busy}
            title="Réinitialiser le formulaire"
            aria-label="Réinitialiser le formulaire"
          >
            <AdminIcon name="refresh" size={18} />
          </button>
        </div>
      </section>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Métier</th>
              <th>Designation</th>
              <th className="num">Qté</th>
              <th className="num unite">U</th>
              <th className="num">P.U</th>
              <th className="num">Montant</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  Aucune ligne. Utilisez le formulaire ci-dessus.
                </td>
              </tr>
            ) : (
              sectionTree.map((sectionGroup, sectionIndex) => (
                <Fragment key={sectionGroup.sectionId}>
                  <tr className="devis-section-header-row">
                    <td colSpan={6}>
                      <div className="devis-section-header">
                        <span className="devis-section-header-label">
                          {isDefaultSectionNom(sectionGroup.sectionNom)
                            ? DEFAULT_SECTION_NOM
                            : sectionGroup.sectionNom}
                        </span>
                        <div className="devis-order-arrows">
                          <button
                            type="button"
                            className="secondary-button icon-only-button"
                            onClick={() => moveSection(sectionGroup.sectionId, 'up')}
                            disabled={busy || sectionIndex === 0}
                            title="Monter la section"
                            aria-label="Monter la section"
                          >
                            <AdminIcon name="chevron-up" size={16} />
                          </button>
                          <button
                            type="button"
                            className="secondary-button icon-only-button"
                            onClick={() => moveSection(sectionGroup.sectionId, 'down')}
                            disabled={busy || sectionIndex >= sectionTree.length - 1}
                            title="Descendre la section"
                            aria-label="Descendre la section"
                          >
                            <AdminIcon name="chevron-down" size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td />
                  </tr>
                  {sectionGroup.metierGroups.map((metierGroup, metierIndex) => (
                    <Fragment key={`${sectionGroup.sectionId}-${metierGroup.metierId}`}>
                      <tr className="devis-metier-header-row">
                        <td colSpan={6}>
                          <div className="devis-metier-header">
                            <span className="devis-metier-header-label">{metierGroup.metierNom}</span>
                            <div className="devis-order-arrows">
                              <button
                                type="button"
                                className="secondary-button icon-only-button"
                                onClick={() =>
                                  moveMetier(sectionGroup.sectionId, metierGroup.metierId, 'up')
                                }
                                disabled={busy || metierIndex === 0}
                                title="Monter le métier"
                                aria-label="Monter le métier"
                              >
                                <AdminIcon name="chevron-up" size={16} />
                              </button>
                              <button
                                type="button"
                                className="secondary-button icon-only-button"
                                onClick={() =>
                                  moveMetier(sectionGroup.sectionId, metierGroup.metierId, 'down')
                                }
                                disabled={busy || metierIndex >= sectionGroup.metierGroups.length - 1}
                                title="Descendre le métier"
                                aria-label="Descendre le métier"
                              >
                                <AdminIcon name="chevron-down" size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td />
                      </tr>
                      {metierGroup.lignes.map((row, lineIndex) => {
                        const dimension = formatDevisDimension(row);
                        const uniteLabel = formatDevisUnite(row) || row.nom_unite || '';
                        const pu = parseNum(row.prix_unitaire_applique) || 0;
                        const qty = parseNum(row.quantite) || 0;
                        const nombre = parseNum(row.nombre) ?? qty;
                        const montant = computeMontantLigneReleve({
                          prixUnitaireApplique: pu,
                          quantite: qty,
                          nombre,
                          indDimension: row.ind_dimension,
                          nomUnite: row.nom_unite,
                        });
                        const hasNoteDevis = Boolean(row.note_2?.trim());

                        return (
                          <tr key={row.id}>
                            <td className="devis-metier-cell-muted" />
                            <td>
                              <div className="devis-edit-designation">
                                <p className="devis-ouvrage">{row.ouvrage_nom}</p>
                                {hasNoteDevis ? (
                                  <p className="devis-ouvrage-note2">({row.note_2.trim()})</p>
                                ) : null}
                                {dimension ? <p className="devis-dimension">{dimension}</p> : null}
                              </div>
                            </td>
                            <td className="num">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="inline-number-input"
                                value={row.quantite}
                                onChange={(event) =>
                                  updateRow(row.id, { quantite: event.target.value })
                                }
                                disabled={busy}
                                aria-label="Quantité"
                              />
                            </td>
                            <td className="num unite">{uniteLabel}</td>
                            <td className="num">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="inline-number-input"
                                value={row.prix_unitaire_applique}
                                onChange={(event) =>
                                  updateRow(row.id, { prix_unitaire_applique: event.target.value })
                                }
                                disabled={busy}
                              />
                            </td>
                            <td className="num">{formatMontantNombre(montant)}</td>
                            <td>
                              <div className="devis-row-actions">
                                <div className="devis-order-arrows">
                                  <button
                                    type="button"
                                    className="secondary-button icon-only-button"
                                    onClick={() => moveLigne(row.id, 'up')}
                                    disabled={busy || lineIndex === 0}
                                    title="Monter la ligne"
                                    aria-label="Monter la ligne"
                                  >
                                    <AdminIcon name="chevron-up" size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button icon-only-button"
                                    onClick={() => moveLigne(row.id, 'down')}
                                    disabled={busy || lineIndex >= metierGroup.lignes.length - 1}
                                    title="Descendre la ligne"
                                    aria-label="Descendre la ligne"
                                  >
                                    <AdminIcon name="chevron-down" size={16} />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className="secondary-button icon-only-button"
                                  onClick={() => setNotesModalRowId(row.id)}
                                  disabled={busy}
                                  title="Note devis"
                                  aria-label="Note devis"
                                >
                                  <AdminIcon name="note-outline" size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button icon-only-button"
                                  onClick={() => duplicateRow(row.id)}
                                  disabled={busy}
                                  title="Dupliquer"
                                  aria-label="Dupliquer"
                                >
                                  <AdminIcon name="content-copy" size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button icon-only-button"
                                  onClick={() => setRemoveConfirmId(row.id)}
                                  disabled={busy}
                                  title="Effacer"
                                  aria-label="Effacer"
                                >
                                  <AdminIcon name="delete" size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEditRemise ? (
        <section className="devis-edit-facturation">
          <label className="field-label" htmlFor="devis-remise">
            Remise
          </label>
          <input
            id="devis-remise"
            type="text"
            inputMode="decimal"
            className="field-input devis-edit-remise-input"
            value={releveRemise}
            onChange={(event) => setReleveRemise(event.target.value)}
            placeholder="0"
            disabled={busy}
          />
          <p className="devis-edit-section-title">TVA</p>
          <TvaToggle value={releveIndTva} onChange={setReleveIndTva} disabled={busy} />
          <FacturationSummary facturation={facturation} showTva={Number(releveIndTva) === 1} />
        </section>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}

      <div className="document-actions document-actions--with-delete">
        {!isCreate ? (
          <button
            type="button"
            className="secondary-button icon-text-button"
            onClick={() => {
              setDeleteError('');
              setConfirmOpen(true);
            }}
            disabled={busy}
          >
            <AdminIcon name="delete" size={18} />
            <span>Supprimer</span>
          </button>
        ) : (
          <span />
        )}
        <div className="document-actions-end">
          <button
            type="button"
            className="secondary-button icon-text-button"
            onClick={() => router.back()}
            disabled={busy}
          >
            <AdminIcon name="close" size={18} />
            <span>Annuler</span>
          </button>
          <button
            type="button"
            className="primary-button icon-text-button"
            onClick={handleSave}
            disabled={busy}
          >
            <AdminIcon name="content-save" size={18} />
            <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        title="Supprimer le devis"
        message="Supprimer ce devis (relevé) et ses lignes ? Cette action est définitive."
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteModal
        open={Boolean(removeConfirmId)}
        title="Supprimer la ligne"
        message="Retirer cette ligne du devis ?"
        deleting={false}
        error=""
        onCancel={() => setRemoveConfirmId(null)}
        onConfirm={() => {
          setRows((prev) => prev.filter((row) => row.id !== removeConfirmId));
          setRemoveConfirmId(null);
        }}
      />

      {notesModalRowId ? (
        <div
          className="admin-modal-backdrop"
          onClick={busy ? undefined : () => setNotesModalRowId(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="devis-note-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal-header">
              <h3 id="devis-note-modal-title" className="admin-modal-title">
                Note devis
              </h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setNotesModalRowId(null)}
                disabled={busy}
              >
                ×
              </button>
            </div>
            <div className="admin-modal-form">
              <label className="field-label" htmlFor="devis-row-note2">
                Note devis
              </label>
              <textarea
                id="devis-row-note2"
                className="field-input"
                rows={4}
                value={rows.find((row) => row.id === notesModalRowId)?.note_2 || ''}
                onChange={(event) =>
                  updateRow(notesModalRowId, { note_2: event.target.value })
                }
                disabled={busy}
                placeholder="Note affichée sous l’ouvrage sur le devis…"
              />
              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="primary-button icon-text-button"
                  onClick={() => setNotesModalRowId(null)}
                  disabled={busy}
                >
                  <AdminIcon name="check" size={18} />
                  <span>Fermer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <OuvrageEditModal
        open={ouvrageModalOpen}
        mode="create"
        ouvrage={createStub}
        onClose={() => setOuvrageModalOpen(false)}
        onSaved={(created) => applyCreatedCatalogItem(created, 'ouvrage')}
      />

      <ArticleEditModal
        open={articleModalOpen}
        mode="create"
        article={createStub}
        onClose={() => setArticleModalOpen(false)}
        onSaved={(created) => applyCreatedCatalogItem(created, 'article')}
      />

      <SectionCreateModal
        open={sectionModalOpen}
        busy={busy}
        onClose={() => setSectionModalOpen(false)}
        onCreated={(created) => {
          setSections((prev) =>
            sortSectionsForSelection([...prev.filter((row) => row.id !== created.id), created])
          );
          setSelectedSection(created);
          setSectionSearch(created.nom || '');
          setShowSectionDropdown(false);
        }}
      />
    </div>
  );
}
