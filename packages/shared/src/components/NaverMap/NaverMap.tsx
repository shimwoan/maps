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
  const initialCoordsRef = useRef({ latitude, longitude, zoom });
  const onCameraChangeRef = useRef(onCameraChange);

  // 콜백 레퍼런스 업데이트
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  // 지도 초기화 (한 번만 실행)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (window.naver?.maps && mapRef.current) {
        const { latitude: lat, longitude: lng, zoom: z } = initialCoordsRef.current;
        const map = new window.naver.maps.Map(mapRef.current, {
          center: new window.naver.maps.LatLng(lat, lng),
          zoom: z,
          logoControlOptions: {
            position: window.naver.maps.Position.BOTTOM_LEFT,
          },
          scaleControl: false,
          mapDataControl: false,
        });
        mapInstanceRef.current = map;
        onMapReady?.();

        window.naver.maps.Event.addListener(map, 'idle', () => {
          const center = map.getCenter();
          const currentZoom = map.getZoom();
          onCameraChangeRef.current?.(center.y, center.x, currentZoom);
        });
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
  }, [onMapReady]);

  // 위치/줌 변경 시 지도 이동
  useEffect(() => {
    if (mapInstanceRef.current && window.naver?.maps) {
      const newCenter = new window.naver.maps.LatLng(latitude, longitude);
      mapInstanceRef.current.setCenter(newCenter);
      mapInstanceRef.current.setZoom(zoom);
    }
  }, [latitude, longitude, zoom]);

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
