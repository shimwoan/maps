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

// 마커 크기 계산 (줌 레벨에 따라) - 세로형
const getMarkerSize = (zoom: number) => {
  const scale = getMarkerScale(zoom);
  return {
    scale,
    width: Math.round(110 * scale),
    fontSize: Math.round(12 * scale),
    fontSizeSm: Math.round(11 * scale),
    fontSizeLg: Math.round(12 * scale),
    badgeFontSize: Math.round(10 * scale),
    borderRadius: Math.round(8 * scale),
    borderWidth: 2,
    arrowWidth: Math.round(12 * scale),
    arrowHeight: Math.round(7 * scale),
    iconSize: Math.round(14 * scale),
    totalHeight: Math.round(90 * scale),
  };
};

// 카테고리별 아이콘 SVG
const getCategoryIcon = (asType: string, size: number, color: string): string => {
  const icons: Record<string, string> = {
    '복합기/OA': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M7 3h10v5H7z" fill="#E5E7EB" stroke="${color}" stroke-width="1.5"/><rect x="4" y="8" width="16" height="8" rx="1" fill="${color}"/><path d="M7 16h10v5H7z" fill="white" stroke="${color}" stroke-width="1"/></svg>`,
    '전기/통신': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#FBBF24" stroke="${color}" stroke-width="1.5"/></svg>`,
    '가전/설비': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="${color}" stroke="${color}" stroke-width="1"/></svg>`,
    '인테리어': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="${color}" stroke="${color}" stroke-width="1.5"/></svg>`,
    '청소': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M12 2v5" stroke="${color}" stroke-width="2" stroke-linecap="round"/><path d="M12 7l5 15H7l5-15z" fill="#FCD34D" stroke="${color}" stroke-width="1.5"/></svg>`,
    '소프트웨어': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" fill="${color}"/><rect x="4" y="5" width="16" height="10" fill="#60A5FA"/></svg>`,
    '운반/설치': `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"><path d="M1 3h15v13H1z" fill="${color}" stroke="${color}" stroke-width="1"/><path d="M16 8h4l3 3v5h-7V8z" fill="#FDBA74" stroke="${color}" stroke-width="1"/></svg>`,
  };
  return icons[asType] || icons['복합기/OA'];
};

