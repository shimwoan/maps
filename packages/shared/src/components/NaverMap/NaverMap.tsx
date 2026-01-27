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


// 마커 아이콘 SVG 생성 (파란색 복합기 아이콘)
const getMarkerIconSvg = (): string => {
  return `
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none">
      <!-- 그림자 -->
      <ellipse cx="24" cy="52" rx="12" ry="3" fill="rgba(0,0,0,0.25)"/>
      <!-- 메인 바디 (물방울 모양) -->
      <path d="M24 2C14 2 6 10 6 20C6 32 24 48 24 48C24 48 42 32 42 20C42 10 34 2 24 2Z" fill="#3B82F6"/>
      <!-- 하이라이트 -->
      <path d="M24 4C15 4 8 11 8 20C8 28 18 40 24 46C24 46 24 46 24 46" fill="url(#highlight)" opacity="0.3"/>
      <!-- 복합기 아이콘 (흰색) -->
      <g transform="translate(12, 8)">
        <!-- 상단 급지대 -->
        <path d="M6 2h12v4H6z" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="1"/>
        <!-- 메인 본체 -->
        <rect x="4" y="6" width="16" height="10" rx="1" fill="white"/>
        <!-- 디스플레이 -->
        <rect x="6" y="8" width="7" height="4" rx="0.5" fill="#3B82F6"/>
        <!-- 버튼 -->
        <circle cx="16" cy="10" r="1" fill="#3B82F6"/>
        <!-- 하단 출력대 -->
        <path d="M5 16h14v4H5z" fill="rgba(255,255,255,0.7)" stroke="white" stroke-width="1"/>
      </g>
      <defs>
        <linearGradient id="highlight" x1="8" y1="4" x2="24" y2="46">
          <stop offset="0%" stop-color="white"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  `;
};

// 마커 HTML 생성 (단순 아이콘 스타일)
const createMarkerContent = (marker: RequestMarker, _isOwn: boolean, _isApplied: boolean, _zoom: number): string => {
  return `
    <div data-marker-id="${marker.id}" class="marker-box" style="
      cursor: pointer;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
      transition: transform 0.15s ease;
    ">
      ${getMarkerIconSvg()}
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
    .marker-box {
      transition: transform 0.15s ease-out;
    }
    .marker-box:hover {
      transform: scale(1.1);
    }
    .marker-box.selected {
      transform: scale(1.2);
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
        // 마커 앵커는 물방울 끝에 위치
        const anchorX = 24;
        const anchorY = 48;

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
