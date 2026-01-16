import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, XStack, Spinner, Popover, YStack, Button } from 'tamagui';
import { NaverMap, NaverMapRef } from '../components/NaverMap';
import type { RequestMarker } from '../components/NaverMap';
import { RegionSelectModal } from '../components/RegionSelectModal';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { LoginModal } from '../components/LoginModal';
import { RequestFormModal } from '../components/RequestFormModal';
import { RequestDetailCard } from '../components/RequestDetailCard';
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
function requestAndGetLocation(): Promise<{ location: Location; granted: boolean }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ location: DEFAULT_LOCATION, granted: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          granted: true,
        });
      },
      () => {
        resolve({ location: DEFAULT_LOCATION, granted: false });
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
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [zoom, setZoom] = useState(14);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const skipAddressUpdateRef = useRef(false);
  const naverMapRef = useRef<NaverMapRef>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, signOut } = useAuth();
  const { requests, refetch: refetchRequests } = useRequests();

  // 의뢰를 마커 형식으로 변환
  const markers: RequestMarker[] = useMemo(() => {
    return requests
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        id: r.id,
        latitude: r.latitude!,
        longitude: r.longitude!,
        title: r.title,
        price: r.expected_fee,
        visitType: r.visit_type,
        asType: r.as_type,
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
    requestAndGetLocation().then(({ location: loc, granted }) => {
      setLocation(loc);
      if (granted) {
        setCurrentLocation(loc);
        setZoom(16);
      }
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
    <View position="relative" width="100%" height="100vh" overflow="hidden" backgroundColor="#f5f5f5">
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

          {/* 로그인 상태 - 이름 배지 + 드롭다운 */}
          {user && (
            <Popover placement="bottom-end" offset={4}>
              <Popover.Trigger>
                <View
                  width={36}
                  height={36}
                  borderRadius={18}
                  backgroundColor={brandColors.primaryLight}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  style={{ userSelect: 'none' }}
                >
                  <Text fontSize={14} fontWeight="700" color={brandColors.primary} style={{ userSelect: 'none' }}>
                    {(user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || '').slice(0, 2)}
                  </Text>
                </View>
              </Popover.Trigger>

              <Popover.Content
                borderWidth={1}
                borderColor="#eee"
                padding="$2"
                backgroundColor="white"
                borderRadius={12}
                shadowColor="#000"
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.1}
                shadowRadius={8}
                elevate
              >
                <Popover.Arrow borderWidth={1} borderColor="#eee" />
                <YStack gap="$1">
                  <Popover.Close asChild>
                    <Button
                      size="$3"
                      backgroundColor="transparent"
                      color="#000"
                      fontWeight="500"
                      onPress={() => signOut()}
                      hoverStyle={{ backgroundColor: 'transparent' }}
                      pressStyle={{ backgroundColor: 'transparent' }}
                      style={{ userSelect: 'none' }}
                    >
                      로그아웃
                    </Button>
                  </Popover.Close>
                </YStack>
              </Popover.Content>
            </Popover>
          )}
        </XStack>
      </View>

      {/* 지도 */}
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
        onMarkerClick={(id) => setSelectedRequestId(id)}
        onMapClick={() => setSelectedRequestId(null)}
      />

      {/* 지도 컨트롤 버튼들 */}
      <View
        position="absolute"
        top={56}
        left={16}
        zIndex={100}
        gap="$2"
      >
        {/* 현재 위치 버튼 */}
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
            requestAndGetLocation().then(({ location: loc, granted }) => {
              if (granted) {
                setLocation(loc);
                setCurrentLocation(loc);
                setZoom(16);
                naverMapRef.current?.moveTo(loc.latitude, loc.longitude, 16);
                setAddress(getAddressFromCoords(loc.latitude, loc.longitude));
              }
            });
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="7" stroke="#333" strokeWidth="1.5"/>
            <path d="M12 5v4M12 15v4M5 12h4M15 12h4" stroke="#333" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </View>

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
    </View>
  );
}
