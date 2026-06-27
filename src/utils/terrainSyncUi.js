import { Alert } from 'react-native';

export const buildSyncSuccessMessage = (result) => {
  const pending = Number(result?.pendingAfter || 0);
  if (pending > 0) {
    return `${pending} modification${pending > 1 ? 's' : ''} en attente. Réessayez avec internet.`;
  }
  return 'Données à jour.';
};

export function showSyncAlert(title, message) {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [{ text: 'OK', onPress: () => resolve() }],
      { cancelable: false }
    );
  });
}
