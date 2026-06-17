import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const IMAGE_PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  quality: 0.85,
};

const launchCamera = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Caméra', 'Autorisation caméra refusée.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || 'image/jpeg',
  };
};

const launchGallery = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photos', 'Autorisation galerie refusée.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    mimeType: asset.mimeType || 'image/jpeg',
  };
};

/** Demande camera ou galerie, retourne { uri, mimeType } ou null. */
export const pickTerrainImage = () =>
  new Promise((resolve) => {
    Alert.alert('Photo', 'Choisir une source', [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
      {
        text: 'Caméra',
        onPress: async () => resolve(await launchCamera()),
      },
      {
        text: 'Galerie',
        onPress: async () => resolve(await launchGallery()),
      },
    ]);
  });
