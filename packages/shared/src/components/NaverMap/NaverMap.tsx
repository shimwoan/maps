import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
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

// 줌 레벨에 따른 스케일 계산
const getMarkerScale = (zoom: number): number => {
  if (zoom >= 16) return 1;
  if (zoom >= 14) return 0.9;
  if (zoom >= 12) return 0.8;
  if (zoom >= 10) return 0.7;
  return 0.6;
};

// 마커 크기 계산 (줌 레벨에 따라)
const getMarkerSize = (zoom: number) => {
  const scale = getMarkerScale(zoom);
  return {
    scale,
    fontSize: Math.round(13 * scale),
    fontSizeSm: Math.round(12 * scale),
    fontSizeLg: Math.round(15 * scale),
    badgeFontSize: Math.round(10 * scale),
    paddingV: Math.round(10 * scale),
    paddingH: Math.round(14 * scale),
    badgePaddingV: Math.round(2 * scale),
    badgePaddingH: Math.round(6 * scale),
    borderRadius: Math.round(12 * scale),
    borderWidth: Math.max(2, Math.round(2.5 * scale)),
    arrowWidth: Math.round(20 * scale),
    arrowHeight: Math.round(10 * scale),
    iconSize: Math.round(28 * scale),
    // 마커 전체 높이 추정 (anchor 계산용)
    totalHeight: Math.round(85 * scale),
  };
};

// 카테고리별 아이콘 SVG
const getCategoryIcon = (asType: string, size: number, color: string): string => {
  const icons: Record<string, string> = {
    '복합기/OA': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h10v5H7z" fill="${color}" opacity="0.3"/>
      <rect x="4" y="8" width="16" height="8" rx="1" fill="${color}"/>
      <path d="M7 16h10v5H7z" fill="white" stroke="${color}" stroke-width="1"/>
      <circle cx="17" cy="12" r="1.5" fill="#22C55E"/>
    </svg>`,
    '전기/통신': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="${color}"/>
    </svg>`,
    '가전/설비': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="${color}"/>
    </svg>`,
    '인테리어': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="${color}"/>
      <path d="M9 22V12h6v10" fill="white" opacity="0.5"/>
    </svg>`,
    '청소': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v5" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <path d="M12 7l5 15H7l5-15z" fill="${color}"/>
    </svg>`,
    '소프트웨어': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="14" rx="2" fill="${color}"/>
      <rect x="4" y="5" width="16" height="10" fill="white" opacity="0.3"/>
      <path d="M8 21h8M12 17v4" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    '운반/설치': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
      <path d="M1 3h15v13H1z" fill="${color}"/>
      <path d="M16 8h4l3 3v5h-7V8z" fill="${color}" opacity="0.7"/>
      <circle cx="5.5" cy="18.5" r="2.5" fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="18.5" cy="18.5" r="2.5" fill="${color}" stroke="white" stroke-width="1.5"/>
    </svg>`,
  };
  return icons[asType] || icons['복합기/OA'];
};

