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
  scheduleDate: string;
  scheduleTime: string;
  expectedFee: number;
  address?: string;
  collaborationType?: string;
  isCompleted?: boolean;
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
  onCardPress,
  children,
  rightAction,
}: RequestCardProps) {
  const statusInfo = getStatusLabel(status);
  const hasChildren = React.Children.toArray(children).filter(child => React.isValidElement(child)).length > 0;

  return (
    <YStack
      backgroundColor={isCompleted ? '#f8f8f8' : 'white'}
      borderRadius={12}
      paddingHorizontal="$3"
      paddingTop="$2.5"
      paddingBottom="$2"
      gap="$1.5"
      borderWidth={1}
      borderColor={isCompleted ? '#e0e0e0' : '#eee'}
      opacity={isCompleted ? 0.7 : 1}
      cursor={onCardPress ? "pointer" : "default"}
      onPress={onCardPress}
    >
      {/* AS 아이콘 + 협업 카테고리 배지 + 상태 배지 + rightAction */}
      <XStack alignItems="center" justifyContent="space-between">
        <XStack alignItems="center" gap="$2">
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
        </XStack>
        {rightAction}
      </XStack>

      {/* 제목 */}
      <Text fontSize={16} fontWeight="700" color={isCompleted ? '#333' : '#000'} numberOfLines={1}>
        {title}
      </Text>

      {/* 주소 (있을 경우) */}
      {address && (
        <Text fontSize={14} color={isCompleted ? '#999' : '#000'} numberOfLines={1}>
          {address}
        </Text>
      )}

      {/* 날짜/시간 + 가격 */}
      <XStack gap="$3">
        <Text fontSize={14} color={isCompleted ? '#999' : '#333'}>
          {formatDate(scheduleDate)} {scheduleTime.slice(0, 5)}
        </Text>
        <Text fontSize={18} color={isCompleted ? '#999' : brandColors.primary} fontWeight="600">
          {formatPrice(expectedFee)}원
        </Text>
      </XStack>

      {/* 추가 콘텐츠 (신청자 목록, 진행중 정보, 액션 버튼 등) */}
      {hasChildren && children}
    </YStack>
  );
}
