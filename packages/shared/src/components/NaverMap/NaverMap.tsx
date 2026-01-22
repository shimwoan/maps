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

// 클러스터 타입
interface MarkerCluster {
  key: string;
  latitude: number;
  longitude: number;
  markers: RequestMarker[];
}

// 같은 위치의 마커들을 그룹화하여 클러스터 생성
const createClusters = (markers: RequestMarker[]): MarkerCluster[] => {
  const groupedByLocation = new Map<string, RequestMarker[]>();

  markers.forEach(marker => {
    // 소수점 5자리까지 비교 (약 1m 정확도)
    const key = `${marker.latitude.toFixed(5)},${marker.longitude.toFixed(5)}`;
    if (!groupedByLocation.has(key)) {
      groupedByLocation.set(key, []);
    }
    groupedByLocation.get(key)!.push(marker);
  });

  const clusters: MarkerCluster[] = [];
  groupedByLocation.forEach((group, key) => {
    const avgLat = group.reduce((sum, m) => sum + m.latitude, 0) / group.length;
    const avgLng = group.reduce((sum, m) => sum + m.longitude, 0) / group.length;
    clusters.push({
      key,
      latitude: avgLat,
      longitude: avgLng,
      markers: group,
    });
  });

  return clusters;
};

// 클러스터 마커 HTML 생성
const createClusterContent = (count: number, clusterKey: string): string => {
  return `
    <div data-cluster-key="${clusterKey}" class="cluster-marker" style="
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
      border-radius: 50%;
      border: 3px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.25));
    ">
      <span style="
        color: white;
        font-size: 15px;
        font-weight: 700;
      ">${count}</span>
    </div>
  `;
};

