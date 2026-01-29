import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
import { RequestListPanel } from '../components/RequestListPanel';
import { RequestCard } from '../components/RequestCard';
import { Sheet } from 'react-modal-sheet';
import '../components/BottomSheet/BottomSheet.css';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../hooks/useRequests';
import { useRequestApplications } from '../hooks/useRequestApplications';
import { useNotifications } from '../contexts/NotificationContext';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { DONG_LIST, SIGUNGU_LIST } from '../data/regions';
import { COLLABORATION_TYPES, type CollaborationType, type EditRequest } from '../components/RequestFormModal/types';
import { supabase } from '../lib/supabase';

// 실시간 현황 알림 타입
interface RealtimeNotification {
  id: string;
  message: string;
  type: 'new' | 'matched' | 'completed';
  timestamp: number;
  isExiting?: boolean;
  latitude?: number;
  longitude?: number;
}

// 상대 시간 포맷 함수
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
};

// 상대 시간 표시 컴포넌트 (자체 업데이트)
function RelativeTime({ timestamp }: { timestamp: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    // 10분마다 업데이트
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 600000);

    // 페이지 재진입 시 업데이트
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTick(t => t + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <Text fontSize={12} color="#888" marginTop={-2}>
      {formatRelativeTime(timestamp)}
    </Text>
  );
}

// 모바일 overscroll 방지 CSS 삽입
const injectOverscrollStyles = () => {
  if (document.getElementById('overscroll-prevention-styles')) return;
  const style = document.createElement('style');
  style.id = 'overscroll-prevention-styles';
  style.textContent = `
    html, body {
      overflow: hidden;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
      position: fixed;
      width: 100%;
      height: 100%;
    }
    * {
      -webkit-tap-highlight-color: transparent;
    }
  `;
  document.head.appendChild(style);
};

// 실시간 알림 애니메이션 CSS 삽입
const injectRealtimeStyles = () => {
  if (document.getElementById('realtime-notification-styles')) return;
  const style = document.createElement('style');
  style.id = 'realtime-notification-styles';
  style.textContent = `
    @keyframes slideInFromLeft {
      0% {
        transform: translateX(-100%);
        opacity: 0;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOutToLeft {
      0% {
        transform: translateX(0);
        opacity: 1;
      }
      100% {
        transform: translateX(-100%);
        opacity: 0;
      }
    }
    .realtime-notification-enter {
      animation: slideInFromLeft 0.3s ease-out forwards;
    }
    .realtime-notification-exit {
      animation: slideOutToLeft 0.3s ease-in forwards;
    }
  `;
  document.head.appendChild(style);
};

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

const MIN_ZOOM_FOR_ADDRESS = 13;
const DEFAULT_ZOOM = 13; // 기본 줌 레벨

// URL에서 쿼리 파라미터 읽기
function getUrlParam(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// URL 쿼리 파라미터 설정/제거
function setUrlParam(param: string, value: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set(param, value);
  } else {
    url.searchParams.delete(param);
  }
  window.history.replaceState({}, '', url.toString());
}

