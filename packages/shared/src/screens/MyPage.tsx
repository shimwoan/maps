import { useState, useEffect } from 'react';
import { View, Text, XStack, YStack, ScrollView, Spinner } from 'tamagui';
import { Button } from '../components/Button';
import { ProfileSetupModal } from '../components/ProfileSetupModal';
import { NotificationModal } from '../components/NotificationModal';
import { BottomNavigation } from '../components/BottomNavigation';
import { HeaderActions } from '../components/HeaderActions';
import { RequestDetailCard } from '../components/RequestDetailCard';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { RequestCard } from '../components/RequestCard';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useRequestApplications, RequestApplication } from '../hooks/useRequestApplications';
import { useRequests, Request } from '../hooks/useRequests';
import { useNotifications } from '../contexts/NotificationContext';
import { EmptyState } from '../components/EmptyState';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { RequestFormModal } from '../components/RequestFormModal';
import type { EditRequest } from '../components/RequestFormModal/types';
import { formatCompletedDateTime } from '../utils/format';
import { isAdminNickname } from '../constants/admin';
import { sendSms, SmsTemplates } from '../lib/sendon';

type TabType = 'myRequests' | 'myApplications';
type PageMode = 'requests' | 'profile';

interface MyPageProps {
  onBack: () => void;
  onNavigate?: (mode: 'home' | 'requests' | 'profile') => void;
  initialTab?: TabType;
  mode?: PageMode;
}

