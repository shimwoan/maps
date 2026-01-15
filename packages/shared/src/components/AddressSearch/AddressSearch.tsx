import { useEffect, useRef } from 'react';
import { View, Input, XStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
        onclose?: () => void;
        width?: string;
        height?: string;
      }) => {
        embed: (element: HTMLElement) => void;
        open: () => void;
      };
    };
    naver: {
      maps: {
        Service: {
          geocode: (
            options: { query: string },
            callback: (status: string, response: NaverGeocodeResponse) => void
          ) => void;
          Status: {
            OK: string;
            ERROR: string;
          };
        };
      };
    };
  }
}

interface DaumPostcodeResult {
  address: string;
  addressType: string;
  bname: string;
  buildingName: string;
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  bname1: string;
  bname2: string;
}

interface NaverGeocodeResponse {
  v2: {
    addresses: Array<{
      x: string; // longitude
      y: string; // latitude
      roadAddress: string;
      jibunAddress: string;
    }>;
  };
}

interface AddressSearchProps {
  value: string;
  onChange: (address: string) => void;
  onCoordinatesChange?: (lat: number | null, lng: number | null) => void;
  placeholder?: string;
  hasError?: boolean;
}

// 다음 우편번호 스크립트 로드
const loadDaumPostcodeScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.daum?.Postcode) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

// Photon API (OpenStreetMap 기반, CORS 지원) - API 키 불필요
const getCoordinatesFromAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  console.log('[Geocoding] 주소:', address);
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;
  console.log('[Geocoding] 요청 URL:', url);

  try {
    console.log('[Geocoding] fetch 시작...');
    const response = await fetch(url);
    console.log('[Geocoding] fetch 완료, status:', response.status);

    if (!response.ok) {
      console.warn('[Geocoding] 실패:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('[Geocoding] 응답:', data);
    const result = data?.features?.[0];

    if (result?.geometry?.coordinates) {
      const coords = {
        lat: result.geometry.coordinates[1],
        lng: result.geometry.coordinates[0],
      };
      console.log('[Geocoding] 좌표:', coords);
      return coords;
    }
    console.warn('[Geocoding] 결과 없음');
    return null;
  } catch (error) {
    console.error('[Geocoding] 에러:', error);
    return null;
  }
};

export function AddressSearch({
  value,
  onChange,
  onCoordinatesChange,
  placeholder = '주소 검색',
  hasError = false
}: AddressSearchProps) {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (!scriptLoadedRef.current) {
      loadDaumPostcodeScript();
      scriptLoadedRef.current = true;
    }
  }, []);

  const handleSearch = async () => {
    await loadDaumPostcodeScript();

    new window.daum.Postcode({
      oncomplete: async (data: DaumPostcodeResult) => {
        // 도로명 주소 우선, 없으면 지번 주소
        const fullAddress = data.roadAddress || data.jibunAddress;
        console.log('[AddressSearch] 선택된 주소:', fullAddress);
        onChange(fullAddress);

        // 좌표 가져오기
        console.log('[AddressSearch] onCoordinatesChange 존재:', !!onCoordinatesChange);
        if (onCoordinatesChange) {
          const coords = await getCoordinatesFromAddress(fullAddress);
          console.log('[AddressSearch] 좌표 결과:', coords);
          if (coords) {
            onCoordinatesChange(coords.lat, coords.lng);
          } else {
            onCoordinatesChange(null, null);
          }
        }
      },
    }).open();
  };

  return (
    <XStack gap="$2">
      <Input
        flex={1}
        size="$4"
        placeholder={placeholder}
        value={value}
        readOnly
        backgroundColor="#f5f5f5"
        borderColor={hasError ? '#ff4444' : '#eee'}
        color="#000"
        cursor="default"
      />
      <View
        paddingHorizontal="$3"
        paddingVertical="$2.5"
        backgroundColor={brandColors.primary}
        borderRadius={8}
        cursor="pointer"
        alignItems="center"
        justifyContent="center"
        onPress={handleSearch}
        hoverStyle={{ backgroundColor: brandColors.primaryHover }}
        pressStyle={{ scale: 0.98 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
          <path d="M16 16l4 4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </View>
    </XStack>
  );
}
