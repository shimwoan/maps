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

// 네이버 지도 Geocoding으로 좌표 가져오기
const getCoordinatesFromAddress = (address: string): Promise<{ lat: number; lng: number } | null> => {
  return new Promise((resolve) => {
    if (!window.naver?.maps?.Service) {
      console.warn('Naver Maps Service not available');
      resolve(null);
      return;
    }

    window.naver.maps.Service.geocode(
      { query: address },
      (status, response) => {
        if (status !== window.naver.maps.Service.Status.OK) {
          console.warn('Geocoding failed:', status);
          resolve(null);
          return;
        }

        const result = response.v2.addresses[0];
        if (result) {
          resolve({
            lat: parseFloat(result.y),
            lng: parseFloat(result.x),
          });
        } else {
          resolve(null);
        }
      }
    );
  });
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
        onChange(fullAddress);

        // 좌표 가져오기
        if (onCoordinatesChange) {
          const coords = await getCoordinatesFromAddress(fullAddress);
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
        onChangeText={onChange}
        backgroundColor="#f9f9f9"
        borderColor={hasError ? '#ff4444' : '#eee'}
        color="#000"
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