// 내 의뢰 카드 (의뢰자 입장)
function MyRequestCard({
  request,
  applications,
  onAccept,
  onReject,
  onImageClick,
  onCardPress,
  onEdit,
  onDelete,
  onCancelWork,
  onComplete,
}: {
  request: Request;
  applications: RequestApplication[];
  onAccept: (appId: string, reqId: string) => void;
  onReject: (appId: string) => void;
  onImageClick: (url: string) => void;
  onCardPress?: () => void;
  onEdit?: (request: Request) => void;
  onDelete?: (requestId: string) => void;
  onCancelWork?: (requestId: string) => void;
  onComplete?: (requestId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const acceptedApp = applications.find(a => a.status === 'accepted' || a.status === 'completed');
  const isCompleted = request.status === 'completed';
  const isPending = request.status === 'pending' && pendingApps.length === 0;

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (showMenu) {
      const handleClick = () => setShowMenu(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showMenu]);

  return (
    <RequestCard
      title={request.title}
      asType={request.as_type}
      status={request.status}
      scheduleDate={request.schedule_date}
      scheduleTime={request.schedule_time}
      expectedFee={request.expected_fee}
      address={request.address}
      collaborationType={request.collaboration_type}
      isCompleted={isCompleted}
      isUrgent={request.is_urgent}
      onCardPress={onCardPress}
      rightAction={
        <XStack alignItems="center" gap="$2" marginRight={-8} marginTop={-2}>
          {/* 신청자 수 표시 */}
          {pendingApps.length > 0 && request.status !== 'accepted' && request.status !== 'completed' && (
            <XStack alignItems="center" gap="$1.5">
              <View
                width={10}
                height={10}
                borderRadius={5}
                backgroundColor="#EF4444"
                shadowColor="#EF4444"
                shadowOffset={{ width: 0, height: 1 }}
                shadowOpacity={0.4}
                shadowRadius={3}
                // @ts-ignore
                className="pulse-dot"
              />
              <Text fontSize={16} fontWeight="700" color="#EF4444">
                {pendingApps.length}명
              </Text>
            </XStack>
          )}
          {/* 대기중/신청있음 상태 - 메뉴 버튼 */}
          {(request.status === 'pending' || request.status === 'applied') && (
            <View position="relative">
              <View
                padding={4}
                cursor="pointer"
                onPress={(e: any) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                hoverStyle={{ backgroundColor: '#f5f5f5', borderRadius: 6 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.5" fill="#666"/>
                  <circle cx="12" cy="12" r="1.5" fill="#666"/>
                  <circle cx="12" cy="19" r="1.5" fill="#666"/>
                </svg>
              </View>
              {/* 드롭다운 메뉴 */}
              {showMenu && (
                <View
                  position="absolute"
                  top={28}
                  right={0}
                  backgroundColor="white"
                  borderRadius={8}
                  borderWidth={1}
                  borderColor="#e5e5e5"
                  shadowColor="#000"
                  shadowOffset={{ width: 0, height: 2 }}
                  shadowOpacity={0.1}
                  shadowRadius={8}
                  minWidth={120}
                  zIndex={1000}
                  overflow="hidden"
                >
                  <View
                    paddingHorizontal={16}
                    paddingVertical={12}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#f5f5f5' }}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit?.(request);
                    }}
                  >
                    <Text fontSize={14} fontWeight="600" color="#000">수정하기</Text>
                  </View>
                  <View
                    paddingHorizontal={16}
                    paddingVertical={12}
                    cursor="pointer"
                    hoverStyle={{ backgroundColor: '#fef2f2' }}
                    onPress={(e: any) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete?.(request.id);
                    }}
                  >
                    <Text fontSize={14} fontWeight="600" color="#dc2626">삭제</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </XStack>
      }
    >
      {/* 진행중인 경우 - 수락된 신청자 정보 표시 */}
      {request.status === 'accepted' && acceptedApp && (
        <YStack gap="$2" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0">
          <XStack alignItems="center" gap="$2">
            {/* @ts-ignore - animation defined in index.css */}
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={acceptedApp.completion_requested ? '#F59E0B' : '#22C55E'}
              style={{ animation: 'pulse-green 1.5s ease-in-out infinite' }}
            />
            <Text fontSize={14} color={acceptedApp.completion_requested ? '#F59E0B' : '#22C55E'} fontWeight="600" flex={1}>
              {acceptedApp.completion_requested
                ? `${acceptedApp.applicant_profile?.nickname || '수행자'}님이 작업 완료 요청`
                : `${acceptedApp.applicant_profile?.nickname || '신청자'}님과 매칭완료`}
            </Text>
            {acceptedApp.applicant_profile?.business_card_url && (
              <View
                width={72}
                height={40}
                borderRadius={6}
                overflow="hidden"
                cursor="pointer"
                onClick={(e: any) => {
                  e.stopPropagation();
                  onImageClick(acceptedApp.applicant_profile?.business_card_url || '');
                }}
              >
                <img
                  src={acceptedApp.applicant_profile.business_card_url}
                  alt="명함"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </View>
            )}
          </XStack>
          {/* 액션 버튼 */}
          <XStack gap="$2" onClick={(e: any) => e.stopPropagation()}>
            {!acceptedApp.completion_requested &&   <Button
              flex={1}
              flexBasis={0}
              size="$4"
              backgroundColor="#fee2e2"
              color="#dc2626"
              fontWeight="500"
              onPress={() => onCancelWork?.(request.id)}
              hoverStyle={{ backgroundColor: '#fecaca' }}
              pressStyle={{ backgroundColor: '#fca5a5' }}
            >
              협업요청 취소
            </Button> }
         
            {acceptedApp.completion_requested && (
              <Button
                flex={1}
                flexBasis={0}
                size="$4"
                backgroundColor="#22C55E"
                color="white"
                fontWeight="500"
                onPress={() => onComplete?.(request.id)}
                hoverStyle={{ backgroundColor: '#16A34A' }}
                pressStyle={{ backgroundColor: '#15803D' }}
              >
                작업 완료
              </Button>
            )}
          </XStack>
        </YStack>
      )}

      {/* 완료된 경우 - 수행자 정보 표시 */}
      {request.status === 'completed' && acceptedApp && (
        <XStack alignItems="center" gap="$2" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0">
          <YStack flex={1} gap="$1">
            <Text fontSize={13} color="#9CA3AF">
              {formatCompletedDateTime(request.updated_at || request.created_at)}
            </Text>
            <Text fontSize={14} color="#9CA3AF" fontWeight="600">
              {acceptedApp.applicant_profile?.nickname || '수행자'}님과 수행완료
            </Text>
          </YStack>
          {acceptedApp.applicant_profile?.business_card_url && (
            <View
              width={72}
              height={40}
              borderRadius={6}
              overflow="hidden"
              cursor="pointer"
              opacity={0.7}
              onClick={(e: any) => {
                e.stopPropagation();
                onImageClick(acceptedApp.applicant_profile?.business_card_url || '');
              }}
            >
              <img
                src={acceptedApp.applicant_profile.business_card_url}
                alt="명함"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
          )}
        </XStack>
      )}

      {/* 신청자 목록 - pending 상태일 때만 */}
      {pendingApps.length > 0 && request.status !== 'accepted' && (
        <YStack gap="$3" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0">
          {pendingApps.map((app) => (
            <XStack
              key={app.id}
              alignItems="center"
              justifyContent="space-between"
              gap="$3"
            >
              {/* 명함 썸네일 - 9:5 비율 */}
              {app.applicant_profile?.business_card_url ? (
                <View
                  width={72}
                  height={40}
                  borderRadius={6}
                  overflow="hidden"
                  cursor="pointer"
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onImageClick(app.applicant_profile?.business_card_url || '');
                  }}
                >
                  <img
                    src={app.applicant_profile.business_card_url}
                    alt="명함"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </View>
              ) : (
                <View
                  width={72}
                  height={40}
                  borderRadius={6}
                  backgroundColor="#e5e5e5"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={10} color="#999">명함없음</Text>
                </View>
              )}

              {/* 이름 */}
              <Text fontSize={16} color="#000" fontWeight="600" flex={1}>
                {app.applicant_profile?.nickname || '신청자'}
              </Text>

              {/* 버튼 */}
              <XStack gap="$2" onClick={(e: any) => e.stopPropagation()}>
                <Button
                  size="$3"
                  backgroundColor="#f0f0f0"
                  color="#000"
                  fontWeight="500"
                  onPress={() => onReject(app.id)}
                  hoverStyle={{ backgroundColor: '#e8e8e8' }}
                >
                  거절
                </Button>
                <Button
                  size="$3"
                  backgroundColor={brandColors.primary}
                  color="white"
                  fontWeight="500"
                  onPress={() => onAccept(app.id, app.request_id)}
                  hoverStyle={{ backgroundColor: brandColors.primaryHover }}
                >
                  수락
                </Button>
              </XStack>
            </XStack>
          ))}
        </YStack>
      )}

    </RequestCard>
  );
}

// 내가 신청한 의뢰 카드 (수행자 입장)
function MyApplicationCard({
  application,
  onCancel,
  onCardPress,
  onImageClick,
  onRequestCompletion,
}: {
  application: RequestApplication;
  onCancel: (appId: string, reqId: string) => Promise<void>;
  onCardPress?: () => void;
  onImageClick: (url: string) => void;
  onRequestCompletion?: (appId: string, reqId: string) => Promise<void>;
}) {
  const [isCanceling, setIsCanceling] = useState(false);
  const req = application.request;

  if (!req) return null;


  return (
    <>
    <RequestCard
      title={req.title}
      asType={req.as_type}
      status={application.status}
      scheduleDate={req.schedule_date}
      scheduleTime={req.schedule_time}
      expectedFee={req.expected_fee}
      address={req.address}
      collaborationType={req.collaboration_type}
      isCompleted={application.status === 'completed'}
      isUrgent={req.is_urgent}
      onCardPress={onCardPress}
    >
      {/* 진행중인 경우 */}
      {application.status === 'accepted' && (
        <YStack gap="$2" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0">
          <XStack alignItems="center" gap="$2">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={application.completion_requested ? '#F59E0B' : '#22C55E'}
              // @ts-ignore
              style={{ animation: 'pulse-green 1.5s ease-in-out infinite' }}
            />
            <Text fontSize={14} color={application.completion_requested ? '#F59E0B' : '#22C55E'} fontWeight="600" flex={1}>
              {application.completion_requested
                ? `${application.requester_profile?.nickname || '협업 요청자'}님이 작업 완료 요청 대기중`
                : `${application.requester_profile?.nickname || '협업 요청자'}님과 매칭완료`}
            </Text>
            {application.requester_profile?.business_card_url && (
              <View
                width={72}
                height={40}
                borderRadius={6}
                overflow="hidden"
                cursor="pointer"
                onClick={(e: any) => {
                  e.stopPropagation();
                  onImageClick(application.requester_profile?.business_card_url || '');
                }}
              >
                <img
                  src={application.requester_profile.business_card_url}
                  alt="명함"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </View>
            )}
          </XStack>
          {/* 액션 버튼 - 완료 요청 전에만 표시 */}
          {!application.completion_requested && (
            <XStack gap="$2" onClick={(e: any) => e.stopPropagation()}>
              <Button
                flex={1}
                flexBasis={0}
                size="$4"
                backgroundColor={brandColors.primary}
                color="white"
                fontWeight="500"
                onPress={() => onRequestCompletion?.(application.id, application.request_id)}
                hoverStyle={{ backgroundColor: brandColors.primaryHover }}
                pressStyle={{ backgroundColor: brandColors.primaryPressed }}
              >
                작업 완료 요청
              </Button>
              <Button
                flex={1}
                flexBasis={0}
                size="$4"
                backgroundColor="#fee2e2"
                color="#dc2626"
                fontWeight="500"
                onPress={async () => {
                  setIsCanceling(true);
                  try {
                    await onCancel(application.id, application.request_id);
                  } catch (err) {
                    console.error('Failed to cancel:', err);
                  } finally {
                    setIsCanceling(false);
                  }
                }}
                disabled={isCanceling}
                hoverStyle={{ backgroundColor: '#fecaca' }}
                pressStyle={{ backgroundColor: '#fca5a5' }}
              >
                작업 취소
              </Button>
            </XStack>
          )}
        </YStack>
      )}

      {/* 대기중인 경우 - 신청 취소 버튼 */}
      {application.status === 'pending' && (
        <XStack marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0" onClick={(e: any) => e.stopPropagation()}>
          <Button
            flex={1}
            size="$4"
            backgroundColor="#fee2e2"
            color="#dc2626"
            fontWeight="500"
            onPress={async () => {
              setIsCanceling(true);
              try {
                await onCancel(application.id, application.request_id);
              } catch (err) {
                console.error('Failed to cancel:', err);
              } finally {
                setIsCanceling(false);
              }
            }}
            disabled={isCanceling}
            hoverStyle={{ backgroundColor: '#fecaca' }}
            pressStyle={{ backgroundColor: '#fca5a5' }}
          >
            신청 취소
          </Button>
        </XStack>
      )}

      {/* 완료된 경우 - 완료 정보 표시 */}
      {application.status === 'completed' && (
        <XStack alignItems="center" gap="$2" marginTop="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="#f0f0f0">
          <YStack flex={1} gap="$1">
            <Text fontSize={13} color="#9CA3AF">
              {formatCompletedDateTime(application.updated_at)}
            </Text>
            <Text fontSize={14} color="#9CA3AF" fontWeight="600">
              {application.requester_profile?.nickname || '협업 요청자'}님과 수행완료
            </Text>
          </YStack>
          {application.requester_profile?.business_card_url && (
            <View
              width={72}
              height={40}
              borderRadius={6}
              overflow="hidden"
              cursor="pointer"
              opacity={0.7}
              onClick={(e: any) => {
                e.stopPropagation();
                onImageClick(application.requester_profile?.business_card_url || '');
              }}
            >
              <img
                src={application.requester_profile.business_card_url}
                alt="명함"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
          )}
        </XStack>
      )}
    </RequestCard>
    </>
  );
}

export function MyPage({ onBack, onNavigate, initialTab = 'myRequests', mode = 'requests' }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<Request | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<RequestApplication | null>(null);
  const [editingRequest, setEditingRequest] = useState<EditRequest | null>(null);
  const { user, signOut } = useAuth();
  const { profile, hasBusinessCard, refetch: refetchProfile } = useProfile();
  useNotifications(); // 알림 컨텍스트 초기화
  const {
    myApplications,
    applicationsToMyRequests,
    isLoading,
    hasActiveWork,
    inProgressApplicationsCount,
    inProgressRequestsCount,
    acceptApplication,
    rejectApplication,
    cancelApplication,
    requestCompletion,
    refetch,
  } = useRequestApplications();
  useRequests(); // 의뢰 데이터 초기화

  // 내가 작성한 의뢰들 (모든 상태)
  const [myRequests, setMyRequests] = useState<Request[]>([]);
  const [isLoadingMyRequests, setIsLoadingMyRequests] = useState(true);

  // 내 의뢰 로드 함수
  const fetchMyRequests = async () => {
    if (!user) return;
    const { supabase } = await import('../lib/supabase');
    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyRequests(data || []);
    setIsLoadingMyRequests(false);
  };

  // 내 의뢰 로드 (pending이 아닌 것도 포함)
  useEffect(() => {
    fetchMyRequests();
  }, [user]);

  const handleAccept = async (appId: string, reqId: string) => {
    try {
      await acceptApplication(appId, reqId);
      // 서버에서 최신 데이터 다시 로드
      await fetchMyRequests();
    } catch (err) {
      console.error('Failed to accept:', err);
    }
  };

  const handleReject = async (appId: string) => {
    try {
      await rejectApplication(appId);
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  const handleCancel = async (appId: string, reqId: string) => {
    await cancelApplication(appId, reqId);
  };

  const handleComplete = async (reqId: string) => {
    const { supabase } = await import('../lib/supabase');

    // 의뢰 정보 조회
    const { data: requestData } = await supabase
      .from('requests')
      .select('title')
      .eq('id', reqId)
      .single();

    // 수락된 신청자 정보 조회 (알림 보내기 위해)
    const { data: acceptedApp } = await supabase
      .from('request_applications')
      .select('applicant_id')
      .eq('request_id', reqId)
      .eq('status', 'accepted')
      .single();

    // 의뢰 상태 업데이트 (updated_at도 설정하여 24시간 필터링에 사용)
    const { error: reqError } = await supabase
      .from('requests')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', reqId);

    if (reqError) throw reqError;

    // 해당 의뢰의 수락된 신청도 완료 상태로 업데이트
    const { error: appError } = await supabase
      .from('request_applications')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('request_id', reqId)
      .eq('status', 'accepted');

    if (appError) throw appError;

    // 수행자에게 알림 전송
    if (acceptedApp && requestData) {
      await supabase.from('notifications').insert({
        user_id: acceptedApp.applicant_id,
        type: 'request_completed',
        title: '협업 완료',
        message: `"${requestData.title}" 협업이 완료되었습니다.`,
        request_id: reqId,
      });

      // SMS 발송 - 수행자에게
      const { data: performerProfile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', acceptedApp.applicant_id)
        .single();

      if (performerProfile?.phone) {
        sendSms({
          to: performerProfile.phone,
          message: SmsTemplates.workCompleted(requestData.title),
        });
      }
    }

    // 로컬 상태 업데이트
    setMyRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: 'completed' } : r
    ));

    // 신청 목록도 리프레시
    refetch();
  };

  const handleDeleteRequest = async (reqId: string) => {
    const { supabase } = await import('../lib/supabase');

    // 의뢰 삭제 (또는 cancelled 상태로 변경)
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', reqId);

    if (error) throw error;

    // 로컬 상태에서 제거
    setMyRequests(prev => prev.filter(r => r.id !== reqId));

    // 신청 목록도 리프레시
    refetch();
  };

  // 진행중인 작업 취소 (의뢰 등록자가)
  const handleCancelWork = async (reqId: string) => {
    const { supabase } = await import('../lib/supabase');

    // 의뢰 정보 조회
    const { data: requestData } = await supabase
      .from('requests')
      .select('title')
      .eq('id', reqId)
      .single();

    // 수락된 신청자 정보 조회 (알림 보내기 위해)
    const { data: acceptedApp } = await supabase
      .from('request_applications')
      .select('applicant_id')
      .eq('request_id', reqId)
      .eq('status', 'accepted')
      .single();

    // 수락된 신청 삭제
    const { error: appError } = await supabase
      .from('request_applications')
      .delete()
      .eq('request_id', reqId)
      .eq('status', 'accepted');

    if (appError) throw appError;

    // 다른 pending 신청자가 있는지 확인
    const { data: otherApps } = await supabase
      .from('request_applications')
      .select('id')
      .eq('request_id', reqId)
      .eq('status', 'pending');

    // 의뢰 상태를 pending 또는 applied로 변경
    const newStatus = otherApps && otherApps.length > 0 ? 'applied' : 'pending';
    const { error: reqError } = await supabase
      .from('requests')
      .update({ status: newStatus })
      .eq('id', reqId);

    if (reqError) throw reqError;

    // 수행자에게 알림 전송
    if (acceptedApp && requestData && user) {
      const requesterName = profile?.nickname || user.user_metadata?.name || '협업 요청자';
      await supabase.from('notifications').insert({
        user_id: acceptedApp.applicant_id,
        type: 'work_cancelled',
        title: '작업 취소됨',
        message: `${requesterName}님이 "${requestData.title}" 협업 요청을 취소했습니다.`,
        request_id: reqId,
      });
    }

    // 로컬 상태 업데이트
    setMyRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: newStatus } : r
    ));

    // 신청 목록도 리프레시
    refetch();
  };

  // 의뢰별 신청 그룹화
  const applicationsByRequest = applicationsToMyRequests.reduce((acc, app) => {
    if (!acc[app.request_id]) {
      acc[app.request_id] = [];
    }
    acc[app.request_id].push(app);
    return acc;
  }, {} as Record<string, RequestApplication[]>);


  // 로그인하지 않은 경우 홈으로 리다이렉트
  useEffect(() => {
    if (!user) {
      onBack();
    }
  }, [user, onBack]);

  if (!user) {
    return null;
  }

  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="#fff"
    >
      {/* iOS Safari 스와이프 백 방지 글로벌 CSS */}
      <style>{`
        .mypage-container {
          overscroll-behavior-x: none;
          -webkit-overflow-scrolling: touch;
        }
        .mypage-scroll {
          overscroll-behavior-x: none;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes pulse-dot {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }
        .pulse-dot {
          animation: pulse-dot 2.5s ease-in-out infinite;
        }
      `}</style>
      <View
        width="100%"
        height="100%"
        overflow="hidden"
        // @ts-ignore
        className="mypage-container"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* 헤더 - 상단 고정 */}
        <XStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          zIndex={100}
          backgroundColor="white"
          height={51}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor="#eee"
        >
          <XStack alignItems="center" gap="$1.5">
            <View cursor="pointer" onPress={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
            <Text fontSize={18} fontWeight="600" color="#000">
              {mode === 'profile' ? 'MY' : '실시간 현황'}
            </Text>
          </XStack>
          <HeaderActions
            onNotificationPress={() => setShowNotificationModal(true)}
            onLoginPress={() => {}}
          />
        </XStack>

        {/* 프로필 섹션 - MY 모드에서만 표시 */}
        {mode === 'profile' && (
          <YStack backgroundColor="white" borderBottomWidth={1} borderBottomColor="#eee" marginTop={51}>
            {/* 프로필 정보 */}
            <XStack padding="$4" justifyContent="space-between" alignItems="flex-start">
              <YStack gap="$1">
                <Text fontSize={18} fontWeight="700" color="#000">
                  {profile?.nickname || user?.user_metadata?.name || '사용자'}
                </Text>
                <Text fontSize={14} color="#000">
                  {user?.email || ''}
                </Text>
              </YStack>
              <Text
                fontSize={16}
                fontWeight="600"
                color="#000"
                cursor="pointer"
                onPress={() => signOut()}
              >
                로그아웃
              </Text>
            </XStack>

            {/* 명함 섹션 */}
            <YStack padding="$4" paddingTop="$2" gap="$3">
              <Text fontSize={16} fontWeight="600" color="#000">내 명함 or 사업자 등록증</Text>
              {hasBusinessCard && profile?.business_card_url ? (
                <View
                  borderRadius={12}
                  overflow="hidden"
                  backgroundColor="#f5f5f5"
                  cursor="pointer"
                  onPress={() => setEnlargedImageUrl(profile.business_card_url)}
                >
                  <img
                    src={profile.business_card_url}
                    alt="내 명함 or 사업자 등록증"
                    style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
                  />
                </View>
              ) : (
                <View
                  height={120}
                  borderRadius={12}
                  backgroundColor="#f5f5f5"
                  alignItems="center"
                  justifyContent="center"
                  borderWidth={1}
                  borderColor="#e0e0e0"
                  borderStyle="dashed"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#bbb" strokeWidth="1.5"/>
                    <circle cx="9" cy="10" r="2" stroke="#bbb" strokeWidth="1.5"/>
                    <path d="M7 16c0-1.5 1-2 2-2s2 .5 2 2" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 9h4M14 12h4" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <Text fontSize={14} color="#999" marginTop="$2">
                    명함 및 사업자 등록증을 등록해주세요
                  </Text>
                </View>
              )}
              <Button
                size="$4"
                backgroundColor={brandColors.primary}
                color="white"
                fontWeight="500"
                borderRadius={10}
                onPress={() => setShowProfileModal(true)}
                hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              >
                {hasBusinessCard ? '명함 or 사업자 등록증 수정' : '명함 or 사업자 등록증 등록'}
              </Button>
            </YStack>

            {/* 고객센터 */}
            <YStack padding="$4" paddingTop="$2" gap="$3" borderTopWidth={1} borderTopColor="#eee">
              <XStack
                alignItems="center"
                justifyContent="space-between"
                paddingVertical="$3"
                cursor="pointer"
                onPress={() => window.open('https://open.kakao.com/o/sVjluNci', '_blank')}
              >
                <XStack alignItems="center" gap="$3">
                  <View
                    width={40}
                    height={40}
                    borderRadius={10}
                    backgroundColor="#FEE500"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.82 5.32 4.55 6.72-.14.52-.57 2.13-.65 2.46-.1.41.15.41.32.3.13-.09 2.1-1.43 2.96-2.02.58.09 1.18.14 1.82.14 5.52 0 10-3.58 10-8S17.52 3 12 3z" fill="#3C1E1E"/>
                    </svg>
                  </View>
                  <YStack>
                    <Text fontSize={16} fontWeight="600" color="#000">채팅 고객센터</Text>
                    <Text fontSize={13} color="#888">카카오톡 오픈채팅</Text>
                  </YStack>
                </XStack>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18l6-6-6-6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </XStack>

              {/* 관리자 메뉴 - 특정 닉네임만 표시 */}
              {isAdminNickname(profile?.nickname) && (
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingVertical="$3"
                  cursor="pointer"
                  onPress={() => window.location.href = '/admin'}
                >
                  <XStack alignItems="center" gap="$3">
                    <View
                      width={40}
                      height={40}
                      borderRadius={10}
                      backgroundColor="#6366F1"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </View>
                    <YStack>
                      <Text fontSize={16} fontWeight="600" color="#000">관리자</Text>
                      <Text fontSize={13} color="#888">관리자 페이지</Text>
                    </YStack>
                  </XStack>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </XStack>
              )}
            </YStack>
          </YStack>
        )}

        {/* 탭 + 콘텐츠 래퍼 - requests 모드에서만 표시 */}
        {mode === 'requests' && (
          <View flex={1} marginTop={51} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 탭 - Fill 버튼 스타일 */}
            <XStack backgroundColor="white" padding="$3" gap="$2">
              <View
                flex={1}
                flexBasis={0}
                paddingVertical="$2.5"
                alignItems="center"
                backgroundColor={activeTab === 'myRequests' ? brandColors.primary : '#f3f4f6'}
                borderRadius={10}
                cursor="pointer"
                onPress={() => setActiveTab('myRequests')}
                hoverStyle={{ opacity: 0.9 }}
                pressStyle={{ scale: 0.98 }}
              >
                <XStack alignItems="center" justifyContent="center" gap="$2">
                  <Text
                    fontSize={15}
                    fontWeight="600"
                    color={activeTab === 'myRequests' ? 'white' : '#666'}
                  >
                   내가 요청한 협업
                  </Text>
                  {inProgressRequestsCount > 0 && (
                    <View
                      minWidth={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={activeTab === 'myRequests' ? 'white' : '#EF4444'}
                      alignItems="center"
                      justifyContent="center"
                      paddingHorizontal={6}
                    >
                      <Text fontSize={12} fontWeight="700" color={activeTab === 'myRequests' ? brandColors.primary : 'white'}>
                        {inProgressRequestsCount}
                      </Text>
                    </View>
                  )}
                </XStack>
              </View>
              <View
                flex={1}
                flexBasis={0}
                paddingVertical="$2.5"
                alignItems="center"
                backgroundColor={activeTab === 'myApplications' ? brandColors.primary : '#f3f4f6'}
                borderRadius={10}
                cursor="pointer"
                onPress={() => setActiveTab('myApplications')}
                hoverStyle={{ opacity: 0.9 }}
                pressStyle={{ scale: 0.98 }}
              >
                <XStack alignItems="center" justifyContent="center" gap="$2">
                  <Text
                    fontSize={15}
                    fontWeight="600"
                    color={activeTab === 'myApplications' ? 'white' : '#666'}
                  >
                   작업중인 협업
                  </Text>
                  {inProgressApplicationsCount > 0 && (
                    <View
                      minWidth={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor={activeTab === 'myApplications' ? 'white' : '#EF4444'}
                      alignItems="center"
                      justifyContent="center"
                      paddingHorizontal={6}
                    >
                      <Text fontSize={12} fontWeight="700" color={activeTab === 'myApplications' ? brandColors.primary : 'white'}>
                        {inProgressApplicationsCount}
                      </Text>
                    </View>
                  )}
                </XStack>
              </View>
            </XStack>

            {/* 컨텐츠 */}
            <ScrollView
            flex={1}
            showsVerticalScrollIndicator={false}
            // @ts-ignore
            className="mypage-scroll"
            style={{ flex: 1, overflow: 'auto' }}
          >
            {/* @ts-ignore - safe area padding for mobile */}
            <YStack padding="$3" gap="$3" paddingBottom={90}>
              {isLoading || isLoadingMyRequests ? (
                <View paddingVertical="$6" alignItems="center">
                  <Spinner size="large" color={brandColors.primary} />
                </View>
              ) : activeTab === 'myRequests' ? (
                // 내 의뢰 탭 - 대기중/진행중 먼저, 완료는 나중에
                (() => {
                  const sortedRequests = [...myRequests].sort((a, b) => {
                    const aIsActive = a.status === 'pending' || a.status === 'applied' || a.status === 'accepted';
                    const bIsActive = b.status === 'pending' || b.status === 'applied' || b.status === 'accepted';
                    if (aIsActive && !bIsActive) return -1;
                    if (!aIsActive && bIsActive) return 1;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  });
                  return sortedRequests.length === 0 ? (
                    <EmptyState message="협업 요청이 없습니다" />
                  ) : (
                    sortedRequests.map((req) => (
                      <MyRequestCard
                        key={req.id}
                        request={req}
                        applications={applicationsByRequest[req.id] || []}
                        onAccept={handleAccept}
                        onReject={handleReject}
                        onImageClick={(url) => setEnlargedImageUrl(url)}
                        onCardPress={() => {
                          setSelectedDetailRequest(req);
                        }}
                        onEdit={(request) => {
                          setEditingRequest(request as EditRequest);
                        }}
                        onDelete={handleDeleteRequest}
                        onCancelWork={handleCancelWork}
                        onComplete={handleComplete}
                      />
                    ))
                  );
                })()
              ) : (
                // 신청한 의뢰 탭 - 대기중/진행중 먼저, 완료는 나중에
                (() => {
                  const sortedApplications = [...myApplications].sort((a, b) => {
                    const aIsActive = a.status === 'pending' || a.status === 'accepted';
                    const bIsActive = b.status === 'pending' || b.status === 'accepted';
                    if (aIsActive && !bIsActive) return -1;
                    if (!aIsActive && bIsActive) return 1;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  });
                  return sortedApplications.length === 0 ? (
                    <EmptyState message="신청한 협업이 없습니다" />
                  ) : (
                    sortedApplications.map((app) => (
                      <MyApplicationCard
                        key={app.id}
                        application={app}
                        onCancel={handleCancel}
                        onCardPress={() => {
                          if (app.request) {
                            setSelectedDetailRequest(app.request as unknown as Request);
                            setSelectedApplication(app);
                          }
                        }}
                        onImageClick={(url) => setEnlargedImageUrl(url)}
                        onRequestCompletion={requestCompletion}
                      />
                    ))
                  );
                })()
              )}
            </YStack>
          </ScrollView>
          </View>
        )}

        {/* 프로필 수정 모달 */}
        <ProfileSetupModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSuccess={() => {
            setShowProfileModal(false);
            refetchProfile();
          }}
          isEdit={hasBusinessCard}
        />

        {/* 명함 원본 이미지 보기 */}
        <ImagePreviewModal imageUrl={enlargedImageUrl} onClose={() => setEnlargedImageUrl(null)} zIndex={2000} />

        {/* 알림 모달 */}
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onNavigate={(tab) => setActiveTab(tab)}
        />

        {/* 하단 네비게이션 */}
        <BottomNavigation
          activeMode={mode}
          onNavigate={(navMode) => {
            if (navMode === 'home') {
              onBack();
            } else if (onNavigate) {
              onNavigate(navMode);
            }
          }}
          onLoginRequired={() => {}}
          isLoggedIn={!!user}
          hasActiveWork={hasActiveWork}
        />

      </View>

      {/* 의뢰 상세 모달 - 컨테이너 밖에서 렌더링 */}
      {selectedDetailRequest && (
        <RequestDetailCard
          request={selectedDetailRequest}
          onClose={() => {
            setSelectedDetailRequest(null);
            setSelectedApplication(null);
          }}
          myApplication={selectedApplication}
          onCancelApplication={handleCancel}
          onRequestCompletion={requestCompletion}
          onEditRequest={(req) => {
            setEditingRequest(req as EditRequest);
            setSelectedDetailRequest(null);
            setSelectedApplication(null);
          }}
          onDeleteRequest={handleDeleteRequest}
          onCancelWork={handleCancelWork}
          onCompleteRequest={handleComplete}
          completionRequested={
            applicationsByRequest[selectedDetailRequest.id]?.find(
              (app) => app.status === 'accepted'
            )?.completion_requested ?? false
          }
        />
      )}

      {/* 의뢰 수정 모달 */}
      <RequestFormModal
        isOpen={!!editingRequest}
        onClose={() => setEditingRequest(null)}
        onSuccess={() => {
          setEditingRequest(null);
          fetchMyRequests();
          refetch();
        }}
        editRequest={editingRequest}
      />
    </View>
  );
}
