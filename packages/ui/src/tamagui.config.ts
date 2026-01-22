import { config as tamaguiConfig } from '@tamagui/config/v3';

// 브랜드 컬러 정의
export const brandColors = {
  primary: '#87BEE1',
  primaryHover: '#70ADD0',
  primaryPressed: '#5A9CC0',
  primaryLight: '#E8F4FA',
} as const;

// 공통 컬러 정의
export const colors = {
  // 텍스트
  text: '#000',
  textSecondary: '#333',
  textMuted: '#999',
  textDisabled: '#bbb',

  // 배경
  background: '#fafafa',
  backgroundLight: '#f9f9f9',
  backgroundMuted: '#f5f5f5',
  backgroundDim: '#f0f0f0',

  // 테두리
  border: '#eee',
  borderDark: '#ddd',
  borderInput: '#e2e8f0',

  // 상태 색상
  error: '#ff4444',
  errorLight: '#FEE2E2',
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // AS 종류별 색상
  asType: {
    printer: '#6B7280',      // 복합기/OA
    electric: '#F59E0B',     // 전기/통신
    appliance: '#F97316',    // 가전/설비
    interior: '#8B5CF6',     // 인테리어
    cleaning: '#10B981',     // 청소
    software: '#3B82F6',     // 소프트웨어
    transport: '#78716C',    // 운반/설치
  },
} as const;

export const config = tamaguiConfig;

export default config;

export type Conf = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
