import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import LigneNoteReadModal from '../components/terrain/LigneNoteReadModal';
import { LignesReleveGroupedSections } from '../components/terrain/LignesReleveGroupedList';
import { FlowActionFab, FlowSmallFab, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import {
  getEntrepriseByIdLocal,
  getLignesByChantierLocal,
  updateChantierStatusLocal,
  updateLigneReleveIndCompleteLocal,
} from '../db/querries';
import { generateDevisPdfFile, downloadDevisPdf, shareDevisPdf } from '../utils/devisExport';
import { CHANTIER_STATUS_DEVIS } from '../utils/chantierStatus';
import { chantierColors } from '../styles/theme';

const DEVIS_MULTI_PRESS_DELAY_MS = 350;

export default function ChantierDetails({ chantier, entrepriseId = null, onModify, onChantierUpdated }) {
  const [loading, setLoading] = useState(false);
  const [lignes, setLignes] = useState([]);
  const [showPrices, setShowPrices] = useState(false);
  const [exportOverlayVisible, setExportOverlayVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [noteModal, setNoteModal] = useState({ visible: false, note: '', ouvrageNom: '' });

  const devisPressCountRef = useRef(0);
  const devisPressTimerRef = useRef(null);

  const loadLignes = useCallback(async () => {
    if (!chantier?.id) return;
    try {
      setLoading(true);
      const data = await getLignesByChantierLocal(chantier.id);
      setLignes(data || []);
    } catch (error) {
      console.error('Erreur chargement lignes chantier:', error);
      setLignes([]);
    } finally {
      setLoading(false);
    }
  }, [chantier?.id]);

  useEffect(() => {
    loadLignes();
  }, [loadLignes]);

  useEffect(
    () => () => {
      if (devisPressTimerRef.current) clearTimeout(devisPressTimerRef.current);
    },
    []
  );

  const handleLignePress = (ligne) => {
    if (!ligne?.note?.trim()) return;
    setNoteModal({
      visible: true,
      note: ligne.note,
      ouvrageNom: ligne.ouvrage_nom || '',
    });
  };

  const handleToggleComplete = async (ligne) => {
    const nextValue = Number(ligne.ind_complete) === 1 ? 0 : 1;
    try {
      await updateLigneReleveIndCompleteLocal(ligne.id, nextValue);
      setLignes((prev) =>
        prev.map((item) => (item.id === ligne.id ? { ...item, ind_complete: nextValue } : item))
      );
    } catch (error) {
      console.error('Erreur mise a jour ind_complete:', error);
    }
  };

  const handleDevisPress = () => {
    devisPressCountRef.current += 1;
    if (devisPressTimerRef.current) clearTimeout(devisPressTimerRef.current);
    devisPressTimerRef.current = setTimeout(() => {
      const pressCount = devisPressCountRef.current;
      devisPressCountRef.current = 0;
      devisPressTimerRef.current = null;

      if (pressCount >= 2) {
        if (!lignes.length) {
          Alert.alert('Devis', 'Aucune dimension a inclure dans le devis.');
          return;
        }
        setShowPrices(true);
        setExportOverlayVisible(true);
      } else if (pressCount === 1) {
        setShowPrices((prev) => !prev);
      }
    }, DEVIS_MULTI_PRESS_DELAY_MS);
  };

  const markChantierAsDevis = async () => {
    if (!chantier?.id || chantier.status === CHANTIER_STATUS_DEVIS) return;

    try {
      await updateChantierStatusLocal(chantier.id, CHANTIER_STATUS_DEVIS);
      onChantierUpdated?.({ ...chantier, status: CHANTIER_STATUS_DEVIS });
    } catch (error) {
      console.error('Erreur mise a jour status devis:', error);
    }
  };

  const runDevisDownload = async () => {
    if (exporting) return;
    if (!lignes.length) {
      Alert.alert('Devis', 'Aucune dimension a inclure dans le devis.');
      return;
    }

    try {
      setExporting(true);
      const entreprise = await getEntrepriseByIdLocal(entrepriseId);
      const uri = await generateDevisPdfFile({ entreprise, chantier, lignes });
      const result = await downloadDevisPdf(uri, chantier);
      await markChantierAsDevis();
      setExportOverlayVisible(false);
      Alert.alert(
        'Devis enregistre',
        `${result.fileName}\nDossier : ${result.locationLabel}`
      );
    } catch (error) {
      console.error('Erreur telechargement devis:', error);
      Alert.alert('Erreur', error.message || 'Impossible d enregistrer le devis.');
    } finally {
      setExporting(false);
    }
  };

  const runDevisWhatsApp = async () => {
    if (exporting) return;
    if (!lignes.length) {
      Alert.alert('Devis', 'Aucune dimension a inclure dans le devis.');
      return;
    }

    try {
      setExporting(true);
      const entreprise = await getEntrepriseByIdLocal(entrepriseId);
      const uri = await generateDevisPdfFile({ entreprise, chantier, lignes });
      await shareDevisPdf(uri, 'Partager le devis sur WhatsApp');
      await markChantierAsDevis();
      setExportOverlayVisible(false);
    } catch (error) {
      console.error('Erreur partage devis:', error);
      Alert.alert('Erreur', error.message || 'Impossible de partager le devis.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {chantier?.nom || 'Detail Chantier'}
        </Text>
        <Text variant="bodyMedium" style={styles.subTitle}>
          Client: {chantier?.client_nom || 'Non renseigne'}
        </Text>
      </View>

      <LignesReleveGroupedSections
        lignes={lignes}
        variant="details"
        showPrices={showPrices}
        onLignePress={handleLignePress}
        onLigneDoublePress={handleToggleComplete}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLignes} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: getFabColumnPadding(1) + 24 }]}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune dimension enregistree pour ce chantier.</Text>
            </View>
          ) : null
        }
      />

      <FlowActionFab
        icon="file-document"
        color={showPrices ? '#0F3D9E' : '#1D4ED8'}
        smallCountBelow={1}
        onPress={handleDevisPress}
      />
      <FlowSmallFab
        icon="pencil"
        tierFromBottom={0}
        color="#FACC15"
        iconColor="#000000"
        onPress={() => onModify?.(chantier, lignes)}
      />

      {exportOverlayVisible ? (
        <View style={styles.exportOverlay}>
          <Pressable style={styles.overlayBackdrop} onPress={() => !exporting && setExportOverlayVisible(false)} />
          <View style={styles.exportActions} pointerEvents="box-none">
            <Button
              mode="contained"
              icon="download"
              buttonColor="#1D4ED8"
              loading={exporting}
              disabled={exporting}
              onPress={runDevisDownload}
              style={styles.exportButton}
              contentStyle={styles.exportButtonContent}
            >
              Telecharger
            </Button>
            <Button
              mode="contained"
              icon="whatsapp"
              buttonColor="#25D366"
              textColor="#FFFFFF"
              loading={exporting}
              disabled={exporting}
              onPress={runDevisWhatsApp}
              style={styles.exportButton}
              contentStyle={styles.exportButtonContent}
            >
              WhatsApp
            </Button>
          </View>
        </View>
      ) : null}

      <LigneNoteReadModal
        visible={noteModal.visible}
        note={noteModal.note}
        ouvrageNom={noteModal.ouvrageNom}
        onDismiss={() => setNoteModal({ visible: false, note: '', ouvrageNom: '' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 28,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  subTitle: {
    color: chantierColors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  listContent: {
    gap: 10,
    paddingTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 42,
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
  },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    zIndex: 20,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.81)',
  },
  exportActions: {
    paddingHorizontal: 24,
    gap: 14,
    alignItems: 'stretch',
  },
  exportButton: {
    borderRadius: 12,
  },
  exportButtonContent: {
    minHeight: 56,
  },
});