// 마커 크기 계산 - 고정 80x80
const getMarkerSize = (zoom: number) => {
  const scale = getMarkerScale(zoom);
  return {
    scale,
    width: 86, // 고정 86px
    height: 86, // 고정 86px
    fontSize: 11,
    fontSizeSm: 10,
    fontSizeLg: 12,
    badgeFontSize: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    arrowWidth: 12,
    arrowHeight: 7,
    iconSize: 14,
    totalHeight: 93, // 86 + 7 (arrow)
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
const createMarkerContent = (marker: RequestMarker, _isOwn: boolean, isApplied: boolean, zoom: number): string => {
  const isInProgress = marker.status === 'accepted';
  const isCompleted = marker.status === 'completed';
  const isUrgent = marker.isUrgent;

  // 상태에 따른 border 색상: 완료(회색), 진행중(주황), 신청중(초록), 긴급대기(빨강), 기본(파랑)
  const borderColor = isCompleted ? '#9CA3AF' : isInProgress ? '#F59E0B' : isApplied ? '#22C55E' : isUrgent ? '#EF4444' : '#3B82F6';
  const size = getMarkerSize(zoom);

  // 상태 텍스트 (짧게)
  let statusText = '';
  let statusBgColor = '';
  let statusTextColor = '#fff';
  if (isCompleted) {
    statusText = '완료';
    statusBgColor = '#9CA3AF';
  } else if (isInProgress) {
    statusText = '진행중';
    statusBgColor = '#F59E0B';
  } else {
    // pending, applied 모두 대기로 표시
    statusText = '대기';
    statusBgColor = '#fff';
    statusTextColor = '#3B82F6';
  }

  // 긴급 배지 HTML (상태 배지 옆에 표시)
  const urgentBadge = isUrgent && !isCompleted ? `
    <div style="
      background: #EF4444;
      color: #fff;
      font-size: ${size.badgeFontSize}px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    ">긴급</div>
  ` : '';

  return `
    <div data-marker-id="${marker.id}" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,${isUrgent && !isCompleted ? '0.2' : '0.12'}));
    ">
      <div class="marker-box" style="
        --marker-border-color: ${borderColor};
        position: relative;
        background: #ffffff;
        border: ${size.borderWidth}px solid ${borderColor};
        padding: 10px 8px 6px 8px;
        border-radius: ${size.borderRadius}px;
        width: ${size.width}px;
        height: ${size.height}px;
        min-height: ${size.height}px;
        max-height: ${size.height}px;
        box-sizing: border-box;
        cursor: pointer;
        display: flex;
        flex-direction: column;
      ">
        <!-- 상태 배지 + 긴급 배지 (좌측 상단) -->
        <div style="
          position: absolute;
          top: -10px;
          left: -5px;
          display: flex;
          gap: 4px;
        ">
          <div style="
            background: ${statusBgColor};
            color: ${statusTextColor};
            font-size: ${size.badgeFontSize}px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            ${statusText === '대기' ? 'border: 1px solid #e5e7eb;' : ''}
          ">${statusText}</div>
          ${urgentBadge}
        </div>

        <!-- 상단 콘텐츠 -->
        <div style="flex: 1; overflow: hidden;">
          <!-- 카테고리 아이콘 + 카테고리명 -->
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 4px;
            margin-top: 2px;
            white-space: nowrap;
          ">
            ${getCategoryIcon(marker.asType, size.iconSize, '#333')}
            <span style="font-size: ${size.fontSizeSm}px; color: #333; font-weight: 500;">${marker.asType}</span>
          </div>

          <!-- 제목 (2줄 제한) -->
          <div style="
            font-size: ${size.fontSize}px;
            color: #222;
            font-weight: 600;
            line-height: 1.3;
            max-height: ${Math.round(size.fontSize * 1.3 * 2)}px;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          ">${marker.title}</div>
        </div>

        <!-- 가격 (항상 하단) -->
        <div style="
          font-size: ${size.fontSizeSm}px;
          color: #333;
          font-weight: normal;
          margin-top: auto;
        ">${formatPrice(marker.price)}원</div>
      </div>

      <!-- 화살표 -->
      <svg width="${size.arrowWidth}" height="${size.arrowHeight + 3}" viewBox="0 -3 14 11" style="margin-top: -${size.borderWidth + 2}px; position: relative; z-index: 1;">
        <rect x="0" y="-3" width="14" height="4" fill="#ffffff"/>
        <path d="M0,0 L7,8 L14,0" fill="#ffffff"/>
        <path d="M1,0 L7,7" stroke="${borderColor}" stroke-width="${size.borderWidth}" stroke-linecap="round" fill="none"/>
        <path d="M13,0 L7,7" stroke="${borderColor}" stroke-width="${size.borderWidth}" stroke-linecap="round" fill="none"/>
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
    .marker-box {
      transition: box-shadow 0.15s ease-out;
    }
    .marker-box.selected {
      box-shadow: 0 0 0 3px var(--marker-border-color, #3B82F6)40 !important;
    }
    .cluster-marker {
      transition: box-shadow 0.15s ease-out;
    }
    .cluster-marker.selected {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5) !important;
    }
  `;
  document.head.appendChild(style);
};

export const NaverMap = forwardRef<NaverMapRef, NaverMapProps>(function NaverMap({
  latitude,
  longitude,
  zoom = 12,
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
  onClusterClick,
  selectedClusterKey = null,
}, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const currentLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const requestMarkersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const clusterMarkersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const initialCoordsRef = useRef({ latitude, longitude, zoom });
  const onCameraChangeRef = useRef(onCameraChange);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  const onClusterClickRef = useRef(onClusterClick);
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

  useEffect(() => {
    onClusterClickRef.current = onClusterClick;
  }, [onClusterClick]);

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
          zoomControlOptions: {
            position: window.naver.maps.Position.LEFT_BOTTOM,
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

  // 의뢰 마커 표시 (클러스터링 적용)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return;

    markersDataRef.current = markers;

    // 클러스터 생성
    const clusters = createClusters(markers);

    // 현재 필요한 마커/클러스터 ID 추적
    const neededSingleMarkerIds = new Set<string>();
    const neededClusterKeys = new Set<string>();

    clusters.forEach(cluster => {
      if (cluster.markers.length === 1) {
        neededSingleMarkerIds.add(cluster.markers[0].id);
      } else {
        neededClusterKeys.add(cluster.key);
      }
    });

    // 불필요한 단일 마커 제거
    requestMarkersRef.current.forEach((marker, id) => {
      if (!neededSingleMarkerIds.has(id)) {
        marker.setMap(null);
        requestMarkersRef.current.delete(id);
      }
    });

    // 불필요한 클러스터 마커 제거
    clusterMarkersRef.current.forEach((marker, key) => {
      if (!neededClusterKeys.has(key)) {
        marker.setMap(null);
        clusterMarkersRef.current.delete(key);
      }
    });

    // 클러스터/마커 추가/업데이트
    clusters.forEach(cluster => {
      if (cluster.markers.length === 1) {
        // 단일 마커
        const markerData = cluster.markers[0];
        const isOwn = currentUserId ? markerData.userId === currentUserId : false;
        const isApplied = appliedRequestIds.includes(markerData.id);
        const existingMarker = requestMarkersRef.current.get(markerData.id);
        const size = getMarkerSize(currentZoom);
        const anchorX = Math.round(size.width / 2) + size.borderWidth;
        const anchorY = size.totalHeight;

        if (existingMarker) {
          // 기존 마커가 있으면 위치만 업데이트 (아이콘은 데이터가 변경된 경우에만)
          existingMarker.setPosition(new window.naver.maps.LatLng(markerData.latitude, markerData.longitude));
          // 마커 데이터가 변경되었을 수 있으므로 아이콘도 업데이트
          existingMarker.setIcon({
            content: createMarkerContent(markerData, isOwn, isApplied, currentZoom),
            anchor: new window.naver.maps.Point(anchorX, anchorY),
          });
        } else {
          const newMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(markerData.latitude, markerData.longitude),
            map: mapInstanceRef.current!,
            icon: {
              content: createMarkerContent(markerData, isOwn, isApplied, currentZoom),
              anchor: new window.naver.maps.Point(anchorX, anchorY),
            },
            zIndex: 1,
          });

          window.naver.maps.Event.addListener(newMarker, 'click', () => {
            onMarkerClickRef.current?.(markerData.id);
          });

          requestMarkersRef.current.set(markerData.id, newMarker);
        }
      } else {
        // 클러스터 마커 (2개 이상)
        const existingCluster = clusterMarkersRef.current.get(cluster.key);

        if (existingCluster) {
          existingCluster.setPosition(new window.naver.maps.LatLng(cluster.latitude, cluster.longitude));
          existingCluster.setIcon({
            content: createClusterContent(cluster.markers.length, cluster.key),
            anchor: new window.naver.maps.Point(22, 44),
          });
        } else {
          const clusterMarker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(cluster.latitude, cluster.longitude),
            map: mapInstanceRef.current!,
            icon: {
              content: createClusterContent(cluster.markers.length, cluster.key),
              anchor: new window.naver.maps.Point(22, 44),
            },
            zIndex: 500,
          });

          // 클러스터 클릭 시
          const clusterLat = cluster.latitude;
          const clusterLng = cluster.longitude;
          const clusterMarkerIds = cluster.markers.map(m => m.id);
          const clusterKey = cluster.key;

          window.naver.maps.Event.addListener(clusterMarker, 'click', () => {
            if (onClusterClickRef.current) {
              onClusterClickRef.current(clusterMarkerIds, clusterLat, clusterLng, clusterKey);
            } else {
              // 기본 동작: 해당 위치로 줌인
              mapInstanceRef.current?.setCenter(new window.naver.maps.LatLng(clusterLat, clusterLng));
              mapInstanceRef.current?.setZoom(Math.min((mapInstanceRef.current?.getZoom() || 12) + 2, 19));
            }
          });

          clusterMarkersRef.current.set(cluster.key, clusterMarker);
        }
      }
    });
  }, [markers, currentUserId, appliedRequestIds, currentZoom, mapReady]);

  // 선택 상태 변경 시 DOM 클래스만 토글 (깜빡거림 방지)
  useEffect(() => {
    if (!mapRef.current) return;

    // 모든 마커에서 selected 클래스 제거
    const allMarkerBoxes = mapRef.current.querySelectorAll('.marker-box');
    allMarkerBoxes.forEach(el => el.classList.remove('selected'));

    // 모든 클러스터에서 selected 클래스 제거
    const allClusterMarkers = mapRef.current.querySelectorAll('.cluster-marker');
    allClusterMarkers.forEach(el => el.classList.remove('selected'));

    // 선택된 마커에 selected 클래스 추가 및 zIndex 변경
    if (selectedMarkerId) {
      const selectedEl = mapRef.current.querySelector(`[data-marker-id="${selectedMarkerId}"]`);
      if (selectedEl) {
        const markerBox = selectedEl.querySelector('.marker-box');
        if (markerBox) {
          markerBox.classList.add('selected');
        }
      }
      // zIndex 변경
      const marker = requestMarkersRef.current.get(selectedMarkerId);
      if (marker) {
        marker.setZIndex(1000);
      }
    }

    // 이전에 선택되었던 마커들의 zIndex 원복
    requestMarkersRef.current.forEach((marker, id) => {
      if (id !== selectedMarkerId) {
        marker.setZIndex(1);
      }
    });

    // 선택된 클러스터에 selected 클래스 추가 및 zIndex 변경
    if (selectedClusterKey) {
      const selectedClusterEl = mapRef.current.querySelector(`[data-cluster-key="${selectedClusterKey}"]`);
      if (selectedClusterEl) {
        selectedClusterEl.classList.add('selected');
      }
      // zIndex 변경
      const cluster = clusterMarkersRef.current.get(selectedClusterKey);
      if (cluster) {
        cluster.setZIndex(1000);
      }
    }

    // 이전에 선택되었던 클러스터들의 zIndex 원복
    clusterMarkersRef.current.forEach((cluster, key) => {
      if (key !== selectedClusterKey) {
        cluster.setZIndex(500);
      }
    });
  }, [selectedMarkerId, selectedClusterKey]);

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
