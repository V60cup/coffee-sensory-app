// src/theme/theme.ts

export type ThemeMode = 'light' | 'dark';

export const lightTheme = {
  mode: 'light' as ThemeMode,

  colors: {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F2E9DD',

    primary: '#3D2B1F',
    primarySoft: '#6F4E37',
    accent: '#C47A3A',

    text: '#2A1A12',
    textMuted: '#7A6A5C',

    border: '#EEE6DA',

    danger: '#B3261E',

    success: '#2E7D32',
    warning: '#F9A825',

    white: '#FFFFFF',
    black: '#000000',
  },
};

export const darkTheme = {
  mode: 'dark' as ThemeMode,

  colors: {
    background: '#16100C',
    surface: '#211813',
    surfaceAlt: '#2C211A',

    primary: '#F4D7B5',
    primarySoft: '#C99B6A',
    accent: '#D68A45',

    text: '#FFF7EF',
    textMuted: '#BCA99A',

    border: '#3B2A21',

    danger: '#FF8A80',

    success: '#66BB6A',
    warning: '#FFCA28',

    white: '#FFFFFF',
    black: '#000000',
  },
};

export type AppTheme = typeof lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
};