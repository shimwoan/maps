import { useState, useEffect } from 'react';
import { View, Text, XStack, YStack, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';
import type { RequestApplication } from '../../hooks/useRequestApplications';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import { useRequestApplications } from '../../hooks/useRequestApplications';
import { LoginModal } from '../LoginModal';
import { ProfileSetupModal } from '../ProfileSetupModal';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { BottomSheet } from '../BottomSheet';
import { formatPrice, formatDate } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';
import { ImagePreviewModal } from '../ImagePreviewModal';
import type { CollaborationType } from '../RequestFormModal/types';

// 협업 카테고리별 색상
const COLLABORATION_TYPE_COLORS: Record<CollaborationType, { bg: string; text: string }> = {
  '방문AS': { bg: '#3B82F6', text: '#fff' },
  '설치이관': { bg: '#10B981', text: '#fff' },
  '인력지원': { bg: '#8B5CF6', text: '#fff' },
  '원격': { bg: '#EC4899', text: '#fff' },
};

// 협업 카테고리 뱃지 컴포넌트
function CollaborationTypeBadge({ type }: { type: string }) {
  const colors = COLLABORATION_TYPE_COLORS[type as CollaborationType] || COLLABORATION_TYPE_COLORS['방문AS'];

  return (
    <View
      height={24}
      backgroundColor={colors.bg}
      paddingHorizontal={8}
      borderRadius={6}
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize={12} fontWeight="600" color={colors.text}>
        {type}
      </Text>
    </View>
  );
}

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
  // 수행자용 props
  myApplication?: RequestApplication | null;
  onCancelApplication?: (appId: string, reqId: string) => Promise<void>;
  onRequestCompletion?: (appId: string, reqId: string) => Promise<void>;
  onEditRequest?: (request: Request) => void;
  // 의뢰 등록자용 props
  onDeleteRequest?: (requestId: string) => Promise<void>;
  onCancelWork?: (requestId: string) => Promise<void>;
  onCompleteRequest?: (requestId: string) => Promise<void>;
  completionRequested?: boolean;
  // 관리자용
  hideActions?: boolean;
}

