import React from 'react';
import { View, Text, XStack, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { formatPrice, formatDate, getStatusLabel } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';

// 협업 카테고리별 색상
const COLLABORATION_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '방문AS': { bg: '#fff', border: '#F97316', text: '#EA580C' },
  '설치이관': { bg: '#fff', border: '#3B82F6', text: '#2563EB' },
  '회수지원': { bg: '#fff', border: '#8B5CF6', text: '#7C3AED' },
  '원격': { bg: '#fff', border: '#10B981', text: '#059669' },
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
  distance?: string;
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
  distance,
  onCardPress,
  children,
  rightAction,
}: RequestCardProps) {
  const statusInfo = getStatusLabel(status);
  const hasChildren = React.Children.toArray(children).filter(child => React.isValidElement(child)).length > 0;

  return (
    <YStack
      backgroundColor="white"
      borderRadius={12}
      paddingHorizontal="$4"
      paddingVertical="$3.5"
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.12}
      shadowRadius={8}
      // @ts-ignore - web shadow
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
      opacity={isCompleted ? 0.85 : 1}
      cursor={onCardPress ? "pointer" : "default"}
      onPress={onCardPress}
    >
      {/* AS 아이콘 + 협업 카테고리 배지 + 상태 배지 + rightAction */}
      <XStack alignItems="center" justifyContent="space-between" gap="$2">
        <XStack alignItems="center" gap="$2" flex={1} flexWrap="wrap">
          <AsTypeIcon type={asType} size={16} />
          {/* 협업 카테고리 배지 */}
          {collaborationType && (
            <View
              height={24}
              backgroundColor={COLLABORATION_TYPE_COLORS[collaborationType]?.bg || '#fff'}
              borderWidth={1.5}
              borderColor={COLLABORATION_TYPE_COLORS[collaborationType]?.border || '#999'}
              paddingHorizontal={8}
              borderRadius={6}
              alignItems="center"
              justifyContent="center"
            >
              <Text
                fontSize={12}
                fontWeight="600"
                color={COLLABORATION_TYPE_COLORS[collaborationType]?.text || '#666'}
              >
                {collaborationType}
              </Text>
            </View>
          )}
          {/* 상태 배지 */}
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
          {/* 긴급 배지 - 완료 상태에서는 숨김 */}
          {isUrgent && !isCompleted && (
            <View height={24} paddingHorizontal={8} backgroundColor="#FEE2E2" borderRadius={6} alignItems="center" justifyContent="center">
              <Text fontSize={12} fontWeight="600" color="#DC2626">긴급</Text>
            </View>
          )}
          {/* 거리 표시 */}
          {distance && (
            <XStack alignItems="center" gap={4}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#666"/>
                <circle cx="12" cy="9" r="2" fill="white"/>
              </svg>
              <Text fontSize={12} color="#666">
                {distance}
              </Text>
            </XStack>
          )}
        </XStack>
        {rightAction && (
          <View flexShrink={0}>
            {rightAction}
          </View>
        )}
      </XStack>

      {/* 제목 */}
      <Text fontSize={16} fontWeight="700" color={isCompleted ? '#333' : '#000'} numberOfLines={1} marginTop="$2">
        {title}
      </Text>

      {/* 주소 (있을 경우) */}
      {address && (
        <Text fontSize={14} color={isCompleted ? '#999' : '#333'} numberOfLines={1} marginTop="$1.5">
          {address}
        </Text>
      )}

      {/* 날짜/시간 + 가격 */}
      <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
        {scheduleDate && scheduleTime ? (
          <Text fontSize={14} color={isCompleted ? '#999' : '#444'}>
            {formatDate(scheduleDate)} {scheduleTime.slice(0, 5)}
          </Text>
        ) : (
          <View />
        )}
        <Text fontSize={18} color={isCompleted ? '#999' : brandColors.primary} fontWeight="600">
          {formatPrice(expectedFee)}원
        </Text>
      </XStack>

      {/* 추가 콘텐츠 (신청자 목록, 진행중 정보, 액션 버튼 등) */}
      {hasChildren && children}
    </YStack>
  );
}
