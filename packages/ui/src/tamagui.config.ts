import { createTamagui } from 'tamagui';
import { config as configBase } from '@tamagui/config/v3';

// 브랜드 컬러 정의
export const brandColors = {
  primary: '#6B7CFF',
  primaryHover: '#5a6be6',
  primaryPressed: '#4a5bd6',
  primaryLight: '#EEF2FF',
} as const;

export const config = createTamagui({
  ...configBase,
  tokens: {
    ...configBase.tokens,
    color: {
      ...configBase.tokens.color,
      brandPrimary: brandColors.primary,
      brandPrimaryHover: brandColors.primaryHover,
      brandPrimaryPressed: brandColors.primaryPressed,
      brandPrimaryLight: brandColors.primaryLight,
    },
  },
});

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
