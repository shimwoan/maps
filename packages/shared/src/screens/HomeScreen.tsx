import { useEffect, useState, useRef } from 'react';
import { View, Text, XStack, Spinner } from 'tamagui';
import { NaverMap } from '../components/NaverMap';
import { RegionSelectModal } from '../components/RegionSelectModal';

interface Location {
  latitude: number;
  longitude: number;
}

interface Address {
  sido: string;      // 도/시
  sigungu: string;   // 시/군/구
  dong: string;      // 읍/면/동
}

const DEFAULT_LOCATION: Location = {
  latitude: 37.5665,
  longitude: 126.978,
};

function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        resolve(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  });
}

async function getAddressFromCoords(latitude: number, longitude: number): Promise<Address | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const adminList = data.localityInfo?.administrative || [];

    // 시/도 (adminLevel 4)
    const sido = data.principalSubdivision || '';

    // 구/군/시 (adminLevel 6) - administrative 배열에서 찾기
    const sigunguAdmin = adminList.find((a: { adminLevel: number; name: string }) => a.adminLevel === 6);
    const sigungu = sigunguAdmin?.name || '';

    // 동/읍/면 (adminLevel 8) - 가장 마지막 항목 또는 locality
    const dongAdmin = adminList.filter((a: { adminLevel: number }) => a.adminLevel === 8).pop();
    const dong = dongAdmin?.name || data.locality || '';

    return { sido, sigungu, dong };
  } catch (error) {
    console.error('Failed to get address:', error);
    return null;
  }
}

const MIN_ZOOM_FOR_ADDRESS = 14;

export function HomeScreen() {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [address, setAddress] = useState<Address | null>(null);
  const [zoom, setZoom] = useState(14);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const skipAddressUpdateRef = useRef(false);

  useEffect(() => {
    getCurrentLocation().then((loc) => {
      setLocation(loc);
      getAddressFromCoords(loc.latitude, loc.longitude).then(setAddress);
    });
  }, []);

  const handleCameraChange = (latitude: number, longitude: number, currentZoom: number) => {
    setZoom(currentZoom);
    // 지역 선택 직후에는 주소 업데이트 스킵
    if (skipAddressUpdateRef.current) {
      skipAddressUpdateRef.current = false;
      return;
    }
    if (currentZoom >= MIN_ZOOM_FOR_ADDRESS) {
      getAddressFromCoords(latitude, longitude).then(setAddress);
    }
  };

  const handleRegionSelect = (region: { name: string; lat: number; lng: number; zoom?: number }) => {
    // 지역 선택 후 카메라 이동 시 주소 업데이트 스킵 설정
    skipAddressUpdateRef.current = true;

    setLocation({ latitude: region.lat, longitude: region.lng });
    if (region.zoom) {
      setZoom(region.zoom);
    }
    // 선택한 지역명을 직접 사용 (BigDataCloud 대신)
    const parts = region.name.split(' ');
    if (parts.length >= 2) {
      // "중구 소공동" 형태
      setAddress({ sido: '', sigungu: parts[0], dong: parts.slice(1).join(' ') });
    } else {
      // "중구" 형태 (시군구만 선택한 경우)
      setAddress({ sido: '', sigungu: region.name, dong: '' });
    }
    setIsRegionModalOpen(false);
  };

  return (
    <View position="relative" width="100%" height="100vh">
      {/* 상단 주소 표시 */}
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        backgroundColor="white"
        paddingVertical="$3"
        paddingHorizontal="$4"
        borderBottomWidth={1}
        borderBottomColor="#eee"
      >
        <XStack
          alignItems="center"
          gap="$1.5"
          cursor="pointer"
          onPress={() => setIsRegionModalOpen(true)}
        >
          {address ? (
            <>
              <Text fontSize={20} fontWeight="700" color="#000000">
                {zoom >= MIN_ZOOM_FOR_ADDRESS ? `${address.sigungu} ${address.dong}` : '지역 선택'}
              </Text>
              <svg width="18" height="18" viewBox="0 0 12 12" fill="none" style={{ marginTop: '-1px' }}>
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : (
            <Spinner size="small" color="#333" />
          )}
        </XStack>
      </View>

      {/* 지도 */}
      <NaverMap
        latitude={location.latitude}
        longitude={location.longitude}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        onCameraChange={handleCameraChange}
      />

      {/* 지역 선택 모달 */}
      <RegionSelectModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        onSelect={handleRegionSelect}
        currentAddress={address}
      />
    </View>
  );
}
