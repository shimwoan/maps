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
import { formatPrice, formatDate } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';
import { ImagePreviewModal } from '../ImagePreviewModal';

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
        <Text fontSize={14} color="#000" textAlign="center" marginTop="$2">
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
  const isCompleted = request.status === 'completed';

  // 상태에 따른 accent 색상 (마커 border 색상과 동일)
  const getAccentColor = () => {
    if (isCompleted) return '#9CA3AF'; // 완료 - 회색
    if (isInProgress) return '#F59E0B'; // 진행중 - 주황
    if (alreadyApplied) return '#22C55E'; // 신청중 - 초록
    if (request.is_urgent) return '#EF4444'; // 긴급 대기 - 빨강
    return '#3B82F6'; // 기본/대기 - 파랑
  };
  const accentColor = getAccentColor();

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
        accentColor={accentColor}
      >
        <YStack gap="$3" paddingBottom="$4">
          {/* 상단: AS종류 + 상태 배지 + 긴급 태그 */}
          <XStack gap="$2" alignItems="center">
            <XStack alignItems="center" gap="$1.5">
              <AsTypeIcon type={request.as_type} size={16} />
              <Text fontSize={16} fontWeight="600" color="#000">{request.as_type}</Text>
            </XStack>
            {/* 상태 배지 */}
            <View
              backgroundColor={
                request.status === 'completed' ? '#9CA3AF' :
                request.status === 'accepted' ? '#F59E0B' :
                '#fff'
              }
              paddingHorizontal={10}
              paddingVertical={4}
              borderRadius={6}
              borderWidth={request.status !== 'completed' && request.status !== 'accepted' ? 1 : 0}
              borderColor="#e5e7eb"
            >
              <Text
                fontSize={14}
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
                paddingHorizontal={10}
                paddingVertical={4}
                borderRadius={6}
              >
                <Text fontSize={14} fontWeight="700" color="white">긴급</Text>
              </View>
            )}
          </XStack>

          {/* 제목 + 금액 */}
          <YStack gap="$1">
            <Text fontSize={18} fontWeight="700" color="#000">
              {request.title}
            </Text>
            <Text fontSize={16} fontWeight="600" color={brandColors.primary} marginTop="$1">
              {formatPrice(request.expected_fee)}원
            </Text>
          </YStack>

          {/* 상세 정보 */}
          <YStack gap="$3" backgroundColor="#f9f9f9" padding="$4" borderRadius={12}>
            <XStack alignItems="flex-start">
              <XStack width={100} alignItems="center" gap="$1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3B82F6"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
                <Text fontSize={16} color="#000">주소</Text>
              </XStack>
              <Text fontSize={16} color="#000" flex={1}>
                {request.address}
                {request.address_detail ? ` ${request.address_detail}` : ''}
              </Text>
            </XStack>
            {request.model && (request.as_type === '복합기/OA' || request.as_type === '가전/설비') && (
              <XStack alignItems="center">
                <XStack width={100} alignItems="center" gap="$1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="4" width="16" height="16" rx="2" fill="#8B5CF6"/>
                    <rect x="7" y="8" width="10" height="3" rx="1" fill="white"/>
                    <circle cx="9" cy="15" r="1" fill="white"/>
                    <circle cx="12" cy="15" r="1" fill="white"/>
                    <circle cx="15" cy="15" r="1" fill="white"/>
                  </svg>
                  <Text fontSize={16} color="#000">기종</Text>
                </XStack>
                <Text fontSize={16} color="#000" flex={1}>{request.model}</Text>
              </XStack>
            )}
            {request.symptom && (
              <XStack alignItems="flex-start">
                <XStack width={100} alignItems="center" gap="$1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 22h20L12 2z" fill="#F59E0B"/>
                    <path d="M12 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="17" r="1" fill="white"/>
                  </svg>
                  <Text fontSize={16} color="#000">증상</Text>
                </XStack>
                <Text fontSize={16} color="#000" flex={1}>{request.symptom}</Text>
              </XStack>
            )}
            <XStack alignItems="center">
              <XStack width={100} alignItems="center" gap="$1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#10B981"/>
                  <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <Text fontSize={16} color="#000">예상소요</Text>
              </XStack>
              <Text fontSize={16} color="#000" flex={1}>{request.duration}</Text>
            </XStack>
            <XStack alignItems="center">
              <XStack width={100} alignItems="center" gap="$1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="18" rx="2" fill="#6366F1"/>
                  <path d="M3 9h18" stroke="white" strokeWidth="1.5"/>
                  <path d="M8 2v4M16 2v4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="15" r="2" fill="white"/>
                </svg>
                <Text fontSize={16} color="#000">처리요청</Text>
              </XStack>
              <Text fontSize={16} color="#000" flex={1}>
                {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
              </Text>
            </XStack>
            <XStack alignItems="center">
              <XStack width={100} alignItems="center" gap="$1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="7" r="4" fill="#EC4899"/>
                  <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" fill="#EC4899"/>
                </svg>
                <Text fontSize={16} color="#000">필요인원</Text>
              </XStack>
              <Text fontSize={16} color="#000" flex={1}>{request.required_personnel}명</Text>
            </XStack>
          </YStack>

          {/* 증상 이미지 슬라이더 */}
          {(() => {
            // symptom_images가 문자열인 경우 배열로 변환
            let images: string[] = [];
            if (request.symptom_images) {
              if (Array.isArray(request.symptom_images)) {
                images = request.symptom_images;
              } else if (typeof request.symptom_images === 'string') {
                // JSON 문자열인 경우 파싱 시도
                try {
                  const parsed = JSON.parse(request.symptom_images);
                  images = Array.isArray(parsed) ? parsed : [request.symptom_images];
                } catch {
                  // 단일 URL 문자열인 경우
                  images = [request.symptom_images];
                }
              }
            }
            return images.length > 0 ? (
              <ImageSlider images={images} onImageClick={setPreviewImage} />
            ) : null;
          })()}

          {/* 상세정보 */}
          {request.description && (
            <YStack gap={4}>
              <Text fontSize={16} fontWeight="600" color="#000" marginTop={8}>상세정보</Text>
              <Text fontSize={16} color="#000" lineHeight={22}>
                {request.description}
              </Text>
            </YStack>
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
                  <Text fontSize={16} color="#D97706" textAlign="center" fontWeight="600">
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
                <Text fontSize={14} color="#ff4444" textAlign="center" marginTop="$2">
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
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}
