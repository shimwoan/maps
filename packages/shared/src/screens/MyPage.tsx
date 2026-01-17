import { useState, useEffect } from 'react';
import { View, Text, XStack, YStack, ScrollView, Spinner, Dialog } from 'tamagui';
import { Button } from '../components/Button';
import { ProfileSetupModal } from '../components/ProfileSetupModal';
import { NotificationModal } from '../components/NotificationModal';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useRequestApplications, RequestApplication } from '../hooks/useRequestApplications';
import { useRequests, Request } from '../hooks/useRequests';
import { useNotifications } from '../contexts/NotificationContext';

type TabType = 'myRequests' | 'myApplications';

interface MyPageProps {
  onBack: () => void;
  initialTab?: TabType;
}

// 금액 포맷팅
function formatPrice(price: number): string {
  if (price >= 10000) {
    const man = Math.floor(price / 10000);
    const rest = price % 10000;
    if (rest === 0) {
      return `${man}만`;
    }
    return `${man}만 ${rest.toLocaleString()}`;
  }
  return price.toLocaleString();
}

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return '오늘';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '내일';
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 상태 라벨
function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'pending':
      return { label: '대기중', color: '#888' };
    case 'applied':
      return { label: '신청있음', color: brandColors.primary };
    case 'accepted':
      return { label: '진행중', color: '#22C55E' };
    case 'rejected':
      return { label: '거절됨', color: '#ff4444' };
    case 'completed':
      return { label: '완료', color: '#666' };
    default:
      return { label: status, color: '#888' };
  }
}

