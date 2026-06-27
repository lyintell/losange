import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TerrainImageViewModal from './TerrainImageViewModal';
import { CHANTIER_PHOTO_SLOTS, resolveTerrainImageUri } from '../../db/terrainImageStorage';
import { pickTerrainImage } from '../../utils/terrainImagePicker';
import { chantierColors } from '../../styles/theme';

const resolveSlotUri = (entry) => {
  if (!entry) return null;
  if (entry.uri) return entry.uri;
  if (entry.storageKey) return resolveTerrainImageUri(entry.storageKey);
  return null;
};

export default function ChantierPhotosCompactRow({
  photos = {},
  onSlotChange,
  disabled = false,
}) {
  const [imageModal, setImageModal] = useState({
    visible: false,
    uri: null,
    title: 'Photo',
    slot: null,
  });

  const handleSlotPress = async (slot, index) => {
    if (disabled) return;

    const uri = resolveSlotUri(photos[slot]);
    if (uri) {
      setImageModal({
        visible: true,
        uri,
        title: `Photo ${index + 1}`,
        slot,
      });
      return;
    }

    const picked = await pickTerrainImage();
    if (picked?.uri) {
      onSlotChange?.(slot, { uri: picked.uri, mimeType: picked.mimeType });
    }
  };

  const closeModal = () => {
    setImageModal({
      visible: false,
      uri: null,
      title: 'Photo',
      slot: null,
    });
  };

  const handleDelete = () => {
    if (!imageModal.slot) return;
    onSlotChange?.(imageModal.slot, null);
    closeModal();
  };

  return (
    <>
      <View style={styles.row}>
        {CHANTIER_PHOTO_SLOTS.map((slot, index) => {
          const hasImage = Boolean(resolveSlotUri(photos[slot]));

          return (
            <Pressable
              key={slot}
              onPress={() => handleSlotPress(slot, index)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.slot,
                hasImage && styles.slotFilled,
                disabled && styles.slotDisabled,
                pressed && !disabled && styles.slotPressed,
              ]}
              accessibilityLabel={hasImage ? `Photo ${index + 1}` : `Ajouter photo ${index + 1}`}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={hasImage ? 'image' : 'camera-plus-outline'}
                size={hasImage ? 32 : 26}
                color={disabled ? chantierColors.muted : chantierColors.primary}
              />
            </Pressable>
          );
        })}
      </View>

      <TerrainImageViewModal
        visible={imageModal.visible}
        imageUri={imageModal.uri}
        title={imageModal.title}
        onDismiss={closeModal}
        onDelete={imageModal.slot ? handleDelete : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  slot: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotFilled: {
    borderColor: chantierColors.primary,
  },
  slotDisabled: {
    opacity: 0.55,
  },
  slotPressed: {
    backgroundColor: '#FFF5F1',
  },
});
