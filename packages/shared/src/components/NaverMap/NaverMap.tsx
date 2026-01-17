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
    fontSize: Math.round(14 * scale),
    fontSizeSm: Math.round(13 * scale),
    fontSizeLg: Math.round(16 * scale),
    badgeFontSize: Math.round(11 * scale),
    paddingV: Math.round(10 * scale),
    paddingH: Math.round(14 * scale),
    badgePaddingV: Math.round(2 * scale),
    badgePaddingH: Math.round(6 * scale),
    borderRadius: Math.round(12 * scale),
    borderWidth: Math.max(2, Math.round(2.5 * scale)),
    arrowWidth: Math.round(20 * scale),
    arrowHeight: Math.round(10 * scale),
    // 마커 전체 높이 추정 (anchor 계산용)
    totalHeight: Math.round(75 * scale),
  };
};

// 마커 HTML 생성
const createMarkerContent = (marker: RequestMarker, isSelected: boolean, _isOwn: boolean, isApplied: boolean, zoom: number): string => {
  const isInProgress = marker.status === 'accepted';
  const isCompleted = marker.status === 'completed';
  // 완료: 회색, 신청중: 초록색, 진행중: 주황색, 기본: 파란색
  const primaryColor = isCompleted ? '#9CA3AF' : isApplied ? '#22C55E' : isInProgress ? '#F59E0B' : '#3B82F6';
  const bgColor = isSelected ? '#ffffff' : primaryColor;
  const textColor = isSelected ? primaryColor : '#ffffff';
  const borderColor = primaryColor;
  const size = getMarkerSize(zoom);

  let badge = '';
  if (isCompleted) {
    badge = `<span style="font-size: ${size.badgeFontSize}px; background: ${isSelected ? primaryColor : 'rgba(255,255,255,0.3)'}; color: #fff; padding: ${size.badgePaddingV}px ${size.badgePaddingH}px; border-radius: 4px; margin-right: 6px; font-weight: 700;">완료</span>`;
  } else if (isApplied) {
    badge = `<span style="font-size: ${size.badgeFontSize}px; background: ${isSelected ? primaryColor : 'rgba(255,255,255,0.3)'}; color: #fff; padding: ${size.badgePaddingV}px ${size.badgePaddingH}px; border-radius: 4px; margin-right: 6px; font-weight: 700;">신청중</span>`;
  } else if (isInProgress) {
    badge = `<span style="font-size: ${size.badgeFontSize}px; background: ${isSelected ? primaryColor : 'rgba(255,255,255,0.3)'}; color: #fff; padding: ${size.badgePaddingV}px ${size.badgePaddingH}px; border-radius: 4px; margin-right: 6px; font-weight: 700;">협업중</span>`;
  }

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.2));
    ">
      <div style="
        background: ${bgColor};
        color: ${textColor};
        border: ${size.borderWidth}px solid ${borderColor};
        padding: ${size.paddingV}px ${size.paddingH}px;
        border-radius: ${size.borderRadius}px;
        font-size: ${size.fontSize}px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
      ">
        <div style="font-size: ${size.fontSizeSm}px; opacity: 0.9; text-align: center;">${badge}${marker.title} | ${marker.asType}</div>
        <div style="font-size: ${size.fontSizeLg}px; font-weight: 700; text-align: center;">${formatPrice(marker.price)}원</div>
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
      // 콘텐츠 너비는 가변이므로 size 기반으로 추정
      const anchorX = Math.round(75 * size.scale); // 대략적인 마커 너비의 절반
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
