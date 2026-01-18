import { useState } from 'react';
import { View, Text, XStack, YStack, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useRequestApplications } from '../../hooks/useRequestApplications';
import { LoginModal } from '../LoginModal';
import { ProfileSetupModal } from '../ProfileSetupModal';
import { BottomSheet } from '../BottomSheet';

// 이미지 슬라이더 컴포넌트
function ImageSlider({ images, onImageClick }: { images: string[]; onImageClick?: (url: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const handlePrev = (e: any) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = (e: any) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <View width="100%" marginBottom="$3">
      <View
        position="relative"
        width="100%"
        height={200}
        borderRadius={12}
        overflow="hidden"
        backgroundColor="#f5f5f5"
        cursor="pointer"
        onPress={() => onImageClick?.(images[currentIndex])}
      >
        <img
          src={images[currentIndex]}
          alt={`증상 이미지 ${currentIndex + 1}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
        {images.length > 1 && (
          <>
            {/* 이전 버튼 */}
            <View
              position="absolute"
              left={8}
              top="50%"
              // @ts-ignore
              style={{ transform: 'translateY(-50%)' }}
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="rgba(0,0,0,0.5)"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handlePrev}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
            {/* 다음 버튼 */}
            <View
              position="absolute"
              right={8}
              top="50%"
              // @ts-ignore
              style={{ transform: 'translateY(-50%)' }}
              width={32}
              height={32}
              borderRadius={16}
              backgroundColor="rgba(0,0,0,0.5)"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handleNext}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
            {/* 인디케이터 */}
            <XStack
              position="absolute"
              bottom={8}
              left={0}
              right={0}
              justifyContent="center"
              gap={6}
            >
              {images.map((_, index) => (
                <View
                  key={index}
                  width={8}
                  height={8}
                  borderRadius={4}
                  backgroundColor={index === currentIndex ? 'white' : 'rgba(255,255,255,0.5)'}
                  cursor="pointer"
                  onPress={() => setCurrentIndex(index)}
                />
              ))}
            </XStack>
          </>
        )}
      </View>
      {/* 이미지 카운터 */}
      {images.length > 1 && (
        <Text fontSize={12} color="#888" textAlign="center" marginTop="$2">
          {currentIndex + 1} / {images.length}
        </Text>
      )}
    </View>
  );
}

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    <>
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        zIndex={200}
      >
        <YStack gap="$3" paddingBottom="$4">
          {/* 상단: AS종류 + 상태 배지 + 긴급 태그 */}
          <XStack gap="$2" alignItems="center">
            <Text fontSize={16} fontWeight="600" color="#333">{request.as_type}</Text>
            {/* 상태 배지 */}
            <View
              backgroundColor={
                request.status === 'completed' ? '#9CA3AF' :
                request.status === 'accepted' ? '#F59E0B' :
                '#fff'
              }
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={4}
              borderWidth={request.status !== 'completed' && request.status !== 'accepted' ? 1 : 0}
              borderColor="#e5e7eb"
            >
              <Text
                fontSize={12}
                fontWeight="600"
                color={
                  request.status === 'completed' || request.status === 'accepted' ? '#fff' : '#3B82F6'
                }
              >
                {request.status === 'completed' ? '완료' :
                 request.status === 'accepted' ? '진행' :
                 '대기'}
              </Text>
            </View>
            {/* 긴급 태그 */}
            {request.is_urgent && (
              <View
                backgroundColor="#EF4444"
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={4}
              >
                <Text fontSize={12} fontWeight="700" color="white">긴급</Text>
              </View>
            )}
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
          <YStack gap="$3" backgroundColor="#f9f9f9" padding="$4" borderRadius={12}>
            <XStack>
              <Text fontSize={14} color="#888" width={100}>주소</Text>
              <Text fontSize={14} color="#333" flex={1}>
                {request.address}
                {request.address_detail ? ` ${request.address_detail}` : ''}
              </Text>
            </XStack>
            {request.model && (request.as_type === '복합기/OA' || request.as_type === '가전/설비') && (
              <XStack>
                <Text fontSize={14} color="#888" width={100}>기종</Text>
                <Text fontSize={14} color="#333" flex={1}>{request.model}</Text>
              </XStack>
            )}
            {request.symptom && (
              <XStack>
                <Text fontSize={14} color="#888" width={100}>증상</Text>
                <Text fontSize={14} color="#333" flex={1}>{request.symptom}</Text>
              </XStack>
            )}
            <XStack>
              <Text fontSize={14} color="#888" width={100}>예상소요시간</Text>
              <Text fontSize={14} color="#333" flex={1}>{request.duration}</Text>
            </XStack>
            <XStack>
              <Text fontSize={14} color="#888" width={100}>처리요청시간</Text>
              <Text fontSize={14} color="#333" flex={1}>
                {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
              </Text>
            </XStack>
            <XStack>
              <Text fontSize={14} color="#888" width={100}>필요인원</Text>
              <Text fontSize={14} color="#333" flex={1}>{request.required_personnel}명</Text>
            </XStack>
          </YStack>

          {/* 증상 이미지 슬라이더 */}
          {request.symptom_images && request.symptom_images.length > 0 && (
            <ImageSlider images={request.symptom_images} onImageClick={setPreviewImage} />
          )}

          {/* 설명 */}
          {request.description && (
            <Text fontSize={14} color="#666" lineHeight={22}>
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
      </BottomSheet>

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

      {/* 이미지 미리보기 모달 */}
      {previewImage && (
        <View
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="rgba(0,0,0,0.9)"
          zIndex={10000}
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={() => setPreviewImage(null)}
        >
          <View
            position="absolute"
            top={16}
            right={16}
            width={40}
            height={40}
            borderRadius={20}
            backgroundColor="rgba(255,255,255,0.2)"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={() => setPreviewImage(null)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
          <img
            src={previewImage}
            alt="미리보기"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: 8,
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </View>
      )}
    </>
  );
}
