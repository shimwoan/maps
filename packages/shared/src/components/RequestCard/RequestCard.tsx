import React from 'react';
import { View, Text, XStack, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { formatPrice, formatDate, getStatusLabel } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';

// 협업 카테고리별 색상
const COLLABORATION_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '방문AS': { bg: '#3B82F6', text: '#fff' },
  '설치이관': { bg: '#10B981', text: '#fff' },
  '인력지원': { bg: '#8B5CF6', text: '#fff' },
  '원격': { bg: '#EC4899', text: '#fff' },
};

interface RequestCardProps {
  title: string;
  asType: string;
  status: string;
  scheduleDate?: string;
  scheduleTime?: string;
  expectedFee: number;
  address?: string;
  collaborationType?: string;
  isCompleted?: boolean;
  isUrgent?: boolean;
  isOwn?: boolean;
  distance?: string;
  hidePendingBadge?: boolean;
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
  expectedFee,
  address,
  collaborationType,
  isCompleted = false,
  isUrgent = false,
  isOwn = false,
  distance,
  hidePendingBadge = false,
  onCardPress,
  children,
  rightAction,
}: RequestCardProps) {
  const statusInfo = getStatusLabel(status);
  const hasChildren = React.Children.toArray(children).filter(child => React.isValidElement(child)).length > 0;
  const showStatusBadge = !(hidePendingBadge && (status === 'pending' || status === 'applied'));
  // 원격이면서 children이 없는 간단한 카드일 때만 원격 레이아웃 적용
  const isRemote = collaborationType === '원격' && !hasChildren;

  return (
    <XStack
      backgroundColor="white"
      borderRadius={12}
      paddingHorizontal="$4"
      paddingVertical="$3.5"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.12}
      shadowRadius={8}
      // @ts-ignore - web shadow
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)', position: 'relative', overflow: 'hidden' }}
      opacity={isCompleted ? 0.85 : 1}
      cursor={onCardPress ? "pointer" : "default"}
      onPress={onCardPress}
      alignItems={isRemote ? "center" : "stretch"}
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
      <YStack flex={1} minWidth={0}>
        {/* AS 아이콘 + 협업 카테고리 배지 + 상태 배지 + rightAction */}
        <XStack alignItems="flex-start" justifyContent="space-between" gap="$2">
          <XStack alignItems="center" gap="$2" flex={1} flexWrap="wrap" minWidth={0}>
            {/* 협업 카테고리 배지 */}
            {collaborationType && (
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
            {/* 상태 배지 */}
            {showStatusBadge && (
              <View
                height={24}
                backgroundColor={statusInfo.bgColor}
                paddingHorizontal={8}
                borderRadius={6}
                borderWidth={statusInfo.bgColor === '#fff' ? 1.5 : 0}
                borderColor="#e5e7eb"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={12} fontWeight="600" color={statusInfo.color}>
                  {statusInfo.label}
                </Text>
              </View>
            )}
            {/* 긴급 배지 - 완료 상태에서는 숨김 */}
            {isUrgent && !isCompleted && (
              <View height={24} paddingHorizontal={8} backgroundColor="#FEE2E2" borderRadius={6} alignItems="center" justifyContent="center">
                <Text fontSize={12} fontWeight="600" color="#DC2626">긴급</Text>
              </View>
            )}
          </XStack>
          {rightAction && (
            <View flexShrink={0} overflow="visible">
              {rightAction}
            </View>
          )}
        </XStack>

        {/* 제목 + 프린터 아이콘 + 금액 */}
        <XStack alignItems="center" gap="$2" marginTop="$2" marginBottom={isRemote ? 0 : "$2.5"} justifyContent="space-between">
          <XStack alignItems="center" gap="$2" flex={1} minWidth={0}>
            <img src="/print.png" width={20} height={20} style={{ flexShrink: 0 }} />
            <Text fontSize={16} fontWeight="700" color={isCompleted ? '#333' : '#000'} numberOfLines={1} flex={1}>
              {title}
            </Text>
          </XStack>
          {!isRemote && (
            <Text fontSize={18} color={isCompleted ? '#999' : brandColors.primary} fontWeight="700" flexShrink={0}>
              {formatPrice(expectedFee)}원
            </Text>
          )}
        </XStack>

        {/* 주소 + 거리 */}
        {address && (
          <XStack alignItems="center" gap="$1.5" marginTop="$1.5">
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
              <XStack alignItems="center" gap={4} marginLeft="$2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#000"/>
                  <circle cx="12" cy="9" r="2" fill="white"/>
                </svg>
                <Text fontSize={12} color="#666">
                  {distance}
                </Text>
              </XStack>
            )}
          </XStack>
        )}

        {/* 날짜/시간 */}
        {scheduleDate && scheduleTime && (
          <Text fontSize={14} color={isCompleted ? '#999' : '#444'} marginTop="$2">
            {formatDate(scheduleDate)} {scheduleTime.slice(0, 5)}
          </Text>
        )}

        {/* 추가 콘텐츠 (신청자 목록, 진행중 정보, 액션 버튼 등) */}
        {hasChildren && children}
      </YStack>

      {/* 원격일 때 금액을 오른쪽에 수직 정중앙으로 표시 */}
      {isRemote && (
        <Text fontSize={18} color={isCompleted ? '#999' : brandColors.primary} fontWeight="700" flexShrink={0}>
          {formatPrice(expectedFee)}원
        </Text>
      )}
    </XStack>
  );
}
