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
import { formatCompletedDateTime } from '../utils/format';

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
  onComplete,
  onImageClick,
  onCardPress,
}: {
  request: Request;
  applications: RequestApplication[];
  onAccept: (appId: string, reqId: string) => void;
  onReject: (appId: string) => void;
  onComplete: (reqId: string) => Promise<void>;
  onImageClick: (url: string) => void;
  onCardPress: () => void;
}) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const acceptedApp = applications.find(a => a.status === 'accepted' || a.status === 'completed');
  const isCompleted = request.status === 'completed';

  const handleConfirmComplete = async () => {
    setIsCompleting(true);
    try {
      await onComplete(request.id);
      setShowCompleteDialog(false);
    } catch (err) {
      console.error('Failed to complete:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <RequestCard
      title={request.title}
      asType={request.as_type}
      status={request.status}
      scheduleDate={request.schedule_date}
      scheduleTime={request.schedule_time}
      expectedFee={request.expected_fee}
      address={request.address}
      isCompleted={isCompleted}
      onCardPress={onCardPress}
    >
      {/* 진행중인 경우 - 수락된 신청자 정보 표시 */}
      {request.status === 'accepted' && acceptedApp && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              {/* @ts-ignore - animation defined in index.css */}
              <View
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor="#22C55E"
                style={{ animation: 'pulse-green 1.5s ease-in-out infinite' }}
              />
              <Text fontSize={14} color="#22C55E" fontWeight="600">
                {acceptedApp.applicant_profile?.nickname || '신청자'}님과 진행중
              </Text>
            </XStack>
            <View onClick={(e: any) => e.stopPropagation()}>
              <Button
                size="$2"
                backgroundColor={brandColors.primary}
                color="white"
                onPress={() => setShowCompleteDialog(true)}
                hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              >
                의뢰 종료
              </Button>
            </View>
          </XStack>
          {acceptedApp.applicant_profile?.business_card_url && (
            <img
              src={acceptedApp.applicant_profile.business_card_url}
              alt="명함"
              style={{ width: 'fit-content', maxWidth: '280px', borderRadius: 8, cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(acceptedApp.applicant_profile?.business_card_url || '');
              }}
            />
          )}
        </YStack>
      )}

      {/* 완료된 경우 - 수행자 정보 표시 */}
      {request.status === 'completed' && acceptedApp && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <XStack alignItems="center" gap="$2">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor="#9CA3AF"
            />
            <Text fontSize={14} color="#9CA3AF" fontWeight="600">
              {formatCompletedDateTime(request.updated_at || request.created_at)} {acceptedApp.applicant_profile?.nickname || '수행자'}님과 수행완료
            </Text>
          </XStack>
          {acceptedApp.applicant_profile?.business_card_url && (
            <img
              src={acceptedApp.applicant_profile.business_card_url}
              alt="명함"
              style={{ width: 'fit-content', maxWidth: '280px', borderRadius: 8, cursor: 'pointer', opacity: 0.7 }}
              onClick={(e) => {
                e.stopPropagation();
                onImageClick(acceptedApp.applicant_profile?.business_card_url || '');
              }}
            />
          )}
        </YStack>
      )}

      {/* 신청자 목록 - pending 상태일 때만 */}
      {pendingApps.length > 0 && request.status !== 'accepted' && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <Text fontSize={14} color="#000" fontWeight="600">
            신청자 ({pendingApps.length}명)
          </Text>
          {pendingApps.map((app) => (
            <XStack
              key={app.id}
              backgroundColor="#f9f9f9"
              padding="$2"
              borderRadius={8}
              alignItems="center"
              justifyContent="space-between"
            >
              <YStack gap="$2" flex={1}>
                <Text fontSize={16} color="#000" fontWeight="600">
                  {app.applicant_profile?.nickname || '신청자'}
                </Text>
                {app.applicant_profile?.business_card_url ? (
                  <img
                    src={app.applicant_profile.business_card_url}
                    alt="명함"
                    style={{ width: 'fit-content', maxWidth: '280px', borderRadius: 8, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageClick(app.applicant_profile?.business_card_url || '');
                    }}
                  />
                ) : (
                  <View
                    height={60}
                    borderRadius={8}
                    backgroundColor="#f5f5f5"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={14} color="#999">명함없음</Text>
                  </View>
                )}
              </YStack>
              <XStack gap="$2" onClick={(e: any) => e.stopPropagation()}>
                <Button
                  size="$2"
                  backgroundColor="#f0f0f0"
                  color="#000"
                  onPress={() => onReject(app.id)}
                  hoverStyle={{ backgroundColor: '#e8e8e8' }}
                >
                  거절
                </Button>
                <Button
                  size="$2"
                  backgroundColor={brandColors.primary}
                  color="white"
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

      {/* 의뢰 종료 확인 다이얼로그 */}
      <ConfirmationDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={handleConfirmComplete}
        title="의뢰 종료"
        message="의뢰를 종료하시겠습니까?"
        confirmText="예, 종료합니다"
        cancelText="아니오"
        isLoading={isCompleting}
      />
    </RequestCard>
  );
}

// 내가 신청한 의뢰 카드 (수행자 입장)
function MyApplicationCard({
  application,
  onCancel,
  onCardPress,
}: {
  application: RequestApplication;
  onCancel: (appId: string, reqId: string) => Promise<void>;
  onCardPress: () => void;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const req = application.request;

  if (!req) return null;

  const handleConfirmCancel = async () => {
    setIsCanceling(true);
    try {
      await onCancel(application.id, application.request_id);
      setShowCancelDialog(false);
    } catch (err) {
      console.error('Failed to cancel:', err);
    } finally {
      setIsCanceling(false);
    }
  };

  const cancelButton = (application.status === 'pending' || application.status === 'accepted') ? (
    <Button
      size="$2"
      backgroundColor="#fee2e2"
      color="#dc2626"
      onPress={(e: any) => {
        e.stopPropagation();
        setShowCancelDialog(true);
      }}
    >
      {application.status === 'accepted' ? '작업 취소' : '취소'}
    </Button>
  ) : undefined;

  return (
    <RequestCard
      title={req.title}
      asType={req.as_type}
      status={application.status}
      scheduleDate={req.schedule_date}
      scheduleTime={req.schedule_time}
      expectedFee={req.expected_fee}
      address={req.address}
      isCompleted={application.status === 'completed'}
      onCardPress={onCardPress}
      rightAction={cancelButton}
    >
      {/* 완료된 경우 - 완료 정보 표시 */}
      {application.status === 'completed' && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <XStack alignItems="center" gap="$2">
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor="#9CA3AF"
            />
            <Text fontSize={14} color="#9CA3AF" fontWeight="600">
              {formatCompletedDateTime(application.updated_at)} {application.requester_profile?.nickname || '의뢰자'}님과 수행완료
            </Text>
          </XStack>
        </YStack>
      )}

      {/* 취소 확인 다이얼로그 */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleConfirmCancel}
        title="신청 취소"
        message="정말로 취소하시겠습니까?"
        confirmText="예, 취소합니다"
        cancelText="아니오"
        isLoading={isCanceling}
        variant="danger"
      />
    </RequestCard>
  );
}

export function MyPage({ onBack, onNavigate, initialTab = 'myRequests', mode = 'requests' }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<Request | null>(null);
  const { user, signOut } = useAuth();
  const { profile, hasBusinessCard, refetch: refetchProfile } = useProfile();
  useNotifications(); // 알림 컨텍스트 초기화
  const {
    myApplications,
    applicationsToMyRequests,
    isLoading,
    acceptApplication,
    rejectApplication,
    cancelApplication,
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
        title: '의뢰 완료',
        message: `"${requestData.title}" 의뢰가 완료되었습니다.`,
        request_id: reqId,
      });
    }

    // 로컬 상태 업데이트
    setMyRequests(prev => prev.map(r =>
      r.id === reqId ? { ...r, status: 'completed' } : r
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
      backgroundColor="#fafafa"
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
      `}</style>
      <View
        width="100%"
        maxWidth={768}
        height="100%"
        alignSelf="center"
        backgroundColor="#fafafa"
        // @ts-ignore
        className="mypage-container"
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
          <XStack alignItems="center" gap="$3">
            <View cursor="pointer" onPress={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
            <Text fontSize={18} fontWeight="700" color="#000">
              {mode === 'profile' ? 'MY' : '내 의뢰'}
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
                fontWeight="600"
                borderRadius={10}
                onPress={() => setShowProfileModal(true)}
                hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              >
                {hasBusinessCard ? '명함 or 사업자 등록증 수정' : '명함 or 사업자 등록증 등록'}
              </Button>
            </YStack>
          </YStack>
        )}

        {/* 탭 - requests 모드에서만 표시 */}
        {mode === 'requests' && (
          <XStack backgroundColor="white" borderBottomWidth={1} borderBottomColor="#eee" marginTop={51}>
            <View
              flex={1}
              paddingVertical="$3"
              alignItems="center"
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'myRequests' ? brandColors.primary : 'transparent'}
              cursor="pointer"
              onPress={() => setActiveTab('myRequests')}
            >
              <Text
                fontSize={16}
                fontWeight="600"
                color={activeTab === 'myRequests' ? brandColors.primary : '#333'}
              >
                내가 요청한 의뢰
              </Text>
            </View>
            <View
              flex={1}
              paddingVertical="$3"
              alignItems="center"
              borderBottomWidth={2}
              borderBottomColor={activeTab === 'myApplications' ? brandColors.primary : 'transparent'}
              cursor="pointer"
              onPress={() => setActiveTab('myApplications')}
            >
              <Text
                fontSize={16}
                fontWeight="600"
                color={activeTab === 'myApplications' ? brandColors.primary : '#333'}
              >
                신청한 의뢰
              </Text>
            </View>
          </XStack>
        )}

        {/* 컨텐츠 - requests 모드에서만 표시 */}
        {mode === 'requests' && (
          <ScrollView
            flex={1}
            showsVerticalScrollIndicator={false}
            // @ts-ignore
            className="mypage-scroll"
          >
            {/* @ts-ignore - safe area padding for mobile */}
            <YStack padding="$3" gap="$3" paddingBottom={90}>
              {isLoading || isLoadingMyRequests ? (
                <View paddingVertical="$6" alignItems="center">
                  <Spinner size="large" color={brandColors.primary} />
                </View>
              ) : activeTab === 'myRequests' ? (
                // 내 의뢰 탭
                myRequests.length === 0 ? (
                  <EmptyState message="등록한 의뢰가 없습니다" />
                ) : (
                  myRequests.map((req) => (
                    <MyRequestCard
                      key={req.id}
                      request={req}
                      applications={applicationsByRequest[req.id] || []}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onComplete={handleComplete}
                      onImageClick={(url) => setEnlargedImageUrl(url)}
                      onCardPress={() => setSelectedDetailRequest(req)}
                    />
                  ))
                )
              ) : (
                // 신청한 의뢰 탭
                myApplications.length === 0 ? (
                  <EmptyState message="신청한 의뢰가 없습니다" />
                ) : (
                  myApplications.map((app) => (
                    <MyApplicationCard
                      key={app.id}
                      application={app}
                      onCancel={handleCancel}
                      onCardPress={() => app.request && setSelectedDetailRequest(app.request as unknown as Request)}
                    />
                  ))
                )
              )}
            </YStack>
          </ScrollView>
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
        />

      </View>

      {/* 의뢰 상세 모달 - 컨테이너 밖에서 렌더링 */}
      {selectedDetailRequest && (
        <RequestDetailCard
          request={selectedDetailRequest}
          onClose={() => setSelectedDetailRequest(null)}
        />
      )}
    </View>
  );
}
