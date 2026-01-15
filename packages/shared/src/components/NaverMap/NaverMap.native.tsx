import { NaverMapView, type Camera } from '@mj-studio/react-native-naver-map';
import { Dimensions, type DimensionValue } from 'react-native';
import type { NaverMapProps } from './types';

const getHeight = (height: string | number | undefined): DimensionValue => {
  if (height === undefined) return 400;
  if (typeof height === 'number') return height;
  if (height.endsWith('vh')) {
    const vh = parseFloat(height);
    return (Dimensions.get('window').height * vh) / 100;
  }
  return height as DimensionValue;
};

export function NaverMap({
  latitude,
  longitude,
  zoom = 14,
  style,
  onMapReady,
  onCameraChange,
}: NaverMapProps) {
  const handleCameraChange = (camera: Camera) => {
    onCameraChange?.(camera.latitude, camera.longitude, camera.zoom ?? 14);
  };

  return (
    <NaverMapView
      style={{
        width: (style?.width ?? '100%') as DimensionValue,
        height: getHeight(style?.height),
        flex: style?.flex,
      }}
      initialCamera={{
        latitude,
        longitude,
        zoom,
      }}
      onInitialized={onMapReady}
      onCameraChanged={handleCameraChange}
    />
  );
}
