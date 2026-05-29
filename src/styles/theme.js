import { MD3LightTheme } from 'react-native-paper';

export const chantierColors = {
  primary: '#FF5722',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#212529',
  success: '#2B9348',
  warning: '#F4A261',
  danger: '#D90429',
  muted: '#6C757D',
  border: '#DEE2E6',
};

export const appTheme = {
  ...MD3LightTheme,
  roundness: 8,
  colors: {
    ...MD3LightTheme.colors,
    primary: chantierColors.primary,
    background: chantierColors.background,
    surface: chantierColors.surface,
    text: chantierColors.text,
    error: chantierColors.danger,
    surfaceVariant: '#EEF1F4',
  },
};
