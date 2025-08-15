import { DefaultTheme } from '@react-navigation/native';

export const colors = {
  bg: '#0B0B0D',
  card: '#1A1A1E',
  text: '#FFFFFF',
  muted: '#9BA1A6',
  tint: '#6EE7B7'
};

export const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: '#2A2A2E',
    primary: colors.tint
  }
};
