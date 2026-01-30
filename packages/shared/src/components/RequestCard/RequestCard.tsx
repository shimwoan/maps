import React, { useState, useEffect } from 'react';
import { View, Text, XStack, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { formatPrice, formatDate, getStatusLabel, formatTimeAgo } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';

// 협업 카테고리별 색상
const COLLABORATION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '방문AS': { bg: '#3B82F6', text: '#fff' },
  '설치이관': { bg: '#10B981', text: '#fff' },
  '인력지원': { bg: '#8B5CF6', text: '#fff' },
  '원격': { bg: '#EC4899', text: '#fff' },
  '납품': { bg: '#F97316', text: '#fff' },
};

interface RequestCardProps {
  title: string;
  asType: string;
  status: string;
  scheduleDate?: string;
  scheduleTime?: string;
  isTimeNegotiable?: boolean;
  expectedFee: number;
  address?: string;
  collaborationType?: string;
  isCompleted?: boolean;
  isUrgent?: boolean;
  isOwn?: boolean;
  distance?: string;
  hidePendingBadge?: boolean;
  createdAt?: string;
  onCardPress?: () => void;
  children?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export function RequestCard({
  title,
  asType,
  status,
  scheduleDate,
  scheduleTime,
  isTimeNegotiable = false,
  expectedFee,
  address,
  collaborationType,
  isCompleted = false,
  isUrgent = false,
  isOwn = false,
  distance,
  hidePendingBadge = false,
  createdAt,
  onCardPress,
  children,
  rightAction,
}: RequestCardProps) {
  const statusInfo = getStatusLabel(status);
  const hasChildren = React.Children.toArray(children).filter(child => React.isValidElement(child)).length > 0;
  const showStatusBadge = !(hidePendingBadge && (status === 'pending' || status === 'applied'));
  // 원격이면서 children이 없는 간단한 카드일 때만 원격 레이아웃 적용
  const isRemote = collaborationType === '원격' && !hasChildren;

  // 상대 시간 실시간 업데이트
  const [timeAgo, setTimeAgo] = useState(createdAt ? formatTimeAgo(createdAt) : '');

  useEffect(() => {
    if (!createdAt) return;

    setTimeAgo(formatTimeAgo(createdAt));

    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(createdAt));
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <View
      backgroundColor={isCompleted ? '#f5f5f5' : 'white'}
      borderRadius={12}
      paddingHorizontal="$3"
      paddingVertical="$3"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={isCompleted ? 0.05 : 0.12}
      shadowRadius={8}
      // @ts-ignore - web shadow
      style={{
        boxShadow: isCompleted ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.10)',
        position: 'relative',
        overflow: 'hidden',
        filter: isCompleted ? 'grayscale(80%)' : 'none',
      }}
      cursor={onCardPress ? "pointer" : "default"}
      onPress={onCardPress}
    >
      {/* MY 리본 - 우측 상단 */}
      {isOwn && (
        <View
          position="absolute"
          top={-2}
          right={-30}
          width={80}
          height={24}
          backgroundColor="#1D4ED8"
          alignItems="center"
          justifyContent="center"
          zIndex={10}
          // @ts-ignore
          style={{ transform: 'rotate(45deg)' }}
        >
          <Text fontSize={10} fontWeight="700" color="white">MY</Text>
        </View>
      )}
      {/* rightAction - 오른쪽 상단 고정 */}
      {rightAction && (
        <View position="absolute" top={12} right={12} zIndex={10}>
          {rightAction}
        </View>
      )}
      {/* 생성 시간 - 우측 하단 고정 */}
      {createdAt && (
        <Text position="absolute" bottom={12} right={12} fontSize={12} color="#999">
          {timeAgo}
        </Text>
      )}

      {/* 메인 콘텐츠 영역 */}
      <XStack alignItems="center">
        <YStack flex={1} minWidth={0}>
          {/* 협업 카테고리 배지 + 상태 배지 */}
          <XStack alignItems="center" gap="$2" flexWrap="wrap" minWidth={0}>
            {/* 협업 카테고리 배지 - 원격은 주소 부분에 표시 */}
            {collaborationType && collaborationType !== '원격' && (
              <View
                height={24}
                backgroundColor={COLLABORATION_TYPE_COLORS[collaborationType]?.bg || '#F97316'}
                paddingHorizontal={8}
                borderRadius={6}
                alignItems="center"
                justifyContent="center"
              >
                <Text
                  fontSize={12}
                  fontWeight="600"
                  color={COLLABORATION_TYPE_COLORS[collaborationType]?.text || '#fff'}
                >
                  {collaborationType}
                </Text>
              </View>
            )}
            {/* 상태 배지 - 아웃라인 스타일 */}
            {showStatusBadge && (
              <View
                height={24}
                backgroundColor="transparent"
                paddingHorizontal={8}
                borderRadius={6}
                borderWidth={1.5}
                borderColor={statusInfo.color}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={12} fontWeight="600" color={statusInfo.color}>
                  {statusInfo.label}
                </Text>
              </View>
            )}
          </XStack>

          {/* 제목 + AS 타입 */}
          <XStack alignItems="center" gap="$2" marginTop="$2" marginBottom={isRemote ? 0 : "$2.5"}>
            <Text fontSize={16} fontWeight="800" color="#333" flexShrink={0}>{asType}</Text>
            <Text fontSize={16} fontWeight="500" color={isCompleted ? '#333' : '#000'} numberOfLines={1} flex={1}>
              {title}
            </Text>
          </XStack>

          {/* 주소 + 거리 (원격이면 "원격" 표시) */}
          {(address || collaborationType === '원격') && (
            <XStack alignItems="center" gap="$1.5" marginTop="$1.5">
              {collaborationType === '원격' ? (
                <Text fontSize={14} fontWeight="600" color="#EC4899">
                  원격
                </Text>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 28" fill="none" style={{ flexShrink: 0 }}>
                    {/* 받침 타원 */}
                    <ellipse cx="12" cy="26" rx="6" ry="2" fill="#EF4444" opacity="0.6"/>
                    {/* 막대 */}
                    <rect x="10.5" y="10" width="3" height="14" fill="#D1D5DB"/>
                    {/* 빨간 원형 머리 */}
                    <circle cx="12" cy="7" r="6" fill="#EF4444"/>
                    {/* 하이라이트 */}
                    <path d="M9 5c0.5-1 1.5-2 3-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                  </svg>
                  <Text fontSize={14} color={isCompleted ? '#999' : '#333'} numberOfLines={1}>
                    {address}
                  </Text>
                  {distance && (
                    <XStack alignItems="center" gap={4} marginLeft="$1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#000"/>
                        <circle cx="12" cy="9" r="2" fill="white"/>
                      </svg>
                      <Text fontSize={12} color="#666">
                        {distance}
                      </Text>
                    </XStack>
                  )}
                </>
              )}
            </XStack>
          )}

          {/* 날짜/시간 */}
          {isTimeNegotiable ? (
            <Text fontSize={14} color={isCompleted ? '#999' : '#8B5CF6'} fontWeight="600" marginTop="$2">
              시간 협의
            </Text>
          ) : scheduleDate && scheduleTime && (
            <Text fontSize={14} color={isCompleted ? '#999' : '#444'} marginTop="$2">
              {formatDate(scheduleDate)} {scheduleTime.slice(0, 5)}
            </Text>
          )}
        </YStack>

        {/* 긴급 사이렌 + 금액을 오른쪽에 수직 정렬 */}
        <YStack alignItems="center" justifyContent="center" flexShrink={0}>
          {isUrgent && !isCompleted && (
            <img src="/siren.png" width={20} height={20} alt="긴급" style={{ marginBottom: 4 }} />
          )}
          <Text fontSize={16} color={isCompleted ? '#999' : status === 'accepted' ? '#F59E0B' : brandColors.primary} fontWeight="700">
            {formatPrice(expectedFee)}원
          </Text>
        </YStack>
      </XStack>

      {/* 추가 콘텐츠 (신청자 목록, 진행중 정보, 액션 버튼 등) - 전체 너비 */}
      {hasChildren && children}
    </View>
  );
}
