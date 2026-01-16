import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, XStack, Spinner } from 'tamagui';
import { NaverMap, NaverMapRef } from '../components/NaverMap';
import type { RequestMarker } from '../components/NaverMap';
import { RegionSelectModal } from '../components/RegionSelectModal';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { LoginModal } from '../components/LoginModal';
import { RequestFormModal } from '../components/RequestFormModal';
import { RequestDetailCard } from '../components/RequestDetailCard';
import { MyPage } from './MyPage';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../hooks/useRequests';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { DONG_LIST, SIGUNGU_LIST } from '../data/regions';

interface Location {
  latitude: number;
  longitude: number;
}

interface Address {
  sido: string;      // 도/시
  sigungu: string;   // 시/군/구
  dong: string;      // 읍/면/동
}

const DEFAULT_LOCATION: Location = {
  latitude: 37.5665,
  longitude: 126.978,
};

// 위치 권한 요청 및 위치 가져오기
async function requestAndGetLocation(): Promise<{ location: Location; granted: boolean; permissionState?: string }> {
  if (!navigator.geolocation) {
    return { location: DEFAULT_LOCATION, granted: false };
  }

  // 권한 상태 확인
  let permissionState = 'unknown';
  if (navigator.permissions) {
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      permissionState = status.state;
      console.log('위치 권한 상태:', permissionState);
    } catch (e) {
      console.log('Permissions API 미지원');
    }
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          granted: true,
          permissionState,
        });
      },
      (error) => {
        console.log('위치 오류:', error.code, error.message);
        resolve({ location: DEFAULT_LOCATION, granted: false, permissionState });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// 좌표로 가장 가까운 동 찾기
function findNearestDong(latitude: number, longitude: number): Address | null {
  let nearest = null;
  let minDistance = Infinity;

  for (const dong of DONG_LIST) {
    const distance = Math.pow(dong.lat - latitude, 2) + Math.pow(dong.lng - longitude, 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = dong;
    }
  }

  if (!nearest) return null;

  const sigungu = SIGUNGU_LIST.find(s => s.code === nearest.sigungu);
  return {
    sido: '',
    sigungu: sigungu?.name || '',
    dong: nearest.name,
  };
}

function getAddressFromCoords(latitude: number, longitude: number): Address | null {
  return findNearestDong(latitude, longitude);
}

const MIN_ZOOM_FOR_ADDRESS = 14;

export function HomeScreen() {
  const [location, setLocation] = useState<Location | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [address, setAddress] = useState<Address | null>(null);
  const [zoom, setZoom] = useState(14);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const skipAddressUpdateRef = useRef(false);
  const naverMapRef = useRef<NaverMapRef>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { requests, refetch: refetchRequests } = useRequests();

  // 의뢰를 마커 형식으로 변환
  const markers: RequestMarker[] = useMemo(() => {
    return requests
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        id: r.id,
        userId: r.user_id,
        latitude: r.latitude!,
        longitude: r.longitude!,
        title: r.title,
        price: r.expected_fee,
        visitType: r.visit_type,
        asType: r.as_type,
        status: r.status,
      }));
  }, [requests]);

  // 선택된 의뢰 정보
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return requests.find(r => r.id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  // 주소 조회 (debounce 적용)
  const fetchAddressDebounced = (latitude: number, longitude: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setAddress(getAddressFromCoords(latitude, longitude));
    }, 500);
  };

  // + 버튼 클릭 핸들러
  const handleFabPress = () => {
    if (!user) {
      // 로그인 후 의뢰 등록 모달을 열기 위해 저장
      sessionStorage.setItem('openRequestModalAfterLogin', 'true');
      // 로그인 안됨 -> 로그인 모달
      setIsLoginModalOpen(true);
    } else {
      // 로그인됨 -> 의뢰 등록 모달
      setIsRequestModalOpen(true);
    }
  };

  // 로그인 후 의뢰 등록 모달 자동 열기
  useEffect(() => {
    if (user && sessionStorage.getItem('openRequestModalAfterLogin') === 'true') {
      sessionStorage.removeItem('openRequestModalAfterLogin');
      setIsRequestModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    // 사이트 접속 시 위치 권한 요청
    console.log('위치 권한 요청 시작');
    requestAndGetLocation().then(({ location: loc, granted }) => {
      console.log('위치 권한 결과:', granted, loc);
      setLocation(loc);
      if (granted) {
        setCurrentLocation(loc);
        setZoom(16);
      }
      setIsLocationLoading(false);
      // 초기 로딩 후 카메라 변경 시 중복 호출 방지
      skipAddressUpdateRef.current = true;
      fetchAddressDebounced(loc.latitude, loc.longitude);
    });
  }, []);

  const handleCameraChange = (latitude: number, longitude: number, currentZoom: number) => {
    setZoom(currentZoom);
    // 지역 선택 직후 또는 초기 로딩 직후에는 주소 업데이트 스킵
    if (skipAddressUpdateRef.current) {
      skipAddressUpdateRef.current = false;
      return;
    }

    if (currentZoom >= MIN_ZOOM_FOR_ADDRESS) {
      fetchAddressDebounced(latitude, longitude);
    }
  };

  const handleRegionSelect = (region: { name: string; lat: number; lng: number; zoom?: number }) => {
    // 지역 선택 후 카메라 이동 시 주소 업데이트 스킵 설정
    skipAddressUpdateRef.current = true;

    const newZoom = region.zoom || zoom;
    setLocation({ latitude: region.lat, longitude: region.lng });
    setZoom(newZoom);

    // 지도 이동
    naverMapRef.current?.moveTo(region.lat, region.lng, newZoom);

    // 선택한 지역명을 직접 사용 (BigDataCloud 대신)
    const parts = region.name.split(' ');
    if (parts.length >= 2) {
      // "중구 소공동" 형태
      setAddress({ sido: '', sigungu: parts[0], dong: parts.slice(1).join(' ') });
    } else {
      // "중구" 형태 (시군구만 선택한 경우)
      setAddress({ sido: '', sigungu: region.name, dong: '' });
    }
    setIsRegionModalOpen(false);
  };

  return (
    <View position="relative" width="100%" height="100vh" overflow="hidden" backgroundColor="#fff" alignItems="center">
    <View position="relative" width="100%" maxWidth={768} height="100%" overflow="hidden" backgroundColor="#f5f5f5">
      {/* 상단 주소 표시 */}
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        backgroundColor="white"
        paddingVertical="$2"
        paddingHorizontal="$3"
        minHeight={44}
        justifyContent="center"
        borderBottomWidth={1}
        borderBottomColor="#eee"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack
            alignItems="center"
            gap="$1.5"
            cursor="pointer"
            onPress={() => setIsRegionModalOpen(true)}
          >
            {address ? (
              <>
                <Text fontSize={18} fontWeight="700" color="#000000">
                  {zoom >= MIN_ZOOM_FOR_ADDRESS ? `${address.sigungu} ${address.dong}` : '지역 선택'}
                </Text>
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none" style={{ marginTop: '-1px' }}>
                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            ) : (
              <Spinner size="small" color="#333" />
            )}
          </XStack>

          {/* 로그인 상태 - MY 아이콘 / 비로그인 - 로그인 버튼 */}
          {user ? (
            <View
              width={36}
              height={36}
              borderRadius={18}
              backgroundColor={brandColors.primaryLight}
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              style={{ userSelect: 'none' }}
              onPress={() => setIsMyPageOpen(true)}
            >
              <Text fontSize={12} fontWeight="700" color={brandColors.primary} style={{ userSelect: 'none' }}>
                MY
              </Text>
            </View>
          ) : (
            <Text
              fontSize={14}
              fontWeight="600"
              color="#000"
              cursor="pointer"
              style={{ userSelect: 'none' }}
              onPress={() => setIsLoginModalOpen(true)}
            >
              로그인
            </Text>
          )}
        </XStack>
      </View>

      {/* 지도 */}
      {isLocationLoading || !location ? (
        <View flex={1} alignItems="center" justifyContent="center" backgroundColor="#f5f5f5">
          <Spinner size="large" color="#333" />
        </View>
      ) : (
        <NaverMap
          ref={naverMapRef}
          latitude={location.latitude}
          longitude={location.longitude}
          zoom={zoom}
          style={{ width: '100%', height: '100%' }}
          onCameraChange={handleCameraChange}
          showCurrentLocation={!!currentLocation}
          currentLocationLat={currentLocation?.latitude}
          currentLocationLng={currentLocation?.longitude}
          markers={markers}
          selectedMarkerId={selectedRequestId}
          currentUserId={user?.id || null}
          onMarkerClick={(id) => setSelectedRequestId(id)}
          onMapClick={() => setSelectedRequestId(null)}
        />
      )}

      {/* 지도 컨트롤 버튼들 */}
      {!isLocationLoading && location && (
        <View
          position="absolute"
          top={56}
          left={16}
          zIndex={100}
          gap="$2"
        >
          {/* 현재 위치 버튼 - 위치 권한이 허용된 경우에만 표시 */}
          {currentLocation && (
          <View
            width={44}
            height={44}
            borderRadius={8}
            backgroundColor="white"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 1 }}
            shadowOpacity={0.2}
            shadowRadius={2}
            onPress={() => {
              skipAddressUpdateRef.current = true;
              setLocation(currentLocation);
              setZoom(16);
              naverMapRef.current?.moveTo(currentLocation.latitude, currentLocation.longitude, 16);
              setAddress(getAddressFromCoords(currentLocation.latitude, currentLocation.longitude));
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="#333" strokeWidth="1.5"/>
              <path d="M12 5v4M12 15v4M5 12h4M15 12h4" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </View>
        )}

        {/* 확대/축소 버튼 */}
        <View
          borderRadius={8}
          backgroundColor="white"
          overflow="hidden"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 1 }}
          shadowOpacity={0.2}
          shadowRadius={2}
        >
          {/* 확대 */}
          <View
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            borderBottomWidth={1}
            borderBottomColor="#eee"
            onPress={() => naverMapRef.current?.zoomIn()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
          {/* 축소 */}
          <View
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={() => naverMapRef.current?.zoomOut()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
        </View>
      </View>
      )}

      {/* 지역 선택 모달 */}
      <RegionSelectModal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        onSelect={handleRegionSelect}
        currentAddress={address}
      />

      {/* 우측 하단 + 버튼 (의뢰 등록) */}
      <FloatingActionButton onPress={handleFabPress} />

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => setIsLoginModalOpen(false)}
      />

      {/* 의뢰 등록 모달 */}
      <RequestFormModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={(latitude, longitude, requestId) => {
          setIsRequestModalOpen(false);
          refetchRequests();
          // 새로 등록된 의뢰 위치로 지도 이동 및 마커 선택
          if (latitude && longitude) {
            naverMapRef.current?.moveTo(latitude, longitude, 16);
          }
          if (requestId) {
            setSelectedRequestId(requestId);
          }
        }}
        defaultAddress={address ? `${address.sido} ${address.sigungu} ${address.dong}`.trim() : ''}
      />

      {/* 선택된 의뢰 상세 카드 */}
      {selectedRequest && (
        <RequestDetailCard
          request={selectedRequest}
          onClose={() => setSelectedRequestId(null)}
        />
      )}

      {/* MY 페이지 */}
      {isMyPageOpen && (
        <MyPage onBack={() => setIsMyPageOpen(false)} />
      )}
    </View>
    </View>
  );
}
