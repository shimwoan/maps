import { useEffect, useRef, useState } from 'react';
import type { NaverMapProps } from './types';

declare global {
  interface Window {
    naver: typeof naver;
  }
}

export function NaverMap({
  clientId,
  latitude,
  longitude,
  zoom = 14,
  style,
  onMapReady,
  onCameraChange,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!clientId) {
      console.error('NaverMap: clientId is required');
      return;
    }

    if (typeof window !== 'undefined' && window.naver?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.naver?.maps) return;

    const mapOptions: naver.maps.MapOptions = {
      center: new window.naver.maps.LatLng(latitude, longitude),
      zoom,
    };

    const map = new window.naver.maps.Map(mapRef.current, mapOptions);
    mapInstanceRef.current = map;

    onMapReady?.();

    if (onCameraChange) {
      window.naver.maps.Event.addListener(map, 'center_changed', () => {
        const center = map.getCenter();
        const currentZoom = map.getZoom();
        onCameraChange(center.y, center.x, currentZoom);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoaded, latitude, longitude, zoom, onMapReady, onCameraChange]);

  return (
    <div
      ref={mapRef}
      style={{
        width: style?.width ?? '100%',
        height: style?.height ?? '100%',
        flex: style?.flex,
        minHeight: 400,
      }}
    />
  );
}
