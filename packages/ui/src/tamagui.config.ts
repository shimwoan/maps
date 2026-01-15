import { createTamagui, createTokens } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens as defaultTokens } from '@tamagui/themes';
import { createInterFont } from '@tamagui/font-inter';
import { createAnimations } from '@tamagui/animations-css';

// 브랜드 컬러 정의
export const brandColors = {
  primary: '#6B7CFF',
  primaryHover: '#5a6be6',
  primaryPressed: '#4a5bd6',
  primaryLight: '#EEF2FF',
} as const;

const headingFont = createInterFont();
const bodyFont = createInterFont();

const animations = createAnimations({
  fast: 'ease-in 150ms',
  medium: 'ease-in 300ms',
  slow: 'ease-in 450ms',
  quick: 'ease-in 100ms',
  bouncy: 'ease-in 200ms',
  lazy: 'ease-in 600ms',
  tooltip: 'ease-in 100ms',
});

const tokens = createTokens({
  ...defaultTokens,
  color: {
    ...defaultTokens.color,
    brandPrimary: brandColors.primary,
    brandPrimaryHover: brandColors.primaryHover,
    brandPrimaryPressed: brandColors.primaryPressed,
    brandPrimaryLight: brandColors.primaryLight,
  },
});

export const config = createTamagui({
  themes,
  tokens,
  shorthands,
  animations,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
});

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
