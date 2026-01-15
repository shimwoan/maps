import { useState } from 'react';
import { YStack, XStack, H2, Text } from 'tamagui';
import { NaverMap } from '../components/NaverMap';

interface HomeScreenProps {
  naverMapClientId: string;
  containerStyle?: {
    flex?: number;
  };
}

export function HomeScreen({ naverMapClientId, containerStyle }: HomeScreenProps) {
  const [mapCenter, setMapCenter] = useState({
    latitude: 37.5665,
    longitude: 126.978,
  });
  const [isMapReady, setIsMapReady] = useState(false);

  const handleCameraChange = (lat: number, lng: number, zoom: number) => {
    setMapCenter({ latitude: lat, longitude: lng });
  };

  return (
    <YStack flex={containerStyle?.flex ?? 1} backgroundColor="$background">
      <YStack padding="$4" gap="$2">
        <H2>Home</H2>
        <Text color="$gray11">네이버 지도</Text>
      </YStack>

      <YStack flex={1} height="100%">
        <NaverMap
          clientId={naverMapClientId}
          latitude={mapCenter.latitude}
          longitude={mapCenter.longitude}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          onMapReady={() => setIsMapReady(true)}
          onCameraChange={handleCameraChange}
        />
      </YStack>

      <XStack padding="$4" justifyContent="space-between" backgroundColor="$gray2">
        <Text fontSize="$2" color="$gray11">
          위도: {mapCenter.latitude.toFixed(6)}
        </Text>
        <Text fontSize="$2" color="$gray11">
          경도: {mapCenter.longitude.toFixed(6)}
        </Text>
        <Text fontSize="$2" color={isMapReady ? '$green10' : '$red10'}>
          {isMapReady ? '지도 준비됨' : '로딩 중...'}
        </Text>
      </XStack>
    </YStack>
  );
}
