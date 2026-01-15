import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { NaverMapProps, RequestMarker } from './types';

declare global {
  interface Window {
    naver: typeof naver;
  }
}

export interface NaverMapRef {
  moveTo: (lat: number, lng: number, z?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

// 금액 포맷팅
const formatPrice = (price: number): string => {
  if (price >= 10000) {
    const man = Math.floor(price / 10000);
    const rest = price % 10000;
    if (rest === 0) return `${man}만`;
    return `${man}만 ${rest.toLocaleString()}`;
  }
  return price.toLocaleString();
};

// 마커 HTML 생성
const createMarkerContent = (marker: RequestMarker, isSelected: boolean): string => {
  const bgColor = isSelected ? '#ffffff' : '#6B7CFF';
  const textColor = isSelected ? '#6B7CFF' : '#ffffff';
  const borderColor = '#6B7CFF';

  return `
    <div style="
      background: ${bgColor};
      color: ${textColor};
      border: 2px solid ${borderColor};
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
      transition: all 0.2s ease;
    ">
      <div style="font-size: 11px; opacity: 0.9;">${marker.title}</div>
      <div style="font-size: 13px; font-weight: 700;">${formatPrice(marker.price)}원</div>
    </div>
  `;
};

// CSS 삽입
const injectStyles = () => {
  if (document.getElementById('naver-map-custom-styles')) return;
  const style = document.createElement('style');
  style.id = 'naver-map-custom-styles';
  style.textContent = `
    @keyframes pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.8;
      }
      100% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0;
      }
    }
    .current-location-marker {
      position: relative;
      width: 20px;
      height: 20px;
    }
    .current-location-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: #E53935;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      z-index: 2;
    }
    .current-location-pulse {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      background: rgba(229, 57, 53, 0.4);
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
    }
  `;
  document.head.appendChild(style);
};

export const NaverMap = forwardRef<NaverMapRef, NaverMapProps>(function NaverMap({
  latitude,
  longitude,
  zoom = 14,
  style,
  onMapReady,
  onCameraChange,
  showCurrentLocation = false,
  currentLocationLat,
  currentLocationLng,
  markers = [],
  selectedMarkerId = null,
  onMarkerClick,
}, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const requestMarkersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const initialCoordsRef = useRef({ latitude, longitude, zoom });
  const onCameraChangeRef = useRef(onCameraChange);
  const onMarkerClickRef = useRef(onMarkerClick);

  useImperativeHandle(ref, () => ({
    moveTo: (lat: number, lng: number, z?: number) => {
      if (mapInstanceRef.current && window.naver?.maps) {
        const newCenter = new window.naver.maps.LatLng(lat, lng);
        mapInstanceRef.current.panTo(newCenter, { duration: 300, easing: 'easeOutCubic' });
        if (z !== undefined) {
          setTimeout(() => {
            mapInstanceRef.current?.setZoom(z, true);
          }, 100);
        }
      }
    },
    zoomIn: () => {
      if (mapInstanceRef.current) {
        const currentZoom = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.setZoom(Math.min(currentZoom + 1, 21), true);
      }
    },
    zoomOut: () => {
      if (mapInstanceRef.current) {
        const currentZoom = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.setZoom(Math.max(currentZoom - 1, 6), true);
      }
    },
  }));

  // 콜백 레퍼런스 업데이트
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

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

  // 위치 변경 시에만 지도 이동 (줌은 제외 - 사용자가 직접 조작할 수 있도록)
  useEffect(() => {
    if (mapInstanceRef.current && window.naver?.maps) {
      const newCenter = new window.naver.maps.LatLng(latitude, longitude);
      mapInstanceRef.current.setCenter(newCenter);
    }
  }, [latitude, longitude]);

  // 현재 위치 마커 표시
  useEffect(() => {
    if (!showCurrentLocation || !currentLocationLat || !currentLocationLng) {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
        currentLocationMarkerRef.current = null;
      }
      return;
    }

    if (!mapInstanceRef.current || !window.naver?.maps) return;

    injectStyles();

    const markerContent = `
      <div class="current-location-marker">
        <div class="current-location-pulse"></div>
        <div class="current-location-dot"></div>
      </div>
    `;

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setPosition(
        new window.naver.maps.LatLng(currentLocationLat, currentLocationLng)
      );
    } else {
      currentLocationMarkerRef.current = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(currentLocationLat, currentLocationLng),
        map: mapInstanceRef.current,
        icon: {
          content: markerContent,
          anchor: new window.naver.maps.Point(10, 10),
        },
      });
    }
  }, [showCurrentLocation, currentLocationLat, currentLocationLng]);

  // 의뢰 마커 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return;

    const currentMarkerIds = new Set(markers.map(m => m.id));
    const existingMarkerIds = new Set(requestMarkersRef.current.keys());

    // 삭제된 마커 제거
    existingMarkerIds.forEach(id => {
      if (!currentMarkerIds.has(id)) {
        const marker = requestMarkersRef.current.get(id);
        marker?.setMap(null);
        requestMarkersRef.current.delete(id);
      }
    });

    // 마커 추가/업데이트
    markers.forEach(markerData => {
      const isSelected = markerData.id === selectedMarkerId;
      const existingMarker = requestMarkersRef.current.get(markerData.id);

      if (existingMarker) {
        // 기존 마커 업데이트 (선택 상태 변경 시)
        existingMarker.setIcon({
          content: createMarkerContent(markerData, isSelected),
          anchor: new window.naver.maps.Point(50, 40),
        });
      } else {
        // 새 마커 생성
        const newMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
          map: mapInstanceRef.current!,
          icon: {
            content: createMarkerContent(markerData, isSelected),
            anchor: new window.naver.maps.Point(50, 40),
          },
        });

        // 클릭 이벤트 추가
        window.naver.maps.Event.addListener(newMarker, 'click', () => {
          onMarkerClickRef.current?.(markerData.id);
        });

        requestMarkersRef.current.set(markerData.id, newMarker);
      }
    });
  }, [markers, selectedMarkerId]);

  return (
    <div
      ref={mapRef}
      style={{
        width: style?.width ?? '100%',
        height: style?.height ?? 500,
      }}
    />
  );
});