export function RequestDetailCard({
  request,
  onClose,
  onAccept,
  myApplication,
  onCancelApplication,
  onRequestCompletion,
  onEditRequest,
  onDeleteRequest,
  onCancelWork,
  onCompleteRequest,
  completionRequested,
  hideActions = false,
}: RequestDetailCardProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCancelApplicationDialog, setShowCancelApplicationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelWorkDialog, setShowCancelWorkDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showCompletionRequestDialog, setShowCompletionRequestDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const { hasBusinessCard, refetch: refetchProfile } = useProfile();
  const { applyToRequest, myApplications, cancelApplication } = useRequestApplications();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (showMenu) {
      const handleClick = () => setShowMenu(false);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showMenu]);

  if (!request) return null;

  // 작성자가 아닌 경우에만 작업 수락 버튼 표시
  const canAccept = !user || user.id !== request.user_id;
  // 이미 신청했는지 확인
  const myPendingApplication = myApplications.find(app => app.request_id === request.id && app.status === 'pending');
  const alreadyApplied = !!myPendingApplication;
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

  // 공유하기 핸들러
  const handleShare = async () => {
    const params = new URLSearchParams();
    params.set('requestId', request.id);
    if (request.latitude) params.set('lat', String(request.latitude));
    if (request.longitude) params.set('lng', String(request.longitude));

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    try {
      // Web Share API 지원 여부 확인
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        // Fallback: 클립보드에 복사
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (err) {
      // 사용자가 공유 취소한 경우 무시
      if ((err as Error).name !== 'AbortError') {
        // 클립보드 복사 시도
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShowShareToast(true);
          setTimeout(() => setShowShareToast(false), 2000);
        } catch {
          console.error('Failed to share:', err);
        }
      }
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        zIndex={300}
        accentColor={accentColor}
        showMyBadge={!canAccept}
      >
        <YStack gap="$3" paddingBottom="$4">
          {/* 상단: 업종 + 협업 카테고리/상태 배지 + 공유하기 */}
          <XStack gap="$2" alignItems="center" justifyContent="space-between">
            <XStack gap="$2" alignItems="center" flex={1}>
              {/* 업종 */}
              <Text fontSize={16} fontWeight="800" color="#333" flexShrink={0}>
                {request.as_type}
              </Text>
              {/* 협업 카테고리 배지 - 원격은 주소 부분에 표시 */}
              {request.collaboration_type && request.collaboration_type !== '원격' && (
                <CollaborationTypeBadge type={request.collaboration_type} />
              )}
              {/* 상태 배지 (진행중/완료) - 아웃라인 스타일 */}
              {(request.status === 'accepted' || request.status === 'completed') && (
                <View
                  height={24}
                  backgroundColor="transparent"
                  paddingHorizontal={8}
                  borderRadius={6}
                  borderWidth={1.5}
                  borderColor={request.status === 'completed' ? '#9CA3AF' : '#F59E0B'}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text
                    fontSize={12}
                    fontWeight="600"
                    color={request.status === 'completed' ? '#9CA3AF' : '#F59E0B'}
                  >
                    {request.status === 'completed' ? '완료' : '진행중'}
                  </Text>
                </View>
              )}
            </XStack>
            {/* 우측 버튼 영역 */}
            <XStack alignItems="center">
              {/* 공유하기 버튼 */}
              <XStack
                paddingHorizontal={12}
                paddingVertical={8}
                borderRadius={20}
                backgroundColor="#f5f5f5"
                alignItems="center"
                justifyContent="center"
                gap={4}
                cursor="pointer"
                hoverStyle={{ backgroundColor: '#e5e5e5' }}
                pressStyle={{ backgroundColor: '#d5d5d5', scale: 0.95 }}
                onPress={handleShare}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <Text fontSize={14} fontWeight="500" color="#333">공유하기</Text>
              </XStack>
              {/* 메뉴 버튼 - 대기중 상태이고 본인이 작성한 의뢰일 때만 표시 */}
              {!canAccept && !isInProgress && !isCompleted && (
                <View position="relative">
                  <View
                    padding={8}
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
                      top={36}
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
                          if (onEditRequest && request) {
                            onEditRequest(request);
                          }
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
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Text fontSize={14} fontWeight="600" color="#dc2626">삭제</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </XStack>
          </XStack>

          {/* 제목 */}
          <Text fontSize={18} fontWeight="700" color="#000" marginTop={-8}>
            {request.title}
          </Text>

          {/* 상세 정보 */}
          <YStack>
            <XStack alignItems="flex-start" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
              <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                <svg width="18" height="20" viewBox="0 0 24 28" fill="none">
                  {/* 받침 타원 */}
                  <ellipse cx="12" cy="26" rx="6" ry="2" fill="#EF4444" opacity="0.6"/>
                  {/* 막대 */}
                  <rect x="10.5" y="10" width="3" height="14" fill="#D1D5DB"/>
                  {/* 빨간 원형 머리 */}
                  <circle cx="12" cy="7" r="6" fill="#EF4444"/>
                  {/* 하이라이트 */}
                  <path d="M9 5c0.5-1 1.5-2 3-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                </svg>
                <Text fontSize={16} color="#444" fontWeight="600">주소</Text>
              </XStack>
              <Text fontSize={16} color={request.collaboration_type === '원격' ? '#EC4899' : '#000'} flex={1} textAlign="right" fontWeight="600">
                {request.collaboration_type === '원격' ? '원격' : (
                  <>
                    {request.address}
                    {request.address_detail ? ` ${request.address_detail}` : ''}
                  </>
                )}
              </Text>
            </XStack>
            <XStack alignItems="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
              <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {/* 돈주머니 몸통 */}
                  <ellipse cx="12" cy="14" rx="9" ry="9" fill="#F5C542"/>
                  {/* 주머니 윗부분 */}
                  <ellipse cx="12" cy="5" rx="3.5" ry="2.5" fill="#F5C542"/>
                  {/* 끈 부분 */}
                  <rect x="8" y="6" width="8" height="3" rx="1" fill="#D4A017"/>
                  {/* 달러 표시 $ */}
                  <path d="M12 9v10" stroke="#8B6914" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 12c0-1.5 1.3-2 3-2s3 .5 3 2c0 1.5-1.3 2-3 2s-3 .5-3 2c0 1.5 1.3 2 3 2s3-.5 3-2" stroke="#8B6914" strokeWidth="2" strokeLinecap="round" fill="none"/>
                </svg>
                <Text fontSize={16} color="#444" fontWeight="600">예상수익</Text>
              </XStack>
              <XStack alignItems="center" gap="$2">
                <Text fontSize={18} fontWeight="700" color="#22C55E">
                  {formatPrice(request.expected_fee)}원
                </Text>
                <View
                  height={24}
                  backgroundColor={request.needs_invoice ? "#FEE2E2" : "#F3F4F6"}
                  paddingHorizontal={8}
                  borderRadius={4}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text fontSize={12} fontWeight="600" color={request.needs_invoice ? "#DC2626" : "#6B7280"}>
                    {request.needs_invoice ? "세금계산서 O" : "세금계산서 X"}
                  </Text>
                </View>
              </XStack>
            </XStack>
            {request.model && (request.as_type === '복합기/OA' || request.as_type === '가전/설비') && (
              <XStack alignItems="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
                <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="4" y="4" width="16" height="16" rx="2" fill="#8B5CF6"/>
                    <rect x="7" y="8" width="10" height="3" rx="1" fill="white"/>
                    <circle cx="9" cy="15" r="1" fill="white"/>
                    <circle cx="12" cy="15" r="1" fill="white"/>
                    <circle cx="15" cy="15" r="1" fill="white"/>
                  </svg>
                  <Text fontSize={16} color="#444" fontWeight="600">기종</Text>
                </XStack>
                <Text fontSize={16} color="#000" textAlign="right" fontWeight="600">{request.model}</Text>
              </XStack>
            )}
            {request.symptom && (
              <XStack alignItems="flex-start" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
                <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 22h20L12 2z" fill="#F59E0B"/>
                    <path d="M12 9v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="17" r="1" fill="white"/>
                  </svg>
                  <Text fontSize={16} color="#444" fontWeight="600">증상</Text>
                </XStack>
                <Text fontSize={16} color="#000" textAlign="right" flex={1} fontWeight="600">{request.symptom}</Text>
              </XStack>
            )}
            <XStack alignItems="center" paddingVertical={8} borderBottomWidth={1} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
              <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {/* 달력 몸통 */}
                  <rect x="3" y="6" width="18" height="16" rx="2" fill="#F5F5F5" stroke="#E0E0E0" strokeWidth="1"/>
                  {/* 달력 상단 (빨간색) */}
                  <rect x="3" y="6" width="18" height="5" rx="2" fill="#EF4444"/>
                  {/* 달력 고리 */}
                  <rect x="7" y="3" width="2" height="5" rx="1" fill="#9CA3AF"/>
                  <rect x="15" y="3" width="2" height="5" rx="1" fill="#9CA3AF"/>
                  {/* 날짜 표시 */}
                  <rect x="6" y="13" width="4" height="3" rx="0.5" fill="#EF4444"/>
                  <rect x="12" y="13" width="4" height="3" rx="0.5" fill="#E5E5E5"/>
                  <rect x="6" y="18" width="4" height="3" rx="0.5" fill="#E5E5E5"/>
                </svg>
                <Text fontSize={16} color="#444" fontWeight="600">처리일정</Text>
              </XStack>
              <Text fontSize={18} fontWeight="700" color="#F59E0B">
                {formatDate(request.schedule_date)} {request.schedule_time.slice(0, 5)}
              </Text>
            </XStack>
            <XStack alignItems="center" paddingVertical={8} borderBottomWidth={request.description ? 1 : 0} borderBottomColor="#f0f0f0" justifyContent="space-between" gap={12}>
              <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  {/* 뒷사람 */}
                  <circle cx="16" cy="7" r="3" fill="#9CA3AF"/>
                  <path d="M12 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" fill="#9CA3AF"/>
                  {/* 앞사람 */}
                  <circle cx="9" cy="7" r="4" fill="#6B7280"/>
                  <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" fill="#6B7280"/>
                </svg>
                <Text fontSize={16} color="#444" fontWeight="600">필요인원</Text>
              </XStack>
              <Text fontSize={18} fontWeight="700" color="#F59E0B">{request.required_personnel}명</Text>
            </XStack>
            {request.description && (
              <XStack alignItems="flex-start" paddingVertical={8} justifyContent="space-between" gap={12}>
                <XStack alignItems="center" gap="$1.5" flexShrink={0}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" fill="#6B7280"/>
                    <path d="M7 8h10M7 12h10M7 16h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <Text fontSize={16} color="#444" fontWeight="600">상세설명</Text>
                </XStack>
                <Text fontSize={16} color="#000" lineHeight={24} flex={1} textAlign="right" fontWeight="600">{request.description}</Text>
              </XStack>
            )}
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


          {/* 의뢰 등록자용 버튼 - 본인이 작성한 의뢰일 때 (진행중) */}
          {!canAccept && isInProgress && !isCompleted && (
            <XStack gap="$2.5" marginTop="$2">
              <Button
                flex={1}
                size="$5"
                backgroundColor="#fee2e2"
                color="#dc2626"
                fontWeight="500"
                onPress={() => setShowCancelWorkDialog(true)}
                disabled={isProcessing}
                hoverStyle={{ backgroundColor: '#fecaca' }}
                pressStyle={{ backgroundColor: '#fca5a5', scale: 0.98 }}
              >
                협업요청 취소
              </Button>
              {completionRequested && (
                <Button
                  flex={1}
                  size="$5"
                  backgroundColor="#22C55E"
                  color="white"
                  fontWeight="500"
                  onPress={() => setShowCompleteDialog(true)}
                  disabled={isProcessing}
                  hoverStyle={{ backgroundColor: '#16A34A' }}
                  pressStyle={{ backgroundColor: '#15803D', scale: 0.98 }}
                >
                  작업 완료
                </Button>
              )}
            </XStack>
          )}

          {/* 작업 수락하기 버튼 - 작성자가 아닌 경우에만 표시, 수행자용 모달에서는 숨김, 완료된 의뢰에서는 숨김 */}
          {canAccept && !myApplication && !isCompleted && (
            <>
              {isInProgress ? (
                <View
                  backgroundColor="#FEF3C7"
                  padding="$3"
                  borderRadius={8}
                  marginTop="$2"
                >
                  <Text fontSize={16} color="#D97706" textAlign="center" fontWeight="600">
                    이미 진행중인 협업입니다
                  </Text>
                </View>
              ) : alreadyApplied ? (
                <Button
                  size="$5"
                  backgroundColor="#fee2e2"
                  color="#dc2626"
                  fontWeight="500"
                  marginTop="$2"
                  onPress={() => setShowCancelApplicationDialog(true)}
                  disabled={isProcessing}
                  hoverStyle={{ backgroundColor: '#fecaca' }}
                  pressStyle={{ backgroundColor: '#fca5a5', scale: 0.98 }}
                >
                  신청 취소
                </Button>
              ) : (
                <Button
                  size="$5"
                  backgroundColor={brandColors.primary}
                  color="white"
                  fontWeight="500"
                  marginTop="$2"
                  onPress={handleAcceptClick}
                  disabled={isApplying}
                  hoverStyle={{ backgroundColor: brandColors.primaryHover }}
                  pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
                >
                  {isApplying ? (
                    <Spinner size="small" color="white" />
                  ) : (
                    '가능합니다'
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

          {/* 수행자용 버튼 - 내가 신청한 의뢰이고 진행중일 때 */}
          {!hideActions && myApplication && myApplication.status === 'accepted' && (
            <YStack gap="$2" marginTop="$3">
              {/* 완료 요청 대기중 표시 */}
              {myApplication.completion_requested && (
                <View
                  backgroundColor="#FEF3C7"
                  padding="$3"
                  borderRadius={8}
                >
                  <Text fontSize={16} color="#D97706" textAlign="center" fontWeight="600">
                    작업 완료 요청 대기중
                  </Text>
                </View>
              )}
              {/* 버튼 영역 - 완료 요청 대기중이 아닐 때만 표시 */}
              {!myApplication.completion_requested && (
                <XStack gap="$2.5" justifyContent="center">
                  {/* 작업 완료 요청 버튼 */}
                  <Button
                    flex={1}
                    size="$4"
                    backgroundColor={brandColors.primary}
                    color="white"
                    fontWeight="500"
                    onPress={() => setShowCompletionRequestDialog(true)}
                    disabled={isProcessing}
                    hoverStyle={{ backgroundColor: brandColors.primaryHover }}
                    pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
                  >
                    작업 완료 요청
                  </Button>
                  {/* 작업 취소 버튼 */}
                  <Button
                    flex={1}
                    size="$4"
                    backgroundColor="#fee2e2"
                    color="#dc2626"
                    fontWeight="500"
                    onPress={() => setShowCancelDialog(true)}
                    disabled={isProcessing}
                    hoverStyle={{ backgroundColor: '#fecaca' }}
                    pressStyle={{ backgroundColor: '#fca5a5', scale: 0.98 }}
                  >
                    작업 취소
                  </Button>
                </XStack>
              )}
            </YStack>
          )}

          {/* 수행자용 버튼 - 내가 신청한 의뢰이고 대기중일 때 */}
          {!hideActions && myApplication && myApplication.status === 'pending' && (
            <Button
              size="$5"
              backgroundColor="#fee2e2"
              color="#dc2626"
              fontWeight="500"
              marginTop="$2"
              onPress={() => setShowCancelDialog(true)}
              disabled={isProcessing}
              hoverStyle={{ backgroundColor: '#fecaca' }}
              pressStyle={{ backgroundColor: '#fca5a5', scale: 0.98 }}
            >
              신청 취소
            </Button>
          )}
        </YStack>
      </BottomSheet>

      {/* 작업 완료 요청 확인 다이얼로그 */}
      <ConfirmationDialog
        isOpen={showCompletionRequestDialog}
        onClose={() => setShowCompletionRequestDialog(false)}
        onConfirm={async () => {
          if (!myApplication || !onRequestCompletion) return;
          setIsProcessing(true);
          try {
            await onRequestCompletion(myApplication.id, myApplication.request_id);
            setShowCompletionRequestDialog(false);
          } catch (err) {
            console.error('Failed to request completion:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title="작업 완료 요청"
        message="협업 요청자에게 작업 완료 요청을 보내시겠습니까?"
        confirmText="예, 요청합니다"
        cancelText="아니오"
        isLoading={isProcessing}
      />

      {/* 작업/신청 취소 확인 다이얼로그 (수행자) */}
      <ConfirmationDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={async () => {
          if (!myApplication || !onCancelApplication) return;
          setIsProcessing(true);
          try {
            await onCancelApplication(myApplication.id, myApplication.request_id);
            setShowCancelDialog(false);
            onClose();
          } catch (err) {
            console.error('Failed to cancel:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title={myApplication?.status === 'pending' ? '신청 취소' : '작업 취소'}
        message={myApplication?.status === 'pending' ? '정말로 신청을 취소하시겠습니까?' : '정말로 작업을 취소하시겠습니까?'}
        confirmText="예, 취소합니다"
        cancelText="아니오"
        isLoading={isProcessing}
        variant="danger"
      />

      {/* 신청 취소 확인 다이얼로그 (수행자 - 대기중) */}
      <ConfirmationDialog
        isOpen={showCancelApplicationDialog}
        onClose={() => setShowCancelApplicationDialog(false)}
        onConfirm={async () => {
          if (!myPendingApplication || !request) return;
          setIsProcessing(true);
          try {
            await cancelApplication(myPendingApplication.id, request.id);
            setShowCancelApplicationDialog(false);
          } catch (err) {
            console.error('Failed to cancel application:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title="신청 취소"
        message="작업 신청을 취소하시겠습니까?"
        confirmText="예, 취소합니다"
        cancelText="아니오"
        isLoading={isProcessing}
        variant="danger"
      />

      {/* 의뢰 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={async () => {
          if (!request || !onDeleteRequest) return;
          setIsProcessing(true);
          try {
            await onDeleteRequest(request.id);
            setShowDeleteDialog(false);
            onClose();
          } catch (err) {
            console.error('Failed to delete request:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title="삭제"
        message="정말로 삭제하시겠습니까?"
        confirmText="예, 삭제합니다"
        cancelText="아니오"
        isLoading={isProcessing}
        variant="danger"
      />

      {/* 의뢰 취소 확인 다이얼로그 (의뢰 등록자 - 진행중) */}
      <ConfirmationDialog
        isOpen={showCancelWorkDialog}
        onClose={() => setShowCancelWorkDialog(false)}
        onConfirm={async () => {
          if (!request || !onCancelWork) return;
          setIsProcessing(true);
          try {
            await onCancelWork(request.id);
            setShowCancelWorkDialog(false);
            onClose();
          } catch (err) {
            console.error('Failed to cancel work:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title="협업요청 취소"
        message="진행중인 협업을 취소하시겠습니까?"
        confirmText="예, 취소합니다"
        cancelText="아니오"
        isLoading={isProcessing}
        variant="danger"
      />

      {/* 작업 완료 확인 다이얼로그 (의뢰 등록자) */}
      <ConfirmationDialog
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onConfirm={async () => {
          if (!request || !onCompleteRequest) return;
          setIsProcessing(true);
          try {
            await onCompleteRequest(request.id);
            setShowCompleteDialog(false);
            onClose();
          } catch (err) {
            console.error('Failed to complete request:', err);
          } finally {
            setIsProcessing(false);
          }
        }}
        title="작업 완료"
        message="작업을 완료 처리하시겠습니까?"
        confirmText="예, 완료합니다"
        cancelText="아니오"
        isLoading={isProcessing}
      />

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

      {/* 공유 링크 복사 토스트 */}
      {showShareToast && (
        <View
          position="fixed"
          bottom={100}
          left={0}
          right={0}
          alignItems="center"
          zIndex={9999}
          pointerEvents="none"
        >
          <View
            backgroundColor="rgba(0,0,0,0.8)"
            paddingHorizontal={20}
            paddingVertical={12}
            borderRadius={8}
          >
            <Text fontSize={14} color="white" fontWeight="500">
              링크가 복사되었습니다
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
