import { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, XStack, Spinner, ScrollView } from 'tamagui';
import { NaverMap, NaverMapRef } from '../components/NaverMap';
import type { RequestMarker } from '../components/NaverMap';
import { RegionSelectModal } from '../components/RegionSelectModal';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { LoginModal } from '../components/LoginModal';
import { RequestFormModal } from '../components/RequestFormModal';
import { RequestDetailCard } from '../components/RequestDetailCard';
import { MyPage } from './MyPage';
import { NotificationModal } from '../components/NotificationModal';
import { BottomNavigation } from '../components/BottomNavigation';
import { HeaderActions } from '../components/HeaderActions';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../hooks/useRequests';
import { useRequestApplications } from '../hooks/useRequestApplications';
import { useNotifications } from '../contexts/NotificationContext';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { DONG_LIST, SIGUNGU_LIST } from '../data/regions';
import { AS_TYPES, type AsType } from '../components/RequestFormModal/types';

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
  const [zoom, setZoom] = useState(10);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [myPageInitialTab, setMyPageInitialTab] = useState<'myRequests' | 'myApplications'>('myRequests');
  const [myPageMode, setMyPageMode] = useState<'requests' | 'profile'>('requests');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedAsTypeFilter, setSelectedAsTypeFilter] = useState<AsType | null>(null);
  const skipAddressUpdateRef = useRef(false);
  const naverMapRef = useRef<NaverMapRef>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();
  const { requests, refetch: refetchRequests } = useRequests();
  const { myApplications, refetch: refetchApplications } = useRequestApplications();
  useNotifications(); // 알림 컨텍스트 초기화

  // 내가 신청한 의뢰 ID 목록
  const appliedRequestIds = useMemo(() => {
    return myApplications.map(app => app.request_id);
  }, [myApplications]);

  // 의뢰를 마커 형식으로 변환 (필터 적용)
  const markers: RequestMarker[] = useMemo(() => {
    return requests
      .filter(r => r.latitude && r.longitude)
      .filter(r => !selectedAsTypeFilter || r.as_type === selectedAsTypeFilter)
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
  }, [requests, selectedAsTypeFilter]);

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
        paddingHorizontal="$3"
        height={51}
        justifyContent="center"
        borderBottomWidth={1}
        borderBottomColor="#eee"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$3">
            <XStack
              alignItems="center"
              gap="$2.5"
              cursor="pointer"
              tag="a"
              href="/"
              style={{ textDecoration: 'none' }}
            >
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="10" fill={brandColors.primary}/>
                <path d="M24 8C18.5 8 14 12.5 14 18C14 25.5 24 34 24 34C24 34 34 25.5 34 18C34 12.5 29.5 8 24 8Z" fill="white"/>
                <circle cx="24" cy="18" r="4" fill={brandColors.primary}/>
                <circle cx="12" cy="36" r="3" fill="white" opacity="0.9"/>
                <circle cx="36" cy="36" r="3" fill="white" opacity="0.9"/>
                <path d="M15 36 L20 31" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
                <path d="M33 36 L28 31" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
              </svg>
              <Text fontSize={20} fontWeight="800" color={brandColors.primary}>
                협업
              </Text>
            </XStack>
            <View width={1} height={20} backgroundColor="#ddd" />
            <XStack
              alignItems="center"
              gap="$1.5"
              cursor="pointer"
              onPress={() => setIsRegionModalOpen(true)}
            >
              {address ? (
                <>
                  <Text fontSize={16} fontWeight="600" color="#000000">
                    {zoom >= MIN_ZOOM_FOR_ADDRESS ? `${address.sigungu} ${address.dong}` : '지역 선택'}
                  </Text>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ marginTop: '-1px' }}>
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              ) : (
                <Spinner size="small" color="#333" />
              )}
            </XStack>
          </XStack>

          {/* 알림 + 로그인/로그아웃 */}
          <HeaderActions
            onNotificationPress={() => setIsNotificationOpen(true)}
            onLoginPress={() => setIsLoginModalOpen(true)}
          />
        </XStack>
      </View>

      {/* AS 종류 필터 */}
      <View
        position="absolute"
        top={51}
        left={0}
        right={0}
        zIndex={99}
        backgroundColor="white"
        borderBottomWidth={1}
        borderBottomColor="#eee"
        height={56}
        justifyContent="center"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', height: 56 }}
        >
          <XStack gap="$2" alignItems="center">
            {/* 전체 보기 칩 */}
            <View
              paddingHorizontal="$3.5"
              height={32}
              borderRadius={16}
              backgroundColor={selectedAsTypeFilter === null ? brandColors.primaryLight : 'white'}
              borderWidth={1}
              borderColor={selectedAsTypeFilter === null ? brandColors.primary : '#ddd'}
              cursor="pointer"
              justifyContent="center"
              alignItems="center"
              onPress={() => setSelectedAsTypeFilter(null)}
            >
              <Text
                fontSize={13}
                fontWeight="600"
                color={selectedAsTypeFilter === null ? brandColors.primary : '#666'}
              >
                전체
              </Text>
            </View>
            {/* AS 종류 칩들 */}
            {AS_TYPES.map((type) => {
              const isSelected = selectedAsTypeFilter === type;
              return (
                <XStack
                  key={type}
                  paddingHorizontal="$3"
                  height={32}
                  borderRadius={16}
                  backgroundColor={isSelected ? brandColors.primaryLight : 'white'}
                  borderWidth={1}
                  borderColor={isSelected ? brandColors.primary : '#ddd'}
                  cursor="pointer"
                  alignItems="center"
                  justifyContent="center"
                  gap="$1.5"
                  onPress={() => setSelectedAsTypeFilter(type)}
                >
                  {/* 아이콘 */}
                  {type === '복합기/OA' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      {/* 용지 입력 트레이 (상단) */}
                      <path d="M7 3h10v5H7z" fill="#E5E7EB" stroke="#6B7280" strokeWidth="1"/>
                      {/* 프린터 본체 */}
                      <rect x="4" y="8" width="16" height="8" rx="1" fill="#6B7280"/>
                      {/* 출력 용지 */}
                      <path d="M7 16h10v5H7z" fill="white" stroke="#9CA3AF" strokeWidth="1"/>
                      {/* 상태 표시등 */}
                      <circle cx="17" cy="12" r="1.5" fill="#22C55E"/>
                    </svg>
                  )}
                  {type === '전기/통신' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {type === '가전/설비' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#F97316" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {type === '인테리어' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#14B8A6" stroke="#0D9488" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 22V12h6v10" fill="#5EEAD4" stroke="#0D9488" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {type === '청소' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2v5" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 7l5 15H7l5-15z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {type === '소프트웨어' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="3" width="20" height="14" rx="2" fill="#4B5563" stroke="#374151" strokeWidth="1"/>
                      <rect x="4" y="5" width="16" height="10" fill="#60A5FA"/>
                      <path d="M8 21h8M12 17v4" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                  {type === '운반/설치' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 3h15v13H1z" fill="#FB923C" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 8h4l3 3v5h-7V8z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="5.5" cy="18.5" r="2.5" fill="#374151" stroke="#1F2937" strokeWidth="1"/>
                      <circle cx="18.5" cy="18.5" r="2.5" fill="#374151" stroke="#1F2937" strokeWidth="1"/>
                    </svg>
                  )}
                  <Text
                    fontSize={13}
                    fontWeight="500"
                    color={isSelected ? brandColors.primary : '#666'}
                  >
                    {type}
                  </Text>
                </XStack>
              );
            })}
          </XStack>
        </ScrollView>
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
          appliedRequestIds={appliedRequestIds}
          onMarkerClick={(id) => setSelectedRequestId(id)}
          onMapClick={() => setSelectedRequestId(null)}
        />
      )}

      {/* 지도 컨트롤 버튼들 */}
      {!isLocationLoading && location && (
        <View
          position="absolute"
          top={120}
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
        onSuccess={async (latitude, longitude, requestId) => {
          setIsRequestModalOpen(false);
          // 마커 데이터 갱신 후 지도 이동
          await refetchRequests();
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
          onAccept={() => {
            // 마커 상태 즉시 업데이트를 위해 데이터 새로고침
            refetchRequests();
            refetchApplications();
          }}
        />
      )}

      {/* MY 페이지 */}
      {isMyPageOpen && (
        <MyPage
          onBack={() => {
            setIsMyPageOpen(false);
            setMyPageInitialTab('myRequests');
            setMyPageMode('requests');
          }}
          onNavigate={(navMode) => {
            if (navMode === 'home') {
              setIsMyPageOpen(false);
            } else if (navMode === 'requests') {
              setMyPageMode('requests');
              setMyPageInitialTab('myRequests');
            } else if (navMode === 'profile') {
              setMyPageMode('profile');
            }
          }}
          initialTab={myPageInitialTab}
          mode={myPageMode}
        />
      )}

      {/* 알림 모달 */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigate={(tab) => {
          setMyPageMode('requests');
          setMyPageInitialTab(tab);
          setIsMyPageOpen(true);
        }}
      />

      {/* 하단 네비게이션 */}
      <BottomNavigation
        activeMode={!isMyPageOpen ? 'home' : myPageMode}
        onNavigate={(mode) => {
          if (mode === 'home') {
            setIsMyPageOpen(false);
            setMyPageInitialTab('myRequests');
          } else if (mode === 'requests') {
            setMyPageMode('requests');
            setMyPageInitialTab('myRequests');
            setIsMyPageOpen(true);
          } else if (mode === 'profile') {
            setMyPageMode('profile');
            setIsMyPageOpen(true);
          }
        }}
        onLoginRequired={() => setIsLoginModalOpen(true)}
        isLoggedIn={!!user}
      />
    </View>
    </View>
  );
}
