import { MD3LightTheme } from 'react-native-paper';

export const APP_NAME = 'Losange';

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

export const MOBILE_BUTTON_FONT_SIZE = 18;
export const MOBILE_BUTTON_LINE_HEIGHT = 22;
export const MOBILE_BUTTON_MIN_HEIGHT = 58;
export const MOBILE_BUTTON_MENU_FONT_SIZE = 20;
export const MOBILE_KEYPAD_BUTTON_FONT_SIZE = 22;

export const mobileButtonLabelStyle = {
  fontSize: MOBILE_BUTTON_FONT_SIZE,
  lineHeight: MOBILE_BUTTON_LINE_HEIGHT,
  fontWeight: '700',
  marginVertical: 0,
  marginHorizontal: 2,
  textAlign: 'center',
};

export const mobileButtonContentStyle = {
  minHeight: MOBILE_BUTTON_MIN_HEIGHT,
  paddingHorizontal: 10,
  paddingVertical: 6,
};

export const mobileKeypadButtonLabelStyle = {
  ...mobileButtonLabelStyle,
  fontSize: MOBILE_KEYPAD_BUTTON_FONT_SIZE,
  lineHeight: 26,
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
  fonts: {
    ...MD3LightTheme.fonts,
    labelLarge: {
      ...MD3LightTheme.fonts.labelLarge,
      fontSize: MOBILE_BUTTON_FONT_SIZE,
      lineHeight: MOBILE_BUTTON_LINE_HEIGHT,
      fontWeight: '700',
    },
  },
};
