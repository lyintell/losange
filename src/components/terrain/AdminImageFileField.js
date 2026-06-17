import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import {
  buildChantierPhotoKey,
  buildEntrepriseLogoKey,
  buildLignePhotoKey,
} from '../../db/terrainImageStorage';
import { getAdminTerrainImageUrl, uploadAdminTerrainImageFile } from '../../utils/adminTerrainImage';
import { chantierColors } from '../../styles/theme';

export function AdminImagePreview({ storageKey, style }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!storageKey) {
        setUri(null);
        return;
      }
      const signedUrl = await getAdminTerrainImageUrl(storageKey);
      if (!cancelled) setUri(signedUrl);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  if (!uri) return null;
  return <Image source={{ uri }} style={[styles.previewImage, style]} resizeMode="contain" />;
}

export default function AdminImageFileField({
  label,
  storageKey,
  disabled = false,
  onUploaded,
  onClear,
  hint,
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUri, setPreviewUri] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!storageKey) {
        setPreviewUri(null);
        return;
      }
      const signedUrl = await getAdminTerrainImageUrl(storageKey);
      if (!cancelled) setPreviewUri(signedUrl);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const handleFileChange = async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || disabled) return;

    setUploading(true);
    setError('');
    try {
      const uploadedKey = await onUploaded?.(file);
      if (uploadedKey) {
        const signedUrl = await getAdminTerrainImageUrl(uploadedKey);
        setPreviewUri(signedUrl);
      }
    } catch (uploadError) {
      setError(uploadError?.message || 'Échec envoi image.');
    } finally {
      setUploading(false);
      if (event?.target) event.target.value = '';
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {previewUri ? (
        <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
      ) : null}
      {Platform.OS === 'web' ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            style={{ display: 'none' }}
            disabled={disabled || uploading}
            onChange={handleFileChange}
          />
          <View style={styles.actions}>
            <Button
              mode="outlined"
              icon="file-image"
              disabled={disabled || uploading}
              loading={uploading}
              onPress={() => inputRef.current?.click()}
            >
              Choisir un fichier
            </Button>
            {storageKey && onClear ? (
              <Button mode="text" disabled={disabled || uploading} onPress={onClear}>
                Retirer
              </Button>
            ) : null}
          </View>
        </>
      ) : (
        <Text style={styles.hint}>Sélection fichier disponible sur le web admin.</Text>
      )}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const uploadEntrepriseLogoAdmin = async (entrepriseId, file) => {
  if (!entrepriseId || !file) {
    throw new Error('Entreprise ou fichier manquant.');
  }
  return uploadAdminTerrainImageFile({
    file,
    storageKeyBase: buildEntrepriseLogoKey(entrepriseId),
  });
};

export const uploadChantierPhotoAdmin = async (entrepriseId, chantierId, slot, file) => {
  if (!entrepriseId || !chantierId || !slot || !file) {
    throw new Error('Entreprise, chantier ou fichier manquant.');
  }
  return uploadAdminTerrainImageFile({
    file,
    storageKeyBase: buildChantierPhotoKey(entrepriseId, chantierId, slot),
  });
};

export const uploadLignePhotoAdmin = async (entrepriseId, chantierId, ligneId, file) => {
  if (!entrepriseId || !chantierId || !ligneId || !file) {
    throw new Error('Entreprise, chantier, ligne ou fichier manquant.');
  }
  return uploadAdminTerrainImageFile({
    file,
    storageKeyBase: buildLignePhotoKey(entrepriseId, chantierId, ligneId),
  });
};

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: chantierColors.text,
    fontWeight: '700',
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  hint: {
    color: chantierColors.muted,
    fontSize: 13,
  },
  error: {
    color: chantierColors.danger,
    fontSize: 13,
  },
});
