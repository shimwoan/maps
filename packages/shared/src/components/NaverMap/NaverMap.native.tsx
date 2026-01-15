import { NaverMapView, type Camera } from '@mj-studio/react-native-naver-map';
import type { DimensionValue } from 'react-native';
import type { NaverMapProps } from './types';

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
        height: (style?.height ?? 400) as DimensionValue,
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
