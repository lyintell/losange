import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LigneNoteReadModal from '../components/terrain/LigneNoteReadModal';
import ReleveStatutBadge from '../components/terrain/ReleveStatutBadge';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import TerrainImageViewModal from '../components/terrain/TerrainImageViewModal';
import { LignesReleveGroupedSections } from '../components/terrain/LignesReleveGroupedList';
import { FlowActionFab, FlowSmallFab, FAB_HORIZONTAL_INSET, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import {
  clearChantierPhotoLocal,
  clearLigneRelevePhotoLocal,
  getChantierWithClientByIdLocal,
  getEntrepriseByIdLocal,
  getLignesByReleveIdLocal,
  getLoggedInProfilViewLocal,
  getReleveByIdLocal,
  getSectionOrderByReleveIdLocal,
  updateChantierStatusLocal,
  updateLigneReleveIndCompleteLocal,
  updateReleveStatusLocal,
} from '../db/querries';
import { CHANTIER_PHOTO_SLOTS, resolveTerrainImageUri } from '../db/terrainImageStorage';
import { canModifyReleveForProfil, canChangeReleveStatus, hidesPriceUiForRole, canToggleLigneIndCompleteOnReleve, canAccessReleveForProfil } from '../utils/terrainAccess';
import { formatPriseParLine } from '../utils/releveDisplay';
import {
  downloadDevisPdf,
  downloadDimensionsPdf,
  generateDevisPdfFile,
  generateDimensionsPdfFile,
  shareDevisPdf,
} from '../utils/devisExport';
import { CHANTIER_STATUS_DEVIS } from '../utils/chantierStatus';
import { chantierColors, MOBILE_BUTTON_FONT_SIZE, MOBILE_BUTTON_LINE_HEIGHT } from '../styles/theme';

const DEVIS_MULTI_PRESS_DELAY_MS = 350;

function ExportActionButton({ icon, label, buttonColor, textColor = '#FFFFFF', loading, disabled, onPress }) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.exportButton,
        { backgroundColor: buttonColor },
        isDisabled && styles.exportButtonDisabled,
        pressed && !isDisabled && styles.exportButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          <MaterialCommunityIcons name={icon} size={24} color={textColor} />
          <Text style={[styles.exportButtonLabel, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function ChantierDetails({
  chantier,
  releveId = null,
  entrepriseId = null,
  onChantierUpdated,
}) {
  const [loading, setLoading] = useState(false);
  const [lignes, setLignes] = useState([]);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [releve, setReleve] = useState(null);
  const [chantierData, setChantierData] = useState(chantier);
  const [showPrices, setShowPrices] = useState(false);
  const [exportOverlayVisible, setExportOverlayVisible] = useState(false);
  const [exportOverlayMode, setExportOverlayMode] = useState('devis');
  const [exporting, setExporting] = useState(false);
  const [noteModal, setNoteModal] = useState({ visible: false, note: '', ouvrageNom: '' });
  const [hidesDevisUi, setHidesDevisUi] = useState(false);
  const [isProAccount, setIsProAccount] = useState(false);
  const [canEditReleveStatus, setCanEditReleveStatus] = useState(false);
  const [canToggleLigneComplete, setCanToggleLigneComplete] = useState(false);
  const [imageModal, setImageModal] = useState({
    visible: false,
    uri: null,
    title: 'Photo',
    deleteKind: null,
    deleteTarget: null,
  });
  const [deletingImage, setDeletingImage] = useState(false);

  const chantierPhotos = useMemo(
    () =>
      CHANTIER_PHOTO_SLOTS.map((slot, index) => ({
        slot,
        index: index + 1,
        storageKey: chantierData?.[slot] || null,
        uri: chantierData?.[slot] ? resolveTerrainImageUri(chantierData[slot]) : null,
      })).filter((item) => item.storageKey),
    [chantierData]
  );

  useEffect(() => {
    setChantierData(chantier);
  }, [chantier]);

  const devisPressCountRef = useRef(0);
  const devisPressTimerRef = useRef(null);

  const releveMetaLine = formatPriseParLine(releve?.cree_le, releve?.prise_par_nom);

  const loadLignes = useCallback(async () => {
    if (!chantier?.id || !releveId) {
      setLignes([]);
      setSectionOrder([]);
      setReleve(null);
      return;
    }

    try {
      setLoading(true);
      const [releveData, lignesData, freshChantier, order] = await Promise.all([
        getReleveByIdLocal(releveId),
        getLignesByReleveIdLocal(releveId),
        getChantierWithClientByIdLocal(chantier.id),
        getSectionOrderByReleveIdLocal(releveId),
      ]);
      const profil = await getLoggedInProfilViewLocal();
      if (releveData && !canAccessReleveForProfil(profil, releveData)) {
        setReleve(null);
        setLignes([]);
        setSectionOrder([]);
        Alert.alert('Accès refusé', "Vous n'avez pas accès à ce relevé.");
        return;
      }
      setReleve(releveData || null);
      setLignes(lignesData || []);
      setSectionOrder(order || []);
      if (freshChantier) {
        setChantierData(freshChantier);
      }
    } catch (error) {
      console.error('Erreur chargement lignes chantier:', error);
      setLignes([]);
      setSectionOrder([]);
      setReleve(null);
    } finally {
      setLoading(false);
    }
  }, [chantier?.id, releveId]);

  useEffect(() => {
    loadLignes();
  }, [loadLignes]);

  useEffect(() => {
    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        setHidesDevisUi(hidesPriceUiForRole(profil?.role));
        setIsProAccount(Boolean(profil?.is_pro));
        setCanEditReleveStatus(
          canChangeReleveStatus(profil) && canModifyReleveForProfil(profil, releve)
        );
        setCanToggleLigneComplete(canToggleLigneIndCompleteOnReleve(profil, releve));
        if (hidesPriceUiForRole(profil?.role)) {
          setShowPrices(false);
        }
      } catch (error) {
        console.error('Erreur chargement acces chantier:', error);
        setHidesDevisUi(false);
        setIsProAccount(false);
        setCanEditReleveStatus(false);
        setCanToggleLigneComplete(false);
      }
    };
    loadAccess();
  }, [releve]);

  useEffect(
    () => () => {
      if (devisPressTimerRef.current) clearTimeout(devisPressTimerRef.current);
    },
    []
  );

  const handleLignePress = (ligne) => {
    if (ligne?.photo) {
      setImageModal({
        visible: true,
        uri: resolveTerrainImageUri(ligne.photo),
        title: ligne.ouvrage_nom || 'Photo ligne',
        deleteKind: 'ligne',
        deleteTarget: ligne.id,
      });
      return;
    }
    if (!ligne?.note?.trim()) return;
    setNoteModal({
      visible: true,
      note: ligne.note,
      ouvrageNom: ligne.ouvrage_nom || '',
    });
  };

  const openChantierPhoto = (photo) => {
    setImageModal({
      visible: true,
      uri: photo.uri,
      title: `Photo ${photo.index}`,
      deleteKind: 'chantier',
      deleteTarget: photo.slot,
    });
  };

  const closeImageModal = () => {
    if (deletingImage) return;
    setImageModal({
      visible: false,
      uri: null,
      title: 'Photo',
      deleteKind: null,
      deleteTarget: null,
    });
  };

  const handleDeleteImage = async () => {
    if (!imageModal.deleteKind || !imageModal.deleteTarget || !chantierData?.id) return;

    try {
      setDeletingImage(true);
      if (imageModal.deleteKind === 'chantier') {
        await clearChantierPhotoLocal(chantierData.id, imageModal.deleteTarget);
        const updated = { ...chantierData, [imageModal.deleteTarget]: null };
        setChantierData(updated);
        onChantierUpdated?.(updated);
      } else if (imageModal.deleteKind === 'ligne') {
        await clearLigneRelevePhotoLocal(imageModal.deleteTarget);
        setLignes((prev) =>
          prev.map((item) =>
            item.id === imageModal.deleteTarget ? { ...item, photo: null } : item
          )
        );
      }
      closeImageModal();
    } catch (error) {
      console.error('Erreur suppression photo:', error);
      Alert.alert('Erreur', error.message || 'Impossible de supprimer la photo.');
    } finally {
      setDeletingImage(false);
    }
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
      Alert.alert('Modification refusée', error.message || 'Action impossible.');
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
          Alert.alert('Devis', 'Aucune dimension à inclure dans le devis.');
          return;
        }
        setShowPrices(true);
        setExportOverlayMode('devis');
        setExportOverlayVisible(true);
      } else if (pressCount === 1) {
        setShowPrices((prev) => !prev);
      }
    }, DEVIS_MULTI_PRESS_DELAY_MS);
  };

  const handlePdfPress = () => {
    if (!lignes.length) {
      Alert.alert('PDF', 'Aucune dimension à inclure dans le document.');
      return;
    }
    setExportOverlayMode('pdf');
    setExportOverlayVisible(true);
  };

  const handleReleveStatusChange = async (nextStatus) => {
    if (!releveId || !chantier?.id) return;

    try {
      const savedStatus = await updateReleveStatusLocal(releveId, nextStatus);
      setReleve((prev) => (prev ? { ...prev, status: savedStatus } : prev));
      const freshChantier = await getChantierWithClientByIdLocal(chantier.id);
      if (freshChantier) {
        setChantierData(freshChantier);
        onChantierUpdated?.(freshChantier);
      }
    } catch (error) {
      console.error('Erreur mise a jour status releve:', error);
      Alert.alert('Modification refusée', error.message || 'Action impossible.');
    }
  };

  const closeExportOverlay = () => {
    if (exporting) return;
    setExportOverlayVisible(false);
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

  const generateExportPdf = async () => {
    const entreprise = await getEntrepriseByIdLocal(entrepriseId);
    if (exportOverlayMode === 'pdf') {
      return generateDimensionsPdfFile({ entreprise, chantier, lignes, sectionOrder });
    }
    return generateDevisPdfFile({
      entreprise,
      chantier,
      lignes,
      releve,
    });
  };

  const runExportDownload = async () => {
    if (exporting) return;
    if (!lignes.length) {
      Alert.alert('Export', 'Aucune dimension à inclure dans le document.');
      return;
    }

    const isPdf = exportOverlayMode === 'pdf';

    try {
      setExporting(true);
      const uri = await generateExportPdf();
      const result =
        exportOverlayMode === 'pdf'
          ? await downloadDimensionsPdf(uri, chantier)
          : await downloadDevisPdf(uri, chantier);
      if (!isPdf) {
        await markChantierAsDevis();
      }
      setExportOverlayVisible(false);
      Alert.alert(
        isPdf ? 'PDF enregistré' : 'Devis enregistré',
        `${result.fileName}\nDossier : ${result.locationLabel}`
      );
    } catch (error) {
      console.error('Erreur telechargement export:', error);
      Alert.alert('Erreur', error.message || "Impossible d'enregistrer le document.");
    } finally {
      setExporting(false);
    }
  };

  const runExportWhatsApp = async () => {
    if (exporting) return;
    if (!lignes.length) {
      Alert.alert('Export', 'Aucune dimension à inclure dans le document.');
      return;
    }

    const isPdf = exportOverlayMode === 'pdf';

    try {
      setExporting(true);
      const uri = await generateExportPdf();
      await shareDevisPdf(
        uri,
        isPdf ? 'Partager le PDF sur WhatsApp' : 'Partager le devis sur WhatsApp',
        { chantier, mode: isPdf ? 'pdf' : 'devis' }
      );
      if (!isPdf) {
        await markChantierAsDevis();
      }
      setExportOverlayVisible(false);
    } catch (error) {
      console.error('Erreur partage export:', error);
      Alert.alert('Erreur', error.message || 'Impossible de partager le document.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {chantier?.nom || 'Détail chantier'}
        </Text>
        <Text variant="bodyMedium" style={styles.subTitle}>
          Client : {chantier?.client_nom || 'Non renseigné'}
        </Text>
        {releveMetaLine ? (
          <View style={styles.releveMetaRow}>
            <Text variant="bodyMedium" style={styles.releveMeta}>
              {releveMetaLine}
            </Text>
            <ReleveStatutBadge
              status={releve?.status}
              disabled={!canEditReleveStatus}
              onStatusChange={handleReleveStatusChange}
            />
          </View>
        ) : releve ? (
          <View style={styles.releveMetaRow}>
            <ReleveStatutBadge
              status={releve?.status}
              disabled={!canEditReleveStatus}
              onStatusChange={handleReleveStatusChange}
            />
          </View>
        ) : null}
      </View>

      <LignesReleveGroupedSections
        lignes={lignes}
        variant="details"
        sectionOrder={sectionOrder}
        showPrices={showPrices}
        onLignePress={handleLignePress}
        onLigneDoublePress={canToggleLigneComplete ? handleToggleComplete : undefined}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLignes} />}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: getFabColumnPadding(hidesDevisUi ? 0 : 1) + (chantierPhotos.length ? 16 : 24),
          },
        ]}
        ListFooterComponent={
          chantierPhotos.length ? (
            <View style={styles.photoFooter}>
              <View style={styles.photoButtonsRow}>
                {chantierPhotos.map((photo) => (
                  <Pressable
                    key={photo.slot}
                    onPress={() => openChantierPhoto(photo)}
                    style={({ pressed }) => [
                      styles.photoIconButton,
                      pressed && styles.photoIconButtonPressed,
                    ]}
                    accessibilityLabel={`Photo ${photo.index}`}
                    accessibilityRole="button"
                  >
                    <MaterialCommunityIcons
                      name="image"
                      size={36}
                      color={chantierColors.primary}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <LosangeLogoLoader size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune dimension enregistrée pour ce relevé.</Text>
            </View>
          )
        }
      />

      <FlowActionFab
        icon="file-pdf-box"
        color="#C62828"
        smallCountBelow={hidesDevisUi ? 0 : 1}
        onPress={handlePdfPress}
      />
      {hidesDevisUi ? null : (
        <FlowSmallFab
          icon="file-document"
          tierFromBottom={0}
          color={showPrices ? '#0F3D9E' : '#1D4ED8'}
          onPress={handleDevisPress}
        />
      )}

      {exportOverlayVisible ? (
        <View style={styles.exportOverlay}>
          <Pressable style={styles.overlayBackdrop} onPress={closeExportOverlay} />
          <View style={styles.exportActions} pointerEvents="box-none">
            <ExportActionButton
              icon="download"
              label="Télécharger"
              buttonColor={exportOverlayMode === 'pdf' ? '#C62828' : '#1D4ED8'}
              loading={exporting}
              disabled={exporting}
              onPress={runExportDownload}
            />
            {isProAccount ? (
              <ExportActionButton
                icon="whatsapp"
                label="WhatsApp"
                buttonColor="#25D366"
                loading={exporting}
                disabled={exporting}
                onPress={runExportWhatsApp}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      <LigneNoteReadModal
        visible={noteModal.visible}
        note={noteModal.note}
        ouvrageNom={noteModal.ouvrageNom}
        onDismiss={() => setNoteModal({ visible: false, note: '', ouvrageNom: '' })}
      />

      <TerrainImageViewModal
        visible={imageModal.visible}
        imageUri={imageModal.uri}
        title={imageModal.title}
        onDismiss={closeImageModal}
        onDelete={imageModal.deleteKind ? handleDeleteImage : undefined}
        deleting={deletingImage}
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
  },
  releveMeta: {
    color: chantierColors.muted,
    flex: 1,
    fontSize: 13,
    marginRight: 8,
  },
  releveMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 2,
  },
  listContent: {
    gap: 10,
    paddingTop: 4,
  },
  loadingState: {
    alignItems: 'center',
    marginTop: 42,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 42,
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
  },
  photoFooter: {
    marginTop: 10,
    paddingTop: 4,
    paddingRight: FAB_HORIZONTAL_INSET,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: FAB_HORIZONTAL_INSET,
  },
  photoIconButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIconButtonPressed: {
    backgroundColor: '#FFF5F1',
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
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonPressed: {
    opacity: 0.92,
  },
  exportButtonLabel: {
    fontSize: MOBILE_BUTTON_FONT_SIZE,
    lineHeight: MOBILE_BUTTON_LINE_HEIGHT,
    fontWeight: '700',
  },
});
