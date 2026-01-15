import { useEffect, useRef } from 'react';
import type { NaverMapProps } from './types';

declare global {
  interface Window {
    naver: typeof naver;
  }
}

export function NaverMap({
  latitude,
  longitude,
  zoom = 14,
  style,
  onMapReady,
  onCameraChange,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      if (window.naver?.maps && mapRef.current) {
        const map = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(latitude, longitude),
          zoom,
        });
        mapInstanceRef.current = map;
        onMapReady?.();

        if (onCameraChange) {
          window.naver.maps.Event.addListener(map, 'center_changed', () => {
            const center = map.getCenter();
            const currentZoom = map.getZoom();
            onCameraChange(center.y, center.x, currentZoom);
          });
        }
      } else {
        setTimeout(initMap, 100);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, zoom, onMapReady, onCameraChange]);

  return (
    <div
      ref={mapRef}
      style={{
        width: style?.width ?? '100%',
        height: style?.height ?? 500,
      }}
    />
  );
}
