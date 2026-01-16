import { createTamagui, createTokens, TamaguiInternalConfig } from 'tamagui';
import { shorthands } from '@tamagui/shorthands/v2';
import { animations } from '@tamagui/config/v3';
import { media, mediaQueryDefaultActive } from '@tamagui/config/v3';
import { fonts } from '@tamagui/config/v3';

// 간단한 테마 직접 정의 (tree-shaking 방지)
const lightColors = {
  background: '#fff',
  backgroundHover: '#f5f5f5',
  backgroundPress: '#e5e5e5',
  backgroundFocus: '#f0f0f0',
  backgroundStrong: '#f2f2f2',
  backgroundTransparent: 'rgba(255,255,255,0)',
  color: '#000',
  colorHover: '#111',
  colorPress: '#222',
  colorFocus: '#111',
  colorTransparent: 'rgba(0,0,0,0)',
  borderColor: '#e0e0e0',
  borderColorHover: '#d0d0d0',
  borderColorPress: '#c0c0c0',
  borderColorFocus: '#d0d0d0',
  placeholderColor: '#999',
  shadowColor: 'rgba(0,0,0,0.1)',
  shadowColorHover: 'rgba(0,0,0,0.15)',
  shadowColorPress: 'rgba(0,0,0,0.2)',
  shadowColorFocus: 'rgba(0,0,0,0.15)',
};

const darkColors = {
  background: '#1a1a1a',
  backgroundHover: '#252525',
  backgroundPress: '#303030',
  backgroundFocus: '#252525',
  backgroundStrong: '#0d0d0d',
  backgroundTransparent: 'rgba(0,0,0,0)',
  color: '#fff',
  colorHover: '#eee',
  colorPress: '#ddd',
  colorFocus: '#eee',
  colorTransparent: 'rgba(255,255,255,0)',
  borderColor: '#333',
  borderColorHover: '#444',
  borderColorPress: '#555',
  borderColorFocus: '#444',
  placeholderColor: '#666',
  shadowColor: 'rgba(0,0,0,0.5)',
  shadowColorHover: 'rgba(0,0,0,0.6)',
  shadowColorPress: 'rgba(0,0,0,0.7)',
  shadowColorFocus: 'rgba(0,0,0,0.6)',
};

const themes = {
  light: lightColors,
  dark: darkColors,
};

const tokens = createTokens({
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
  color: {
    white: '#fff',
    black: '#000',
    gray: '#999',
  },
});

const config: TamaguiInternalConfig = createTamagui({
  animations,
  themes,
  media,
  shorthands,
  tokens,
  fonts,
  settings: {
    mediaQueryDefaultActive,
    defaultFont: 'body',
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true,
  },
});

export default config;
