import { useState } from 'react';
import { Sheet, View, Text, XStack, YStack, ScrollView, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useRequestApplications } from '../../hooks/useRequestApplications';
import { LoginModal } from '../LoginModal';
import { ProfileSetupModal } from '../ProfileSetupModal';

interface RequestDetailCardProps {
  request: Request | null;
  onClose: () => void;
  onAccept?: (requestId: string) => void;
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

export function RequestDetailCard({ request, onClose, onAccept }: RequestDetailCardProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const { user } = useAuth();
  const { hasBusinessCard, refetch: refetchProfile } = useProfile();
  const { applyToRequest, myApplications } = useRequestApplications();

  if (!request) return null;

  // 작성자가 아닌 경우에만 작업 수락 버튼 표시
  const canAccept = !user || user.id !== request.user_id;
  // 이미 신청했는지 확인
  const alreadyApplied = myApplications.some(app => app.request_id === request.id);
  // 진행중인 의뢰인지 확인
  const isInProgress = request.status === 'accepted';

  const handleAcceptClick = async () => {
    // 비로그인 시 로그인 모달 표시
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // 명함 미등록 시 프로필 설정 모달 표시
    if (!hasBusinessCard) {
      setShowProfileModal(true);
      return;
    }

    // 작업 신청 처리
    setIsApplying(true);
    setApplyError(null);
    try {
      await applyToRequest(request.id);
      onAccept?.(request.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '신청 중 오류가 발생했습니다';
      setApplyError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // 로그인 후 명함 체크
    refetchProfile();
  };

  const handleProfileSuccess = async () => {
    setShowProfileModal(false);
    // 명함 등록 후 작업 신청 처리
    setIsApplying(true);
    setApplyError(null);
    try {
      await applyToRequest(request.id);
      onAccept?.(request.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '신청 중 오류가 발생했습니다';
      setApplyError(errorMessage);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Sheet
      open={true}
      onOpenChange={(open: boolean) => !open && onClose()}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      zIndex={200}
      animation="medium"
    >
      <Sheet.Frame
        backgroundColor="white"
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        maxWidth={768}
        alignSelf="center"
        width="100%"
        // @ts-ignore - 하단 네비게이션 높이(60px) + safe area 고려
        style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <View alignSelf="center" marginVertical="$2">
          <View width={36} height={4} backgroundColor="#ddd" borderRadius={2} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <YStack paddingHorizontal="$4" paddingBottom="$5" paddingTop="$4" gap="$3">
            {/* 상단: 방문유형 + AS종류 태그 */}
            <XStack gap="$2" alignItems="center">
              <View
                backgroundColor={brandColors.primaryLight}
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius={4}
              >
                <Text fontSize={12} fontWeight="600" color={brandColors.primary}>
                  {request.visit_type}
                </Text>
              </View>
              <Text fontSize={14} color="#666">{request.as_type}</Text>
            </XStack>

            {/* 제목 + 금액 */}
            <YStack gap="$1">
              <Text fontSize={18} fontWeight="700" color="#000">
                {request.title}
              </Text>
              <Text fontSize={20} fontWeight="700" color={brandColors.primary}>
                {formatPrice(request.expected_fee)}원
              </Text>
            </YStack>

            {/* 상세 정보 */}
            <YStack gap="$2" backgroundColor="#f9f9f9" padding="$3" borderRadius={12}>
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="#888">주소</Text>
                <Text fontSize={13} color="#333" flex={1} textAlign="right">
                  {request.address}
                  {request.address_detail ? ` ${request.address_detail}` : ''}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="#888">일정</Text>
                <Text fontSize={13} color="#333">
                  {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="#888">소요시간</Text>
                <Text fontSize={13} color="#333">{request.duration}</Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text fontSize={13} color="#888">필요인원</Text>
                <Text fontSize={13} color="#333">{request.required_personnel}명</Text>
              </XStack>
            </YStack>

            {/* 설명 */}
            {request.description && (
              <Text fontSize={14} color="#666" lineHeight={20}>
                {request.description}
              </Text>
            )}

            {/* 작업 수락하기 버튼 - 작성자가 아닌 경우에만 표시 */}
            {canAccept && (
              <>
                {isInProgress ? (
                  <View
                    backgroundColor="#FEF3C7"
                    padding="$3"
                    borderRadius={8}
                    marginTop="$2"
                  >
                    <Text fontSize={14} color="#D97706" textAlign="center" fontWeight="600">
                      이미 진행중인 의뢰입니다
                    </Text>
                  </View>
                ) : (
                  <Button
                    size="$5"
                    backgroundColor={alreadyApplied ? '#999' : brandColors.primary}
                    color="white"
                    fontWeight="700"
                    marginTop="$2"
                    onPress={handleAcceptClick}
                    disabled={isApplying || alreadyApplied}
                    hoverStyle={{ backgroundColor: alreadyApplied ? '#999' : brandColors.primaryHover }}
                    pressStyle={{ backgroundColor: alreadyApplied ? '#999' : brandColors.primaryPressed, scale: 0.98 }}
                  >
                    {isApplying ? (
                      <Spinner size="small" color="white" />
                    ) : alreadyApplied ? (
                      '신청 완료'
                    ) : (
                      '작업 수락하기'
                    )}
                  </Button>
                )}
                {applyError && (
                  <Text fontSize={13} color="#ff4444" textAlign="center" marginTop="$2">
                    {applyError}
                  </Text>
                )}
              </>
            )}
          </YStack>
        </ScrollView>
      </Sheet.Frame>

      {/* 로그인 모달 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 프로필 설정 모달 */}
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSuccess={handleProfileSuccess}
      />
    </Sheet>
  );
}
