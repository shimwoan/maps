import { useState, useEffect } from 'react';
import { View, Text, XStack, YStack, ScrollView, Spinner, Dialog } from 'tamagui';
import { Button } from '../components/Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useAuth } from '../contexts/AuthContext';
import { useRequestApplications, RequestApplication } from '../hooks/useRequestApplications';
import { useRequests, Request } from '../hooks/useRequests';

interface MyPageProps {
  onBack: () => void;
}

type TabType = 'myRequests' | 'myApplications';

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
      return { label: '수락됨', color: '#22C55E' };
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
}: {
  request: Request;
  applications: RequestApplication[];
  onAccept: (appId: string, reqId: string) => void;
  onReject: (appId: string) => void;
}) {
  const status = getStatusLabel(request.status);
  const pendingApps = applications.filter(a => a.status === 'pending');

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
        <Text fontSize={13} color="#666">
          {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
        </Text>
        <Text fontSize={13} color={brandColors.primary} fontWeight="600">
          {formatPrice(request.expected_fee)}원
        </Text>
      </XStack>

      {/* 신청자 목록 */}
      {pendingApps.length > 0 && (
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
              <XStack alignItems="center" gap="$2" flex={1}>
                {app.applicant_profile?.business_card_url ? (
                  <View
                    width={40}
                    height={40}
                    borderRadius={8}
                    overflow="hidden"
                    backgroundColor="#ddd"
                  >
                    <img
                      src={app.applicant_profile.business_card_url}
                      alt="명함"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </View>
                ) : (
                  <View
                    width={40}
                    height={40}
                    borderRadius={8}
                    backgroundColor="#ddd"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize={10} color="#888">명함없음</Text>
                  </View>
                )}
                <Text fontSize={13} color="#333" fontWeight="500">
                  {app.applicant_profile?.nickname || '신청자'}
                </Text>
              </XStack>
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
    </YStack>
  );
}

// 내가 신청한 의뢰 카드 (수행자 입장)
function MyApplicationCard({
  application,
  onCancel,
}: {
  application: RequestApplication;
  onCancel: (appId: string, reqId: string) => void;
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

export function MyPage({ onBack }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('myRequests');
  const { user, signOut } = useAuth();
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

  // 내 의뢰 로드 (pending이 아닌 것도 포함)
  useEffect(() => {
    if (user) {
      import('../lib/supabase').then(({ supabase }) => {
        supabase
          .from('requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            setMyRequests(data || []);
            setIsLoadingMyRequests(false);
          });
      });
    }
  }, [user]);

  const handleAccept = async (appId: string, reqId: string) => {
    try {
      await acceptApplication(appId, reqId);
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
          <Button
            size="$2"
            backgroundColor="transparent"
            color="#888"
            onPress={() => signOut()}
          >
            로그아웃
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
      </View>
    </View>
  );
}
