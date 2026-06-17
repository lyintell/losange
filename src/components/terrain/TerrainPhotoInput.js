import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pickTerrainImage } from '../../utils/terrainImagePicker';
import { resolveTerrainImageUri } from '../../db/terrainImageStorage';
import { chantierColors } from '../../styles/theme';

export default function TerrainPhotoInput({
  label,
  previewUri = null,
  storageKey = null,
  disabled = false,
  onPicked,
  onClear,
}) {
  const resolvedUri = previewUri || (storageKey ? resolveTerrainImageUri(storageKey) : null);
  const hasImage = Boolean(resolvedUri);

  const handlePress = async () => {
    if (disabled) return;
    const picked = await pickTerrainImage();
    if (picked?.uri) {
      onPicked?.(picked);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.label}>
        {label}
      </Text>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          hasImage && styles.buttonWithImage,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
      >
        {hasImage ? (
          <Image source={{ uri: resolvedUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons
              name="camera-plus-outline"
              size={28}
              color={disabled ? chantierColors.muted : chantierColors.primary}
            />
            <Text style={[styles.placeholderText, disabled && styles.placeholderTextDisabled]}>
              {disabled ? 'Indisponible' : 'Ajouter'}
            </Text>
          </View>
        )}
      </Pressable>
      {hasImage && onClear && !disabled ? (
        <Pressable onPress={onClear} style={styles.clearLink}>
          <Text style={styles.clearText}>Retirer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    color: chantierColors.muted,
    fontWeight: '700',
  },
  button: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
    overflow: 'hidden',
  },
  buttonWithImage: {
    borderColor: chantierColors.primary,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    backgroundColor: '#FFF5F1',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    color: chantierColors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  placeholderTextDisabled: {
    color: chantierColors.muted,
  },
  clearLink: {
    alignSelf: 'flex-start',
  },
  clearText: {
    color: chantierColors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
});