// 마커 HTML 생성
const createMarkerContent = (marker: RequestMarker, isSelected: boolean, _isOwn: boolean, zoom: number): string => {
  const isInProgress = marker.status === 'accepted';
  // 진행중: 주황색, 기본: 파란색
  const primaryColor = isInProgress ? '#F59E0B' : '#3B82F6';
  const bgColor = isSelected ? '#ffffff' : primaryColor;
  const textColor = isSelected ? primaryColor : '#ffffff';
  const borderColor = primaryColor;
  const iconColor = isSelected ? primaryColor : '#ffffff';
  const size = getMarkerSize(zoom);

  let badge = '';
  if (isInProgress) {
    badge = `<div style="
      position: absolute;
      top: -${Math.round(8 * size.scale)}px;
      left: 50%;
      transform: translateX(-50%);
      font-size: ${size.badgeFontSize}px;
      background: #F59E0B;
      color: #fff;
      padding: ${size.badgePaddingV}px ${size.badgePaddingH}px;
      border-radius: ${Math.round(10 * size.scale)}px;
      white-space: nowrap;
      font-weight: 700;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">협업중</div>`;
  }

  const categoryIcon = getCategoryIcon(marker.asType, size.iconSize, iconColor);

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.2));
    ">
      <div style="
        position: relative;
        background: ${bgColor};
        color: ${textColor};
        border: ${size.borderWidth}px solid ${borderColor};
        padding: ${size.paddingV}px ${size.paddingH}px;
        border-radius: ${size.borderRadius}px;
        font-size: ${size.fontSize}px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: ${Math.round(10 * size.scale)}px;
      ">
        ${badge}
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${size.iconSize}px;
          height: ${size.iconSize}px;
          flex-shrink: 0;
        ">
          ${categoryIcon}
        </div>
        <div style="display: flex; flex-direction: column; gap: ${Math.round(2 * size.scale)}px;">
          <div style="font-size: ${size.fontSizeSm}px; opacity: 0.9;">${marker.title}</div>
          <div style="font-size: ${size.fontSizeLg}px; font-weight: 700;">${formatPrice(marker.price)}원</div>
        </div>
      </div>
      <svg width="${size.arrowWidth}" height="${size.arrowHeight}" viewBox="0 0 16 8" style="margin-top: -1px;">
        <path d="M0,0 L8,8 L16,0" fill="${bgColor}" stroke="${borderColor}" stroke-width="${size.borderWidth}" stroke-linejoin="round"/>
      </svg>
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
  currentUserId = null,
  onMarkerClick,
  onMapClick,
}, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const requestMarkersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const initialCoordsRef = useRef({ latitude, longitude, zoom });
  const onCameraChangeRef = useRef(onCameraChange);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [mapReady, setMapReady] = useState(false);
  const markersDataRef = useRef<RequestMarker[]>([]);

  useImperativeHandle(ref, () => ({
    moveTo: (lat: number, lng: number, z?: number) => {
      if (mapInstanceRef.current && window.naver?.maps) {
        const map = mapInstanceRef.current as naver.maps.Map & { panTo: (coord: naver.maps.LatLng, options?: object) => void };
        const newCenter = new window.naver.maps.LatLng(lat, lng);
        // 줌 변경이 있으면 애니메이션 없이 즉시 이동
        if (z !== undefined) {
          map.setCenter(newCenter);
          map.setZoom(z);
        } else {
          map.panTo(newCenter, { duration: 300, easing: 'easeOutCubic' });
        }
      }
    },
    zoomIn: () => {
      if (mapInstanceRef.current) {
        const currentZoom = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.setZoom(Math.min(currentZoom + 1, 21));
      }
    },
    zoomOut: () => {
      if (mapInstanceRef.current) {
        const currentZoom = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.setZoom(Math.max(currentZoom - 1, 6));
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

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

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
        setMapReady(true);
        onMapReady?.();

        window.naver.maps.Event.addListener(map, 'idle', () => {
          const center = map.getCenter();
          const newZoom = map.getZoom();
          setCurrentZoom(newZoom);
          onCameraChangeRef.current?.(center.y, center.x, newZoom);
        });

        // 지도 클릭 시 선택 해제
        window.naver.maps.Event.addListener(map, 'click', () => {
          onMapClickRef.current?.();
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

    if (!mapReady || !mapInstanceRef.current || !window.naver?.maps) return;

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
  }, [showCurrentLocation, currentLocationLat, currentLocationLng, mapReady]);

  // 의뢰 마커 표시
  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return;

    markersDataRef.current = markers;

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
      const isOwn = currentUserId ? markerData.userId === currentUserId : false;
      const existingMarker = requestMarkersRef.current.get(markerData.id);
      const size = getMarkerSize(currentZoom);
      // anchor: 마커 콘텐츠의 하단 중앙 (삼각형 꼭지점)
      // 콘텐츠 너비는 가변이므로 size 기반으로 추정
      const anchorX = Math.round(90 * size.scale); // 대략적인 마커 너비의 절반
      const anchorY = size.totalHeight;

      if (existingMarker) {
        // 기존 마커 업데이트 (선택 상태 또는 줌 변경 시)
        existingMarker.setIcon({
          content: createMarkerContent(markerData, isSelected, isOwn, currentZoom),
          anchor: new window.naver.maps.Point(anchorX, anchorY),
        });
      } else {
        // 새 마커 생성
        const newMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
          map: mapInstanceRef.current!,
          icon: {
            content: createMarkerContent(markerData, isSelected, isOwn, currentZoom),
            anchor: new window.naver.maps.Point(anchorX, anchorY),
          },
        });

        // 클릭 이벤트 추가
        window.naver.maps.Event.addListener(newMarker, 'click', () => {
          onMarkerClickRef.current?.(markerData.id);
        });

        requestMarkersRef.current.set(markerData.id, newMarker);
      }
    });
  }, [markers, selectedMarkerId, currentUserId, currentZoom, mapReady]);

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
