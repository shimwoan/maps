/**
 * 플랫폼 독립적인 스토리지 유틸리티
 * Web: localStorage 사용
 * React Native: MMKV 사용 (동적 import)
 */

// 플랫폼 감지 (react-native import 없이)
const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const isNative = !isWeb && typeof globalThis !== 'undefined';

export interface StorageInterface {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  getAllKeys: () => string[];
  clearAll: () => void;
}

// 웹용 localStorage 래퍼
const webStorage: StorageInterface = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('localStorage removeItem failed:', e);
    }
  },
  getAllKeys: (): string[] => {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
  clearAll: (): void => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('localStorage clear failed:', e);
    }
  },
};

// MMKV 인스턴스 (React Native 전용, 지연 초기화)
let mmkvInstance: any = null;
let MMKVModule: any = null;

const getMMKV = () => {
  if (!mmkvInstance && isNative) {
    try {
      // 동적 import를 통해 웹에서는 로드되지 않도록 함
      MMKVModule = require('react-native-mmkv');
      mmkvInstance = new MMKVModule.MMKV({ id: 'app-storage' });
    } catch (e) {
      console.warn('MMKV initialization failed:', e);
      return null;
    }
  }
  return mmkvInstance;
};

// React Native용 MMKV 래퍼
const nativeStorage: StorageInterface = {
  getItem: (key: string): string | null => {
    try {
      const mmkv = getMMKV();
      return mmkv?.getString(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      const mmkv = getMMKV();
      mmkv?.set(key, value);
    } catch (e) {
      console.warn('MMKV setItem failed:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      const mmkv = getMMKV();
      mmkv?.delete(key);
    } catch (e) {
      console.warn('MMKV removeItem failed:', e);
    }
  },
  getAllKeys: (): string[] => {
    try {
      const mmkv = getMMKV();
      return mmkv?.getAllKeys() ?? [];
    } catch {
      return [];
    }
  },
  clearAll: (): void => {
    try {
      const mmkv = getMMKV();
      mmkv?.clearAll();
    } catch (e) {
      console.warn('MMKV clearAll failed:', e);
    }
  },
};

// 플랫폼에 따라 적절한 스토리지 선택
export const storage: StorageInterface = isWeb ? webStorage : nativeStorage;

// 동기 버전 메서드 (MMKV는 기본적으로 동기, localStorage도 동기)
export const storageSync = {
  getItemSync: (key: string): string | null => storage.getItem(key),
  setItemSync: (key: string, value: string): void => storage.setItem(key, value),
  removeItemSync: (key: string): void => storage.removeItem(key),
};

// 스토리지 키 상수
export const STORAGE_KEYS = {
  SKIP_INTRO: 'skipIntro',
  INTRO_SEEN: 'introSeen',
  USER_PREFERENCES: 'userPreferences',
  AUTH_TOKEN: 'authToken',
} as const;

// 타입 안전한 스토리지 유틸리티
export const typedStorage = {
  // JSON 객체 저장/로드
  getObject: <T>(key: string): T | null => {
    const value = storage.getItem(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },
  setObject: <T>(key: string, value: T): void => {
    storage.setItem(key, JSON.stringify(value));
  },

  // Boolean 저장/로드
  getBoolean: (key: string): boolean => {
    return storage.getItem(key) === 'true';
  },
  setBoolean: (key: string, value: boolean): void => {
    storage.setItem(key, value ? 'true' : 'false');
  },

  // Number 저장/로드
  getNumber: (key: string): number | null => {
    const value = storage.getItem(key);
    if (!value) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  },
  setNumber: (key: string, value: number): void => {
    storage.setItem(key, String(value));
  },
};