export function HomeScreen() {
  const [location, setLocation] = useState<Location | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [address, setAddress] = useState<Address | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [pendingShareRequestId, setPendingShareRequestId] = useState<string | null>(() => getUrlParam('requestId'));
  const [pendingShareLocation, setPendingShareLocation] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = getUrlParam('lat');
    const lng = getUrlParam('lng');
    if (lat && lng) {
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    return null;
  });
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [myPageInitialTab, setMyPageInitialTab] = useState<'myRequests' | 'myApplications'>('myRequests');
  const [myPageMode, setMyPageMode] = useState<'requests' | 'profile'>('requests');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [selectedCollaborationType, setSelectedCollaborationType] = useState<CollaborationType | null>(null);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<('pending' | 'accepted' | 'completed')[]>([]);
  const [filterPendingMap, setFilterPendingMap] = useState(false); // 지도 대기중 필터
  const [filterMyMap, setFilterMyMap] = useState(false); // 지도 MY 필터
  const [showCollaborationTypeModal, setShowCollaborationTypeModal] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<RealtimeNotification[]>([]);
  const [clusterRequestIds, setClusterRequestIds] = useState<string[]>([]); // 클러스터 클릭 시 표시할 의뢰 ID 목록
  const [editingRequest, setEditingRequest] = useState<EditRequest | null>(null); // 수정할 의뢰
  const [selectedClusterKey, setSelectedClusterKey] = useState<string | null>(null); // 선택된 클러스터 키
  const [isListPanelOpen, setIsListPanelOpen] = useState(false); // 목록보기 패널
  const [listPanelInitialFilter, setListPanelInitialFilter] = useState<CollaborationType | null>(null); // 목록보기 패널 초기 필터
  const [listPanelInitialPending, setListPanelInitialPending] = useState(false); // 목록보기 대기중 필터
  const [listPanelInitialMy, setListPanelInitialMy] = useState(false); // 목록보기 MY 필터
  const [actionToast, setActionToast] = useState<{ type: 'completion' | 'application'; message: string } | null>(null); // 액션 필요 토스트
  const prevActionCountRef = useRef<{ completion: number; application: number }>({ completion: 0, application: 0 }); // 이전 액션 카운트 추적
  const skipAddressUpdateRef = useRef(false);
  const naverMapRef = useRef<NaverMapRef>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { user } = useAuth();
  const { requests, refetch: refetchRequests } = useRequests();
  const { myApplications, applicationsToMyRequests, hasActiveWork, refetch: refetchApplications } = useRequestApplications();
  useNotifications(); // 알림 컨텍스트 초기화

  // 내가 신청한 의뢰 ID 목록
  const appliedRequestIds = useMemo(() => {
    return myApplications.map(app => app.request_id);
  }, [myApplications]);

  // 의뢰를 마커 형식으로 변환 (필터 적용)
  const markers: RequestMarker[] = useMemo(() => {
    return requests
      .filter(r => r.latitude && r.longitude)
      .filter(r => !selectedCollaborationType || r.collaboration_type === selectedCollaborationType)
      .filter(r => selectedStatusFilters.length === 0 || selectedStatusFilters.includes(r.status as 'pending' | 'accepted' | 'completed'))
      .filter(r => !filterPendingMap || r.status === 'pending' || r.status === 'applied')
      .filter(r => !filterMyMap || r.user_id === user?.id)
      .map(r => ({
        id: r.id,
        userId: r.user_id,
        latitude: r.latitude!,
        longitude: r.longitude!,
        title: r.title,
        price: r.expected_fee,
        collaborationType: r.collaboration_type,
        asType: r.as_type,
        status: r.status,
        isUrgent: r.is_urgent,
      }));
  }, [requests, selectedCollaborationType, selectedStatusFilters, filterPendingMap, filterMyMap, user?.id]);

  // 선택된 의뢰 정보
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return requests.find(r => r.id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  // 클러스터에 포함된 의뢰 목록 (대기중 → 진행중 → 완료 순)
  const clusterRequests = useMemo(() => {
    if (clusterRequestIds.length === 0) return [];
    const statusOrder: Record<string, number> = { pending: 0, accepted: 1, completed: 2 };
    return requests
      .filter(r => clusterRequestIds.includes(r.id))
      .sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1));
  }, [requests, clusterRequestIds]);

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

  // URL 공유 파라미터 처리 - 위치 이동 (지도 로딩 완료 시)
  useEffect(() => {
    if (!pendingShareLocation || isLocationLoading || !location) return;

    // 지도 준비 후 바로 해당 위치로 이동
    const timer = setTimeout(() => {
      naverMapRef.current?.moveTo(pendingShareLocation.lat, pendingShareLocation.lng, 15);
      setPendingShareLocation(null);
      // URL에서 lat, lng 파라미터 제거
      setUrlParam('lat', null);
      setUrlParam('lng', null);
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingShareLocation, isLocationLoading, location]);

  // URL 공유 파라미터 처리 - 모달 열기 (requests 로드 후)
  useEffect(() => {
    if (!pendingShareRequestId || requests.length === 0) return;

    const sharedRequest = requests.find(r => r.id === pendingShareRequestId);
    if (sharedRequest) {
      // 마커 선택 (모달 열기)
      setSelectedRequestId(sharedRequest.id);
      // 처리 완료 후 pending 상태 클리어
      setPendingShareRequestId(null);
    } else {
      // 의뢰를 찾을 수 없는 경우 URL 파라미터 제거
      setUrlParam('requestId', null);
      setPendingShareRequestId(null);
    }
  }, [pendingShareRequestId, requests]);

  // selectedRequestId 변경 시 URL 업데이트 (모바일 깜빡임 방지를 위해 지연)
  useEffect(() => {
    const timer = setTimeout(() => {
      setUrlParam('requestId', selectedRequestId);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedRequestId]);

  // CSS 스타일 삽입
  useEffect(() => {
    injectOverscrollStyles();
    injectRealtimeStyles();
  }, []);

  // 액션 필요 토스트 표시 (완료 요청, 신청 대기, 신청 수락) - 새로운 이벤트 발생 시
  useEffect(() => {
    if (!user) return;

    // 완료 요청 수 (내 의뢰에 대한)
    const completionCount = applicationsToMyRequests.filter(
      app => app.status === 'accepted' && app.completion_requested
    ).length;

    // 대기중인 신청 수 (내 의뢰에 대한)
    const applicationCount = applicationsToMyRequests.filter(
      app => app.status === 'pending'
    ).length;

    const prev = prevActionCountRef.current;

    console.log('[Toast Debug]', { completionCount, applicationCount, prev });

    // 새로운 완료 요청이 들어왔을 때
    if (completionCount > prev.completion) {
      console.log('[Toast] 완료 요청 toast 표시');
      setActionToast({ type: 'completion', message: '완료요청 확인해주세요!' });
      setTimeout(() => setActionToast(null), 5000);
    }
    // 새로운 신청이 들어왔을 때
    else if (applicationCount > prev.application) {
      console.log('[Toast] 신청 toast 표시');
      setActionToast({ type: 'application', message: '협업 신청 확인해주세요!' });
      setTimeout(() => setActionToast(null), 5000);
    }

    // 이전 카운트 업데이트
    prevActionCountRef.current = { completion: completionCount, application: applicationCount };
  }, [user, applicationsToMyRequests]);

  // 실시간 알림 추가 함수
  const addRealtimeNotification = useCallback((
    message: string,
    type: 'new' | 'matched' | 'completed',
    requestId?: string,
    latitude?: number,
    longitude?: number
  ) => {
    const notification: RealtimeNotification = {
      id: requestId || `${Date.now()}-${Math.random()}`,
      message,
      type,
      timestamp: Date.now(),
      isExiting: false,
      latitude,
      longitude,
    };
    // 최대 1개만 유지 - 새 알림이 오면 교체
    setRealtimeNotifications([notification]);
  }, []);

  // 실시간 알림 삭제 함수 (드래그로 삭제)
  const removeRealtimeNotification = useCallback((id: string) => {
    setRealtimeNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
    );
    // 0.3초 후 실제 삭제 (애니메이션 완료 후)
    setTimeout(() => {
      setRealtimeNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  // 주소에서 시도 + 구 이름 추출 (예: "서울 중구")
  const extractDistrict = (address: string): string => {
    // 시도 추출 (서울특별시 -> 서울, 경기도 -> 경기)
    const sidoMatch = address.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
    const sido = sidoMatch ? sidoMatch[1] : '';

    // 구/군/시 추출
    const guMatch = address.match(/([가-힣]+[구군시])(?=\s|$)/);
    const gu = guMatch ? guMatch[1] : '';

    if (sido && gu) {
      return `${sido} ${gu}`;
    }
    return gu || sido || '';
  };

  // 페이지 로드 시 가장 최근 이벤트 가져오기
  useEffect(() => {
    const fetchLatestEvent = async () => {
      const { data } = await supabase
        .from('requests')
        .select('id, title, address, as_type, status, created_at, updated_at, latitude, longitude')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        const district = extractDistrict(data.address);
        const timestamp = new Date(data.updated_at || data.created_at).getTime();

        let message = '';
        let type: 'new' | 'matched' | 'completed' = 'new';

        if (data.status === 'completed') {
          message = `${district} [${data.title}] 작업 완료`;
          type = 'completed';
        } else if (data.status === 'accepted') {
          message = `${district} [${data.title}] 매칭 완료`;
          type = 'matched';
        } else {
          message = `${district} [${data.title}] 새 협업 요청 등록`;
          type = 'new';
        }

        setRealtimeNotifications([{
          id: data.id,
          message,
          type,
          timestamp,
          isExiting: false,
          latitude: data.latitude,
          longitude: data.longitude,
        }]);
      }
    };

    fetchLatestEvent();
  }, []);

  // 실시간 현황 구독
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupRealtimeSubscription = () => {
      // 기존 채널이 있으면 제거
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }

      const channelName = `realtime-status-${Date.now()}`;

      realtimeChannelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requests',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // 새 의뢰 등록
              const newRequest = payload.new as { id: string; address: string; as_type: string; title: string; latitude?: number; longitude?: number };
              const district = extractDistrict(newRequest.address);
              addRealtimeNotification(
                `${district} [${newRequest.title}] 새 협업 요청 등록`,
                'new',
                newRequest.id,
                newRequest.latitude,
                newRequest.longitude
              );
              // 새 의뢰가 추가되면 목록 갱신
              refetchRequests();
            } else if (payload.eventType === 'UPDATE') {
              const newData = payload.new as { id: string; status: string; address: string; as_type: string; title: string; latitude?: number; longitude?: number };
              const oldData = payload.old as { status: string };
              const district = extractDistrict(newData.address);

              if (oldData.status !== 'accepted' && newData.status === 'accepted') {
                // 매칭 완료
                addRealtimeNotification(
                  `${district} [${newData.title}] 매칭 완료`,
                  'matched',
                  newData.id,
                  newData.latitude,
                  newData.longitude
                );
              } else if (oldData.status !== 'completed' && newData.status === 'completed') {
                // 의뢰 완료
                addRealtimeNotification(
                  `${district} [${newData.title}] 작업 완료`,
                  'completed',
                  newData.id,
                  newData.latitude,
                  newData.longitude
                );
              }
              // 상태가 변경되면 목록 갱신 (마커 색상 실시간 반영)
              refetchRequests();
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[RealtimeStatus] 채널 연결 성공');
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[RealtimeStatus] 채널 연결 실패:', status, err);
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              console.log(`[RealtimeStatus] ${delay}ms 후 재연결 시도 (${retryCount}/${maxRetries})`);
              retryTimeout = setTimeout(setupRealtimeSubscription, delay);
            }
          }
        });
    };

    setupRealtimeSubscription();

    // 백그라운드에서 포그라운드로 돌아올 때 재연결
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[RealtimeStatus] 화면 활성화 - Realtime 재연결');
        setupRealtimeSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [addRealtimeNotification, refetchRequests]);

  useEffect(() => {
    // 사이트 접속 시 위치 권한 요청
    console.log('위치 권한 요청 시작');
    requestAndGetLocation().then(({ location: loc, granted }) => {
      console.log('위치 권한 결과:', granted, loc);
      setLocation(loc);
      if (granted) {
        setCurrentLocation(loc);
        setZoom(DEFAULT_ZOOM);
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
    <View
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      overflow="hidden"
      backgroundColor="#fff"
      alignItems="center"
      // @ts-ignore
      style={{ touchAction: 'none', overscrollBehavior: 'none', WebkitTapHighlightColor: 'transparent' }}
    >
    <View position="relative" width="100%" height="100%" overflow="hidden" backgroundColor="#f5f5f5">
      {/* 상단 주소 표시 - 홈에서만 표시 */}
      {!isMyPageOpen && (
      <View
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={100}
        backgroundColor="white"
        paddingHorizontal={18}
        height={51}
        justifyContent="center"
        borderBottomWidth={1}
        borderBottomColor="#eee"
        // @ts-ignore - 모바일 스크롤 방지
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" gap="$3">
            <XStack
              alignItems="center"
              gap={2}
              cursor="pointer"
              tag="a"
              href="/"
              style={{ textDecoration: 'none' }}
            >
              <img src="/glove.png" alt="협업" width={24} height={24} style={{ objectFit: 'contain' }} />
              <Text fontSize={20} fontWeight="600" color={brandColors.primary}>
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
                  <Text
                    fontSize={16}
                    fontWeight="600"
                    color="#000000"
                    numberOfLines={1}
                    // @ts-ignore
                    style={{ maxWidth: 'min(116px, 30vw)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {zoom >= MIN_ZOOM_FOR_ADDRESS ? `${address.sigungu} ${address.dong}` : '지역 선택'}
                  </Text>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ marginTop: '-1px' }}>
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#000" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              ) : (
                <Spinner size="small" color="#000" />
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
      )}

      {/* 필터 영역 - 드롭다운 버튼 스타일 (MY 페이지에서는 숨김) */}
      {!isMyPageOpen && (
      <View
        position="fixed"
        top={51}
        left={0}
        right={0}
        zIndex={99}
        height={48}
        backgroundColor="white"
        borderBottomWidth={1}
        borderBottomColor="#f0f0f0"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', height: 48 }}
        >
          <XStack gap="$2" alignItems="center">
            {/* 협업 카테고리 필터 버튼 */}
            <XStack
              paddingHorizontal={14}
              height={34}
              borderRadius={17}
              backgroundColor={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primaryLight : 'white'}
              borderWidth={1}
              borderColor={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#ddd'}
              cursor="pointer"
              alignItems="center"
              justifyContent="center"
              gap={6}
              onPress={() => setShowCollaborationTypeModal(true)}
            >
              <Text fontSize={14} fontWeight="500" color={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#000'}>
                {selectedCollaborationType && selectedCollaborationType !== '원격' ? selectedCollaborationType : '카테고리'}
              </Text>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </XStack>

            {/* 원격 필터 버튼 */}
            <XStack
              paddingHorizontal={14}
              height={34}
              borderRadius={17}
              backgroundColor="white"
              borderWidth={1}
              borderColor="#ddd"
              cursor="pointer"
              alignItems="center"
              justifyContent="center"
              gap={6}
              onPress={() => {
                setListPanelInitialFilter('원격');
                setListPanelInitialPending(false);
                setListPanelInitialMy(false);
                setIsListPanelOpen(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="14" rx="2" stroke="#999" strokeWidth="2" fill="none"/>
                <path d="M8 21h8M12 18v3" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <Text fontSize={14} fontWeight="500" color="#333">
                원격
              </Text>
            </XStack>

            {/* 대기중 필터 버튼 */}
            <XStack
              paddingHorizontal={14}
              height={34}
              borderRadius={17}
              backgroundColor={filterPendingMap ? brandColors.primaryLight : 'white'}
              borderWidth={1}
              borderColor={filterPendingMap ? brandColors.primary : '#ddd'}
              cursor="pointer"
              alignItems="center"
              justifyContent="center"
              onPress={() => setFilterPendingMap(!filterPendingMap)}
            >
              <Text fontSize={14} fontWeight="500" color={filterPendingMap ? brandColors.primary : '#333'}>
                대기중
              </Text>
            </XStack>

            {/* MY 필터 버튼 */}
            {user && (
              <XStack
                paddingHorizontal={14}
                height={34}
                borderRadius={17}
                backgroundColor={filterMyMap ? brandColors.primaryLight : 'white'}
                borderWidth={1}
                borderColor={filterMyMap ? brandColors.primary : '#ddd'}
                cursor="pointer"
                alignItems="center"
                justifyContent="center"
                onPress={() => setFilterMyMap(!filterMyMap)}
              >
                <Text fontSize={14} fontWeight="500" color={filterMyMap ? brandColors.primary : '#333'}>
                  MY
                </Text>
              </XStack>
            )}

          </XStack>
        </ScrollView>
      </View>
      )}

      {/* 협업 카테고리 필터 모달 */}
      {showCollaborationTypeModal && (
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.4)"
          zIndex={500}
          alignItems="center"
          justifyContent="center"
          onPress={() => setShowCollaborationTypeModal(false)}
        >
          <View
            width="90%"
            maxWidth={360}
            backgroundColor="white"
            borderRadius={16}
            overflow="hidden"
            onPress={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <XStack
              paddingHorizontal={20}
              paddingVertical={16}
              alignItems="center"
              justifyContent="space-between"
            >
              <Text fontSize={18} fontWeight="700" color="#000">
                협업 카테고리
              </Text>
              <View
                padding={4}
                cursor="pointer"
                onPress={() => setShowCollaborationTypeModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </View>
            </XStack>

            {/* 모달 내용 - 라디오 형태 */}
            <View padding={20} paddingTop={0}>
              {/* 카테고리 옵션들 (전체 포함, 원격 제외 - 별도 버튼으로 분리) */}
              <View
                // @ts-ignore
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
              >
                {/* 전체 옵션 */}
                <View
                  height={48}
                  borderRadius={8}
                  backgroundColor={!selectedCollaborationType ? brandColors.primary : '#f5f5f5'}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  onPress={() => {
                    setSelectedCollaborationType(null);
                    setShowCollaborationTypeModal(false);
                  }}
                >
                  <XStack alignItems="center" gap={8}>
                    <View
                      width={20}
                      height={20}
                      borderRadius={10}
                      borderWidth={2}
                      borderColor={!selectedCollaborationType ? 'white' : '#ccc'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {!selectedCollaborationType && (
                        <View width={10} height={10} borderRadius={5} backgroundColor="white" />
                      )}
                    </View>
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={!selectedCollaborationType ? 'white' : '#333'}
                    >
                      전체
                    </Text>
                  </XStack>
                </View>

                {COLLABORATION_TYPES.filter(type => type !== '원격').map((type) => {
                  const isSelected = selectedCollaborationType === type;
                  return (
                    <View
                      key={type}
                      height={48}
                      borderRadius={8}
                      backgroundColor={isSelected ? brandColors.primary : '#f5f5f5'}
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onPress={() => {
                        setSelectedCollaborationType(type);
                        setShowCollaborationTypeModal(false);
                      }}
                    >
                      <XStack alignItems="center" gap={8}>
                        <View
                          width={20}
                          height={20}
                          borderRadius={10}
                          borderWidth={2}
                          borderColor={isSelected ? 'white' : '#ccc'}
                          alignItems="center"
                          justifyContent="center"
                        >
                          {isSelected && (
                            <View width={10} height={10} borderRadius={5} backgroundColor="white" />
                          )}
                        </View>
                        <Text
                          fontSize={14}
                          fontWeight="600"
                          color={isSelected ? 'white' : '#333'}
                        >
                          {type}
                        </Text>
                      </XStack>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 실시간 현황 배너 */}
      {!isMyPageOpen && realtimeNotifications.length > 0 && (
        <View
          position="absolute"
          top={107}
          left={12}
          zIndex={98}
          gap={6}
        >
          {realtimeNotifications.map((notification) => (
              <div
                key={notification.id}
                className={notification.isExiting ? 'realtime-notification-exit' : 'realtime-notification-enter'}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  padding: '6px 12px',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  cursor: 'pointer',
                }}
                onClick={async () => {
                  // 먼저 requests 목록 새로고침 (새로 등록된 request가 없을 수 있음)
                  await refetchRequests();

                  // notification에 위도/경도가 있으면 바로 사용
                  const lat = notification.latitude;
                  const lng = notification.longitude;

                  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
                    // 지도 이동 및 마커 선택
                    naverMapRef.current?.moveTo(lat, lng, 15);
                    setSelectedRequestId(notification.id);
                    setClusterRequestIds([]);
                    setSelectedClusterKey(null);
                    setIsListPanelOpen(false);
                  } else {
                    // 위치 정보가 없는 경우 (원격 등) - 목록 모달 + 상세 모달 함께 열기
                    setIsListPanelOpen(true);
                    setSelectedRequestId(notification.id);
                    setClusterRequestIds([]);
                    setSelectedClusterKey(null);
                  }
                }}
              >
                <XStack alignItems="center" gap={8}>
                  {/* 확성기 아이콘 */}
                  <svg width="20" height="20" viewBox="0 0 90 90" fill="none">
                    {/* 손잡이 */}
                    <path d="M16.855 51.1V75.48c0 3.206 2.599 5.806 5.806 5.806c3.206 0 5.806-2.599 5.806-5.806V59.661l3.915-8.561H16.855z" fill="#F0F0FC" stroke="#000" strokeWidth="2"/>
                    {/* 확성기 몸통 배경 */}
                    <path d="M63.541 9.659c-8.499 6.49-18.925 9.873-29.662 9.873H18.327c-9.074 0-16.881 6.973-17.308 16.037c-0.456 9.677 7.255 17.666 16.832 17.666h16.028c10.737 0 21.163 3.383 29.662 9.873c3.083 2.331 7.511 0.078 7.511-3.787V13.446C71.052 9.581 66.624 7.328 63.541 9.659z" fill="#F0F0FC"/>
                    {/* 빨간색 부분 - 앞쪽 */}
                    <path d="M34.719 19.516c-0.28 0.005-0.56 0.016-0.84 0.016H18.327c-9.074 0-16.881 6.973-17.308 16.037c-0.456 9.677 7.255 17.666 16.832 17.666h16.028c0.28 0 0.56 0.012 0.84 0.016V19.516z" fill="#F7524B"/>
                    {/* 빨간색 부분 - 뒤쪽 */}
                    <path d="M63.541 9.659c-1.023 0.781-2.076 1.514-3.154 2.202V60.77c1.078 0.688 2.131 1.421 3.154 2.202c3.083 2.331 7.511 0.078 7.511-3.787V13.446C71.052 9.581 66.624 7.328 63.541 9.659z" fill="#F7524B"/>
                    {/* 테두리 */}
                    <path d="M63.541 9.659c-8.499 6.49-18.925 9.873-29.662 9.873H18.327c-9.074 0-16.881 6.973-17.308 16.037c-0.456 9.677 7.255 17.666 16.832 17.666h16.028c10.737 0 21.163 3.383 29.662 9.873c3.083 2.331 7.511 0.078 7.511-3.787V13.446C71.052 9.581 66.624 7.328 63.541 9.659z" stroke="#000" strokeWidth="2" fill="none"/>
                    <path d="M34.719 19.516V53.251" stroke="#000" strokeWidth="2"/>
                    {/* 음파 */}
                    <line x1="79.6" y1="35.4" x2="89" y2="35.4" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="79.6" y1="21.6" x2="86.7" y2="18.2" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="79.6" y1="49.2" x2="86.7" y2="52.6" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <View flex={1}>
                    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3">
                      <Text fontSize={12} color="#000" fontWeight="500">
                        실시간 접수 현황
                      </Text>
                      <RelativeTime timestamp={notification.timestamp} />
                    </XStack>
                    <Text fontSize={14} color="#000" fontWeight="600">
                      {notification.message}
                    </Text>
                  </View>
                </XStack>
              </div>
          ))}
        </View>
      )}

      {/* 지도 */}
      {isLocationLoading || !location ? (
        <View flex={1} alignItems="center" justifyContent="center" backgroundColor="#f5f5f5">
          <Spinner size="large" color="#000" />
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
          selectedClusterKey={selectedClusterKey}
          currentUserId={user?.id || null}
          appliedRequestIds={appliedRequestIds}
          onMarkerClick={(id) => {
            setClusterRequestIds([]); // 클러스터 목록 닫기
            setSelectedClusterKey(null); // 클러스터 선택 해제
            setSelectedRequestId(id);
          }}
          onMapClick={() => {
            setSelectedRequestId(null);
            setClusterRequestIds([]); // 클러스터 목록 닫기
            setSelectedClusterKey(null); // 클러스터 선택 해제
          }}
          onClusterClick={(markerIds, _lat, _lng, clusterKey) => {
            setSelectedRequestId(null); // 단일 선택 해제
            setClusterRequestIds(markerIds); // 클러스터 의뢰 목록 설정
            setSelectedClusterKey(clusterKey); // 클러스터 선택
          }}
        />
      )}

      {/* 액션 필요 토스트 - 항상 최상위에 표시 */}
      {actionToast && (
        <View
          position="fixed"
          top="40%"
          left={0}
          right={0}
          alignItems="center"
          zIndex={999999}
          pointerEvents="none"
        >
          <View
            backgroundColor="white"
            paddingLeft={6}
            paddingRight={16}
            paddingVertical={6}
            borderRadius={12}
            flexDirection="row"
            alignItems="center"
            gap={8}
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            shadowRadius={12}
            // @ts-ignore
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
            pointerEvents="auto"
            cursor="pointer"
            onPress={() => {
              setActionToast(null);
              setMyPageInitialTab('myRequests');
              setMyPageMode('requests');
              setIsMyPageOpen(true);
            }}
          >
            <img src={actionToast.type === 'completion' ? '/3d-man-2.png' : '/3d-man.png'} width={60} height={60} alt="" style={{ objectFit: 'contain' }} />
            <Text fontSize={18} fontWeight="600" color="#333">
              {actionToast.message}
            </Text>
          </View>
        </View>
      )}

      {/* 지도 컨트롤 버튼들 - 홈에서만 표시 */}
      {!isLocationLoading && location && !isMyPageOpen && (
        <View
          position="fixed"
          bottom={68}
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
              setZoom(DEFAULT_ZOOM);
              naverMapRef.current?.moveTo(currentLocation.latitude, currentLocation.longitude, DEFAULT_ZOOM);
              setAddress(getAddressFromCoords(currentLocation.latitude, currentLocation.longitude));
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="7" stroke="#000" strokeWidth="1.5"/>
              <path d="M12 5v4M12 15v4M5 12h4M15 12h4" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/>
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
              <path d="M12 5v14M5 12h14" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
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
              <path d="M5 12h14" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
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

      {/* 우측 하단 + 버튼 (의뢰 등록) - 홈에서만 표시 */}
      {!isMyPageOpen && <FloatingActionButton onPress={handleFabPress} />}

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
            naverMapRef.current?.moveTo(latitude, longitude, 15);
          }
          if (requestId) {
            setSelectedRequestId(requestId);
          }
        }}
        defaultAddress=""
      />

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

      {/* 목록보기 버튼 - 바텀 네비게이션 위 */}
      {!isMyPageOpen && (
        <View
          position="fixed"
          left="50%"
          zIndex={199}
          // @ts-ignore
          style={{
            bottom: 'calc(68px + env(safe-area-inset-bottom))',
            transform: 'translateX(-50%)',
          }}
        >
          <XStack
            paddingHorizontal={16}
            paddingVertical={10}
            backgroundColor="white"
            borderRadius={22}
            alignItems="center"
            gap={8}
            cursor="pointer"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.15}
            shadowRadius={6}
            borderWidth={1}
            borderColor="#eee"
            hoverStyle={{ backgroundColor: '#f8f8f8' }}
            pressStyle={{ scale: 0.95 }}
            onPress={() => {
              setListPanelInitialFilter(null);
              setListPanelInitialPending(false);
              setListPanelInitialMy(false);
              setIsListPanelOpen(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <Text fontSize={14} fontWeight="600" color="#333">
              목록보기
            </Text>
          </XStack>
        </View>
      )}

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
        hasActiveWork={hasActiveWork}
      />
    </View>

      {/* 클러스터 의뢰 목록 바텀시트 */}
      <Sheet
        isOpen={clusterRequests.length > 0}
        onClose={() => {
          setClusterRequestIds([]);
          setSelectedClusterKey(null);
        }}
        style={{ zIndex: 250 }}
      >
        <Sheet.Container style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxWidth: 768,
          margin: '0 auto',
        } as React.CSSProperties}>
          <Sheet.Header>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 16px 8px',
            }}>
              <div style={{
                width: 40,
                height: 4,
                backgroundColor: '#d1d5db',
                borderRadius: 2,
              }} />
            </div>
          </Sheet.Header>
          <Sheet.Content style={{ overflowY: 'auto' }}>
            {/* 헤더 */}
            <View
              paddingHorizontal={16}
              paddingBottom={6}
              borderBottomWidth={1}
              borderBottomColor="#f0f0f0"
              backgroundColor="white"
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={16} fontWeight="600" color="#000">
                  총 {clusterRequests.length}건
                </Text>
                <View
                  padding={8}
                  cursor="pointer"
                  onPress={() => {
                    setClusterRequestIds([]);
                    setSelectedClusterKey(null);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </View>
              </XStack>
            </View>

            {/* 의뢰 목록 */}
            <View padding={12} gap={10}>
              {clusterRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  title={request.title}
                  asType={request.as_type}
                  status={request.status}
                  expectedFee={request.expected_fee}
                  address={request.address}
                  collaborationType={request.collaboration_type}
                  isCompleted={request.status === 'completed'}
                  isUrgent={request.is_urgent}
                  isOwn={user?.id === request.user_id}
                  createdAt={request.created_at}
                  onCardPress={() => {
                    setClusterRequestIds([]);
                    setSelectedClusterKey(null);
                    setSelectedRequestId(request.id);
                  }}
                />
              ))}
            </View>
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop onTap={() => {
          setClusterRequestIds([]);
          setSelectedClusterKey(null);
        }} />
      </Sheet>

      {/* 선택된 의뢰 상세 카드 - 컨테이너 밖에서 렌더링 */}
      {selectedRequest && (
        <RequestDetailCard
          request={selectedRequest}
          onClose={() => setSelectedRequestId(null)}
          onAccept={() => {
            // 마커 상태 즉시 업데이트를 위해 데이터 새로고침
            refetchRequests();
            refetchApplications();
          }}
          onEditRequest={(req) => {
            setEditingRequest(req as EditRequest);
            setSelectedRequestId(null);
          }}
          onDeleteRequest={async (reqId) => {
            await supabase.from('requests').delete().eq('id', reqId);
            setSelectedRequestId(null);
            refetchRequests();
          }}
          onCancelWork={async (reqId) => {
            // 진행중인 협업 취소: accepted 상태의 application 삭제 및 의뢰 상태 변경
            // 1. 해당 의뢰의 accepted application 삭제
            await supabase
              .from('request_applications')
              .delete()
              .eq('request_id', reqId)
              .eq('status', 'accepted');

            // 2. 다른 pending 신청자가 있는지 확인
            const { data: otherApps } = await supabase
              .from('request_applications')
              .select('id')
              .eq('request_id', reqId)
              .eq('status', 'pending');

            // 3. 의뢰 상태를 pending 또는 applied로 변경
            const newStatus = otherApps && otherApps.length > 0 ? 'applied' : 'pending';
            await supabase
              .from('requests')
              .update({ status: newStatus })
              .eq('id', reqId);

            setSelectedRequestId(null);
            refetchRequests();
            refetchApplications();
          }}
        />
      )}

      {/* 의뢰 수정 모달 */}
      <RequestFormModal
        isOpen={!!editingRequest}
        onClose={() => setEditingRequest(null)}
        onSuccess={() => {
          setEditingRequest(null);
          refetchRequests();
        }}
        editRequest={editingRequest}
      />

      {/* 목록보기 패널 */}
      <RequestListPanel
        isOpen={isListPanelOpen}
        onClose={() => setIsListPanelOpen(false)}
        requests={requests}
        currentLocation={currentLocation}
        currentUserId={user?.id || null}
        onSelectRequest={(requestId) => {
          const request = requests.find(r => r.id === requestId);
          if (request && request.latitude && request.longitude) {
            naverMapRef.current?.moveTo(request.latitude, request.longitude, 15);
          }
          setSelectedRequestId(requestId);
          setClusterRequestIds([]);
          setSelectedClusterKey(null);
        }}
        initialCollaborationType={listPanelInitialFilter}
        initialFilterPending={listPanelInitialPending}
        initialFilterMy={listPanelInitialMy}
      />
    </View>
  );
}
