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

// 마커 스케일 (줌 레벨에 따라 조절)
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

// 줌 레벨에 따른 클러스터링 정밀도 (소수점 자릿수)
const getClusterPrecision = (zoom: number): number => {
  if (zoom >= 17) return 4;  // 약 10m
  if (zoom >= 15) return 3;  // 약 100m
  if (zoom >= 13) return 2;  // 약 1km
  if (zoom >= 11) return 1;  // 약 10km
  return 1;
};

// 같은 위치의 마커들을 그룹화하여 클러스터 생성 (줌 레벨에 따라 클러스터링 범위 조절)
const createClusters = (markers: RequestMarker[], zoom: number): MarkerCluster[] => {
  const precision = getClusterPrecision(zoom);
  const groupedByLocation = new Map<string, RequestMarker[]>();

  markers.forEach(marker => {
    const key = `${marker.latitude.toFixed(precision)},${marker.longitude.toFixed(precision)}`;
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

// 마커 크기 계산 (줌 레벨에 따라)
const getMarkerSize = (zoom: number) => {
  const scale = getMarkerScale(zoom);
  return {
    scale,
    iconSize: Math.round(32 * scale),
    boxSize: Math.round(48 * scale),
    badgeFontSize: Math.round(10 * scale),
    badgePaddingV: Math.round(2 * scale),
    badgePaddingH: Math.round(5 * scale),
    borderRadius: Math.round(12 * scale),
    borderWidth: Math.max(2, Math.round(3 * scale)),
    arrowWidth: Math.round(16 * scale),
    arrowHeight: Math.round(8 * scale),
  };
};

// asType에 따른 마커 아이콘 생성
const getMarkerIconContent = (asType: string, size: number): string => {
  switch (asType) {
    case 'PC': {
      const pcSize = Math.round(size * 1.1);
      const offset = Math.round((pcSize - size) / 2);
      return `<img src="/pc.png" width="${pcSize}" height="${pcSize}" style="margin-left: -${offset}px; margin-top: -${offset}px;" />`;
    }
    case '복합기/OA':
    default:
      return `<img src="/print.png" width="${size}" height="${size}" />`;
  }
};

// 마커 HTML 생성
const createMarkerContent = (marker: RequestMarker, isOwn: boolean, isApplied: boolean, zoom: number): string => {
  const isInProgress = marker.status === 'accepted';
  const isCompleted = marker.status === 'completed';
  const isUrgent = marker.isUrgent && !isCompleted;

  // 완료: 회색, 진행중: 주황색, 신청중: 초록색, 긴급: 빨간색, 대기: 초록색
  const primaryColor = isCompleted ? '#9CA3AF' : isInProgress ? '#F59E0B' : isApplied ? '#22C55E' : (isUrgent ? '#EF4444' : '#22C55E');
  const bgColor = primaryColor;
  const size = getMarkerSize(zoom);

  // 협업 카테고리 색상
  const collaborationTypeColors: Record<string, string> = {
    '방문AS': '#3B82F6',
    '설치이관': '#10B981',
    '인력지원': '#8B5CF6',
    '원격': '#EC4899',
    '납품': '#F97316',
  };

  // 배지 스타일
  const badgeFontSize = Math.max(9, Math.round(11 * size.scale));
  const badgePaddingV = Math.max(2, Math.round(3 * size.scale));
  const badgePaddingH = Math.max(5, Math.round(6 * size.scale));

  // 협업 카테고리 배지 (상단)
  const collaborationBadge = marker.collaborationType ? `
    <div style="
      background: ${collaborationTypeColors[marker.collaborationType] || '#3B82F6'};
      color: white;
      font-size: ${badgeFontSize}px;
      font-weight: 700;
      padding: ${badgePaddingV}px ${badgePaddingH}px;
      border-radius: 4px;
      border: 1px solid white;
      line-height: 1;
      white-space: nowrap;
    ">${marker.collaborationType}</div>
  ` : '';

  // 긴급 배지 (상단) - RequestCard 스타일과 동일
  const urgentBadge = isUrgent ? `
    <div style="
      background: #FEE2E2;
      color: #DC2626;
      font-size: ${badgeFontSize}px;
      font-weight: 700;
      padding: ${badgePaddingV}px ${badgePaddingH}px;
      border-radius: 4px;
      border: 1px solid white;
      line-height: 1;
      white-space: nowrap;
    ">긴급</div>
  ` : '';

  // 상단 배지들 (협업 카테고리 + 긴급)
  const topBadges = (collaborationBadge || urgentBadge) ? `
    <div style="
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 2px;
      white-space: nowrap;
    ">
      ${collaborationBadge}
      ${urgentBadge}
    </div>
  ` : '';

  // MY 배지 (하단 우측에 작게)
  const badgeSize = Math.max(6, Math.round(8 * size.scale));
  const myBadge = isOwn ? `
    <div style="
      position: absolute;
      bottom: -2px;
      right: -2px;
    ">
      <div style="
        background: #1D4ED8;
        color: white;
        font-size: ${badgeSize}px;
        font-weight: 700;
        padding: 2px 3px;
        border-radius: 3px;
        border: 1px solid white;
        line-height: 1;
      ">MY</div>
    </div>
  ` : '';

  const markerWidth = Math.round(52 * size.scale);
  const markerHeight = Math.round(68 * size.scale);
  const iconSize = Math.round(28 * size.scale);
  const shadowWidth = Math.round(28 * size.scale);
  const shadowHeight = Math.round(8 * size.scale);

  return `
    <div data-marker-id="${marker.id}" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
    ">
      <div class="marker-box" style="
        --marker-border-color: ${primaryColor};
        position: relative;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        user-select: none;
      ">
        <svg width="${markerWidth}" height="${markerHeight}" viewBox="0 0 52 68" fill="none">
          <!-- 마커 핀 형태 -->
          <path d="M26 65 C26 65 50 40 50 24 C50 11 39 0 26 0 C13 0 2 11 2 24 C2 40 26 65 26 65Z" fill="${primaryColor}" />
          <!-- 흰색 원형 배경 -->
          <circle cx="26" cy="24" r="20" fill="white" />
        </svg>
        <div style="
          position: absolute;
          top: ${Math.round(12 * size.scale)}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${iconSize}px;
          height: ${iconSize}px;
        ">
          ${getMarkerIconContent(marker.asType, iconSize)}
        </div>
        ${topBadges}
        ${myBadge}
      </div>
      <!-- 그림자 -->
      <div style="
        width: ${shadowWidth}px;
        height: ${shadowHeight}px;
        background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%);
        border-radius: 50%;
        margin-top: ${Math.round(2 * size.scale)}px;
      "></div>
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
  const prevZoomRef = useRef(zoom);

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
          // 줌이 실제로 변경된 경우에만 상태 업데이트 (불필요한 마커 재생성 방지)
          setCurrentZoom(prev => prev !== newZoom ? newZoom : prev);
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
    const clusters = createClusters(markers, currentZoom);

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
        // 마커 앵커는 (0, 0)으로 설정하고 CSS transform으로 위치 조정
        const anchorX = 0;
        const anchorY = 0;

        if (existingMarker) {
          // 기존 마커가 있으면 위치 업데이트
          existingMarker.setPosition(new window.naver.maps.LatLng(markerData.latitude, markerData.longitude));
          // 줌이 변경되거나 마커 상태가 변경된 경우 아이콘 업데이트 (실시간 상태 반영)
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

    // 이전 줌 레벨 저장
    prevZoomRef.current = currentZoom;
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