// 마커 HTML 생성 - 세로형
const createMarkerContent = (marker: RequestMarker, isSelected: boolean, _isOwn: boolean, isApplied: boolean, zoom: number): string => {
  const isInProgress = marker.status === 'accepted';
  const isCompleted = marker.status === 'completed';
  const isUrgent = marker.isUrgent;

  // 긴급인 경우 빨간색 테마, 아니면 상태에 따른 색상
  // 상태에 따른 border 색상: 긴급(빨강), 완료(회색), 신청중(초록), 진행중(주황), 기본(파랑)
  const borderColor = isUrgent && !isCompleted ? '#EF4444' : isCompleted ? '#9CA3AF' : isApplied ? '#22C55E' : isInProgress ? '#F59E0B' : '#3B82F6';
  const size = getMarkerSize(zoom);

  // 상태 텍스트 (짧게)
  let statusText = '';
  let statusBgColor = '';
  let statusTextColor = '#fff';
  if (isCompleted) {
    statusText = '완료';
    statusBgColor = '#9CA3AF';
  } else if (isApplied) {
    statusText = '신청';
    statusBgColor = '#22C55E';
  } else if (isInProgress) {
    statusText = '진행중';
    statusBgColor = '#F59E0B';
  } else {
    statusText = '대기';
    statusBgColor = '#fff';
    statusTextColor = '#666';
  }

  // 긴급 배지 HTML (긴급이고 완료가 아닌 경우에만)
  const urgentBadge = isUrgent && !isCompleted ? `
    <div style="
      position: absolute;
      top: -8px;
      left: -8px;
      background: #EF4444;
      color: #fff;
      font-size: ${size.badgeFontSize}px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(239, 68, 68, 0.4);
      animation: urgentPulse 1.5s ease-in-out infinite;
    ">긴급</div>
  ` : '';

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,${isUrgent && !isCompleted ? '0.2' : '0.12'}));
    ">
      <div style="
        position: relative;
        background: ${isUrgent && !isCompleted ? '#FEF2F2' : '#ffffff'};
        border: ${size.borderWidth}px solid ${borderColor};
        padding: 6px 8px;
        border-radius: ${size.borderRadius}px;
        width: ${size.width}px;
        box-sizing: border-box;
        cursor: pointer;
        ${isSelected ? `box-shadow: 0 0 0 3px ${borderColor}40;` : ''}
      ">
        ${urgentBadge}

        <!-- 상태 띠 (우측 상단) -->
        <div style="
          position: absolute;
          top: 0;
          right: 0;
          background: ${statusBgColor};
          color: ${statusTextColor};
          font-size: ${size.badgeFontSize}px;
          font-weight: 600;
          padding: 2px 6px;
          border-bottom-left-radius: 6px;
          border-top-right-radius: ${size.borderRadius - 2}px;
        ">${statusText}</div>

        <!-- 카테고리 아이콘 + 카테고리명 -->
        <div style="
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 6px;
          margin-top: 2px;
          white-space: nowrap;
        ">
          ${getCategoryIcon(marker.asType, size.iconSize, isUrgent && !isCompleted ? '#DC2626' : '#888')}
          <span style="font-size: ${size.fontSizeSm}px; color: ${isUrgent && !isCompleted ? '#DC2626' : '#888'}; font-weight: 500;">${marker.asType}</span>
        </div>

        <!-- 제목 (2줄 제한) -->
        <div style="
          font-size: ${size.fontSize}px;
          color: ${isUrgent && !isCompleted ? '#B91C1C' : '#222'};
          font-weight: 600;
          line-height: 1.4;
          max-height: ${Math.round(size.fontSize * 1.4 * 2)}px;
          margin-bottom: 4px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        ">${marker.title}</div>

        <!-- 가격 -->
        <div style="
          font-size: ${size.fontSizeLg}px;
          color: ${borderColor};
          font-weight: 700;
        ">${formatPrice(marker.price)}원</div>
      </div>

      <!-- 화살표 -->
      <svg width="${size.arrowWidth}" height="${size.arrowHeight}" viewBox="0 0 14 8" style="margin-top: -${size.borderWidth}px;">
        <path d="M0,0 L7,8 L14,0" fill="${isUrgent && !isCompleted ? '#FEF2F2' : '#ffffff'}"/>
        <path d="M0,0 L7,8" stroke="${borderColor}" stroke-width="${size.borderWidth}" stroke-linecap="round" fill="none"/>
        <path d="M14,0 L7,8" stroke="${borderColor}" stroke-width="${size.borderWidth}" stroke-linecap="round" fill="none"/>
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
    @keyframes urgentPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.9;
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

// 긴급 스타일 CSS 삽입 (마커용)
const injectUrgentStyles = () => {
  if (document.getElementById('naver-map-urgent-styles')) return;
  const style = document.createElement('style');
  style.id = 'naver-map-urgent-styles';
  style.textContent = `
    @keyframes urgentPulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.9;
      }
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
  appliedRequestIds = [],
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
        injectUrgentStyles();
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
      const isApplied = appliedRequestIds.includes(markerData.id);
      const existingMarker = requestMarkersRef.current.get(markerData.id);
      const size = getMarkerSize(currentZoom);
      // anchor: 마커 콘텐츠의 하단 중앙 (삼각형 꼭지점)
      const anchorX = Math.round(size.width / 2) + size.borderWidth;
      const anchorY = size.totalHeight;

      if (existingMarker) {
        // 기존 마커 업데이트 (선택 상태 또는 줌 변경 시)
        existingMarker.setIcon({
          content: createMarkerContent(markerData, isSelected, isOwn, isApplied, currentZoom),
          anchor: new window.naver.maps.Point(anchorX, anchorY),
        });
        // 선택된 마커는 zIndex를 높여서 가장 앞에 표시
        existingMarker.setZIndex(isSelected ? 1000 : 1);
      } else {
        // 새 마커 생성
        const newMarker = new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
          map: mapInstanceRef.current!,
          icon: {
            content: createMarkerContent(markerData, isSelected, isOwn, isApplied, currentZoom),
            anchor: new window.naver.maps.Point(anchorX, anchorY),
          },
          zIndex: isSelected ? 1000 : 1,
        });

        // 클릭 이벤트 추가
        window.naver.maps.Event.addListener(newMarker, 'click', () => {
          onMarkerClickRef.current?.(markerData.id);
        });

        requestMarkersRef.current.set(markerData.id, newMarker);
      }
    });
  }, [markers, selectedMarkerId, currentUserId, appliedRequestIds, currentZoom, mapReady]);

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
