import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { IconButton, Modal, Portal, Text } from 'react-native-paper';
import MobileButton from './MobileButton';
import { chantierColors } from '../../styles/theme';
import { downloadTerrainImage } from '../../utils/terrainImageDownload';

const DELETE_BUTTON_COLOR = '#9CA3AF';

export default function TerrainImageViewModal({
  visible,
  imageUri,
  title = 'Photo',
  onDismiss,
  onDelete,
  deleting = false,
}) {
  const [downloading, setDownloading] = useState(false);
  const busy = deleting || downloading;

  const handleDownload = async () => {
    if (!imageUri || busy) return;

    try {
      setDownloading(true);
      const result = await downloadTerrainImage(imageUri, title);
      Alert.alert(
        'Photo enregistrée',
        `${result.fileName}\nDossier : ${result.locationLabel}`
      );
    } catch (error) {
      console.error('Erreur telechargement photo:', error);
      Alert.alert('Erreur', error.message || "Impossible d'enregistrer la photo.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.emptyText}>Image indisponible.</Text>
        )}
        <View style={styles.actions}>
          <IconButton
            icon="download"
            mode="contained"
            containerColor={chantierColors.primary}
            iconColor="#FFFFFF"
            size={28}
            onPress={handleDownload}
            disabled={busy || !imageUri}
            loading={downloading}
            accessibilityLabel="Télécharger"
          />
          {onDelete ? (
            <IconButton
              icon="delete"
              mode="contained"
              containerColor={DELETE_BUTTON_COLOR}
              iconColor="#FFFFFF"
              size={28}
              onPress={onDelete}
              disabled={busy}
              loading={deleting}
              accessibilityLabel="Supprimer"
            />
          ) : null}
          <MobileButton mode="outlined" onPress={onDismiss} disabled={busy}>
            Fermer
          </MobileButton>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: chantierColors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    maxHeight: '90%',
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  image: {
    width: '100%',
    height: 360,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    flexWrap: 'wrap',
  },
});