// 내 의뢰 카드 (의뢰자 입장)
function MyRequestCard({
  request,
  applications,
  onAccept,
  onReject,
  onComplete,
}: {
  request: Request;
  applications: RequestApplication[];
  onAccept: (appId: string, reqId: string) => void;
  onReject: (appId: string) => void;
  onComplete: (reqId: string) => Promise<void>;
}) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const status = getStatusLabel(request.status);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const acceptedApp = applications.find(a => a.status === 'accepted');
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
    <YStack
      backgroundColor={isCompleted ? '#f8f8f8' : 'white'}
      borderRadius={12}
      padding="$3"
      gap="$2"
      borderWidth={1}
      borderColor={isCompleted ? '#e0e0e0' : '#eee'}
      opacity={isCompleted ? 0.7 : 1}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="700" color={isCompleted ? '#888' : '#000'} flex={1} numberOfLines={1}>
          {request.title}
        </Text>
        <View
          backgroundColor={status.color + '20'}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius={4}
        >
          <Text fontSize={11} fontWeight="600" color={status.color}>
            {status.label}
          </Text>
        </View>
      </XStack>

      <XStack gap="$3">
        <Text fontSize={13} color={isCompleted ? '#999' : '#666'}>
          {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
        </Text>
        <Text fontSize={13} color={isCompleted ? '#999' : brandColors.primary} fontWeight="600">
          {formatPrice(request.expected_fee)}원
        </Text>
      </XStack>

      {/* 진행중인 경우 - 수락된 신청자 정보 표시 */}
      {request.status === 'accepted' && acceptedApp && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" gap="$2">
              <View
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor="#22C55E"
              />
              <Text fontSize={13} color="#22C55E" fontWeight="600">
                {acceptedApp.applicant_profile?.nickname || '신청자'}님과 진행중
              </Text>
            </XStack>
            <Button
              size="$2"
              backgroundColor={brandColors.primary}
              color="white"
              onPress={() => setShowCompleteDialog(true)}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
            >
              의뢰 종료
            </Button>
          </XStack>
          {acceptedApp.applicant_profile?.business_card_url && (
            <img
              src={acceptedApp.applicant_profile.business_card_url}
              alt="명함"
              style={{ width: 'fit-content', maxWidth: '200px', borderRadius: 8 }}
            />
          )}
        </YStack>
      )}

      {/* 신청자 목록 - pending 상태일 때만 */}
      {pendingApps.length > 0 && request.status !== 'accepted' && (
        <YStack gap="$2" marginTop="$2" paddingTop="$2" borderTopWidth={1} borderTopColor="#eee">
          <Text fontSize={12} color="#888" fontWeight="600">
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
                <Text fontSize={14} color="#333" fontWeight="600">
                  {app.applicant_profile?.nickname || '신청자'}
                </Text>
                {app.applicant_profile?.business_card_url ? (
                  <img
                    src={app.applicant_profile.business_card_url}
                    alt="명함"
                    style={{ width: 'fit-content', borderRadius: 8 }}
                  />
                ) : (
                  <View
                    height={60}
                    borderRadius={8}
                    backgroundColor="#f5f5f5"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={12} color="#999">명함없음</Text>
                  </View>
                )}
              </YStack>
              <XStack gap="$2">
                <Button
                  size="$2"
                  backgroundColor="#f0f0f0"
                  color="#666"
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
      <Dialog modal open={showCompleteDialog} onOpenChange={(open: boolean) => setShowCompleteDialog(open)}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={['quick', { opacity: { overshootClamping: true } }]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            backgroundColor="white"
            borderRadius={16}
            padding="$4"
            width={300}
          >
            <YStack gap="$4">
              <YStack gap="$2" alignItems="center">
                <Text fontSize={16} fontWeight="700" color="#000">
                  의뢰 종료
                </Text>
                <Text fontSize={14} color="#666" textAlign="center">
                  의뢰를 종료하시겠습니까?
                </Text>
              </YStack>
              <XStack gap="$2" justifyContent="center">
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor="#f0f0f0"
                  color="#666"
                  onPress={() => setShowCompleteDialog(false)}
                  disabled={isCompleting}
                >
                  아니오
                </Button>
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor={brandColors.primary}
                  color="white"
                  onPress={handleConfirmComplete}
                  disabled={isCompleting}
                  hoverStyle={{ backgroundColor: brandColors.primaryHover }}
                >
                  {isCompleting ? <Spinner size="small" color="white" /> : '예, 종료합니다'}
                </Button>
              </XStack>
            </YStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </YStack>
  );
}

// 내가 신청한 의뢰 카드 (수행자 입장)
function MyApplicationCard({
  application,
  onCancel,
}: {
  application: RequestApplication;
  onCancel: (appId: string, reqId: string) => Promise<void>;
}) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const appStatus = getStatusLabel(application.status);
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

  return (
    <YStack
      backgroundColor="white"
      borderRadius={12}
      padding="$3"
      gap="$2"
      borderWidth={1}
      borderColor="#eee"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="700" color="#000" flex={1} numberOfLines={1}>
          {req.title}
        </Text>
        <View
          backgroundColor={appStatus.color + '20'}
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius={4}
        >
          <Text fontSize={11} fontWeight="600" color={appStatus.color}>
            {appStatus.label}
          </Text>
        </View>
      </XStack>

      <Text fontSize={13} color="#888" numberOfLines={1}>
        {req.address}
      </Text>

      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$3">
          <Text fontSize={13} color="#666">
            {formatDate(req.schedule_date)} {req.schedule_time.slice(0, 5)}
          </Text>
          <Text fontSize={13} color={brandColors.primary} fontWeight="600">
            {formatPrice(req.expected_fee)}원
          </Text>
        </XStack>

        {application.status === 'pending' && (
          <Button
            size="$2"
            backgroundColor="#fee2e2"
            color="#dc2626"
            onPress={() => setShowCancelDialog(true)}
          >
            취소
          </Button>
        )}
      </XStack>

      {/* 취소 확인 다이얼로그 */}
      <Dialog modal open={showCancelDialog} onOpenChange={(open: boolean) => setShowCancelDialog(open)}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={['quick', { opacity: { overshootClamping: true } }]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            backgroundColor="white"
            borderRadius={16}
            padding="$4"
            width={300}
          >
            <YStack gap="$4">
              <YStack gap="$2" alignItems="center">
                <Text fontSize={16} fontWeight="700" color="#000">
                  신청 취소
                </Text>
                <Text fontSize={14} color="#666" textAlign="center">
                  정말로 취소하시겠습니까?
                </Text>
              </YStack>
              <XStack gap="$2" justifyContent="center">
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor="#f0f0f0"
                  color="#666"
                  onPress={() => setShowCancelDialog(false)}
                  disabled={isCanceling}
                >
                  아니오
                </Button>
                <Button
                  flex={1}
                  size="$3"
                  backgroundColor="#dc2626"
                  color="white"
                  onPress={handleConfirmCancel}
                  disabled={isCanceling}
                >
                  {isCanceling ? <Spinner size="small" color="white" /> : '예, 취소합니다'}
                </Button>
              </XStack>
            </YStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </YStack>
  );
}

export function MyPage({ onBack, initialTab = 'myRequests' }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { user, signOut } = useAuth();
  const { profile, hasBusinessCard, refetch: refetchProfile } = useProfile();
  const { unreadCount } = useNotifications();
  const {
    myApplications,
    applicationsToMyRequests,
    isLoading,
    acceptApplication,
    rejectApplication,
    cancelApplication,
    refetch,
  } = useRequestApplications();
  const { requests } = useRequests();

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

    // 의뢰 상태 업데이트
    const { error: reqError } = await supabase
      .from('requests')
      .update({ status: 'completed' })
      .eq('id', reqId);

    if (reqError) throw reqError;

    // 해당 의뢰의 수락된 신청도 완료 상태로 업데이트
    const { error: appError } = await supabase
      .from('request_applications')
      .update({ status: 'completed' })
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
      backgroundColor="#f5f5f5"
      zIndex={1000}
    >
      <View width="100%" maxWidth={768} height="100%" alignSelf="center" backgroundColor="#f5f5f5">
        {/* 헤더 */}
        <XStack
          backgroundColor="white"
          paddingVertical="$3"
          paddingHorizontal="$4"
          alignItems="center"
          justifyContent="space-between"
          borderBottomWidth={1}
          borderBottomColor="#eee"
        >
          <XStack alignItems="center" gap="$3">
            <View cursor="pointer" onPress={onBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
            <Text fontSize={18} fontWeight="700" color="#000">마이페이지</Text>
          </XStack>
          <XStack alignItems="center" gap="$2">
            {/* 알림 버튼 */}
            <View
              position="relative"
              cursor="pointer"
              padding="$1"
              onPress={() => setShowNotificationModal(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {unreadCount > 0 && (
                <View
                  position="absolute"
                  top={-2}
                  right={-2}
                  minWidth={16}
                  height={16}
                  borderRadius={8}
                  backgroundColor={brandColors.primary}
                  alignItems="center"
                  justifyContent="center"
                  paddingHorizontal={4}
                >
                  <Text fontSize={10} fontWeight="700" color="white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Button
              size="$2"
              backgroundColor="transparent"
              color="#888"
              onPress={() => signOut()}
            >
              로그아웃
            </Button>
          </XStack>
        </XStack>

        {/* 프로필 섹션 */}
        <XStack
          backgroundColor="white"
          padding="$3"
          gap="$3"
          alignItems="center"
          borderBottomWidth={1}
          borderBottomColor="#eee"
        >
          {hasBusinessCard && profile?.business_card_url ? (
            <View
              width={48}
              height={48}
              borderRadius={8}
              overflow="hidden"
              backgroundColor="#f0f0f0"
              cursor="pointer"
              onPress={() => setShowImageModal(true)}
            >
              <img
                src={profile.business_card_url}
                alt="내 명함"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </View>
          ) : (
            <View
              width={48}
              height={48}
              borderRadius={8}
              backgroundColor="#f0f0f0"
              alignItems="center"
              justifyContent="center"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#999" strokeWidth="1.5"/>
                <circle cx="9" cy="10" r="2" stroke="#999" strokeWidth="1.5"/>
                <path d="M7 16c0-1.5 1-2 2-2s2 .5 2 2" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 9h4M14 12h4" stroke="#999" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </View>
          )}
          <YStack flex={1} gap="$1">
            <Text fontSize={15} fontWeight="600" color="#000">
              {profile?.nickname || user?.user_metadata?.name || '사용자'}
            </Text>
            <Text fontSize={12} color="#888">
              {hasBusinessCard ? '명함 등록됨' : '명함을 등록해주세요'}
            </Text>
          </YStack>
          <Button
            size="$2"
            backgroundColor="#f0f0f0"
            color="#333"
            onPress={() => setShowProfileModal(true)}
          >
            {hasBusinessCard ? '명함 수정' : '명함 등록'}
          </Button>
        </XStack>

        {/* 탭 */}
        <XStack backgroundColor="white" borderBottomWidth={1} borderBottomColor="#eee">
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
              fontSize={14}
              fontWeight="600"
              color={activeTab === 'myRequests' ? brandColors.primary : '#888'}
            >
              내 의뢰
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
              fontSize={14}
              fontWeight="600"
              color={activeTab === 'myApplications' ? brandColors.primary : '#888'}
            >
              신청한 의뢰
            </Text>
          </View>
        </XStack>

        {/* 컨텐츠 */}
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack padding="$3" gap="$3">
            {isLoading || isLoadingMyRequests ? (
              <View paddingVertical="$6" alignItems="center">
                <Spinner size="large" color={brandColors.primary} />
              </View>
            ) : activeTab === 'myRequests' ? (
              // 내 의뢰 탭
              myRequests.length === 0 ? (
                <View paddingVertical="$6" alignItems="center">
                  <Text fontSize={14} color="#888">등록한 의뢰가 없습니다</Text>
                </View>
              ) : (
                myRequests.map((req) => (
                  <MyRequestCard
                    key={req.id}
                    request={req}
                    applications={applicationsByRequest[req.id] || []}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                  />
                ))
              )
            ) : (
              // 신청한 의뢰 탭
              myApplications.length === 0 ? (
                <View paddingVertical="$6" alignItems="center">
                  <Text fontSize={14} color="#888">신청한 의뢰가 없습니다</Text>
                </View>
              ) : (
                myApplications.map((app) => (
                  <MyApplicationCard
                    key={app.id}
                    application={app}
                    onCancel={handleCancel}
                  />
                ))
              )
            )}
          </YStack>
        </ScrollView>

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
        {showImageModal && profile?.business_card_url && (
          <View
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.9)"
            zIndex={2000}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={() => setShowImageModal(false)}
          >
            <img
              src={profile.business_card_url}
              alt="내 명함"
              style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 8 }}
            />
            <View position="absolute" top={16} right={16}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </View>
          </View>
        )}

        {/* 알림 모달 */}
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      </View>
    </View>
  );
}
