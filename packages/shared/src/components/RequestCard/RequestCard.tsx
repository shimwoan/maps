import React, { useState } from 'react';
import { View, Text, XStack, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { formatPrice, formatDate, getStatusLabel } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';

interface RequestCardProps {
  title: string;
  asType: string;
  status: string;
  scheduleDate: string;
  scheduleTime: string;
  expectedFee: number;
  address?: string;
  isCompleted?: boolean;
  onCardPress?: () => void;
  children?: React.ReactNode;
  rightAction?: React.ReactNode;
  defaultExpanded?: boolean;
}

export function RequestCard({
  title,
  asType,
  status,
  scheduleDate,
  scheduleTime,
  expectedFee,
  address,
  isCompleted = false,
  onCardPress,
  children,
  rightAction,
  defaultExpanded = false,
}: RequestCardProps) {
  const statusInfo = getStatusLabel(status);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0;

  return (
    <YStack
      backgroundColor={isCompleted ? '#f8f8f8' : 'white'}
      borderRadius={12}
      padding="$3"
      gap="$2"
      borderWidth={1}
      borderColor={isCompleted ? '#e0e0e0' : '#eee'}
      opacity={isCompleted ? 0.7 : 1}
      cursor="pointer"
      onPress={onCardPress}
    >
      {/* 카테고리 */}
      <XStack alignItems="center" gap="$1.5" marginBottom="$1">
        <AsTypeIcon type={asType} size={14} />
        <Text fontSize={14} color={isCompleted ? '#999' : '#333'}>{asType}</Text>
      </XStack>

      {/* 제목 + 상태 배지 */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={16} fontWeight="700" color={isCompleted ? '#333' : '#000'} flex={1} numberOfLines={1}>
          {title}
        </Text>
        <View
          backgroundColor={statusInfo.bgColor}
          paddingHorizontal={10}
          paddingVertical={4}
          borderRadius={6}
          borderWidth={statusInfo.bgColor === '#fff' ? 1 : 0}
          borderColor="#e5e7eb"
        >
          <Text fontSize={14} fontWeight="600" color={statusInfo.color}>
            {statusInfo.label}
          </Text>
        </View>
      </XStack>

      {/* 주소 (있을 경우) */}
      {address && (
        <Text fontSize={14} color={isCompleted ? '#999' : '#000'} numberOfLines={1}>
          {address}
        </Text>
      )}

      {/* 날짜/시간 + 가격 + 우측 액션 + 토글 화살표 */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$3">
          <Text fontSize={14} color={isCompleted ? '#999' : '#333'}>
            {formatDate(scheduleDate)} {scheduleTime.slice(0, 5)}
          </Text>
          <Text fontSize={14} color={isCompleted ? '#999' : brandColors.primary} fontWeight="600">
            {formatPrice(expectedFee)}원
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$2">
          {rightAction}
          {hasChildren && (
            <View
              cursor="pointer"
              onPress={(e: any) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              // @ts-ignore - CSS transition
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 15l-6-6-6 6" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </View>
          )}
        </XStack>
      </XStack>

      {/* 추가 콘텐츠 (신청자 목록, 진행중 정보 등) - 접기/펼치기 */}
      {hasChildren && (
        <View
          // @ts-ignore - CSS transition
          style={{
            maxHeight: isExpanded ? '1000px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease',
          }}
        >
          {children}
        </View>
      )}
    </YStack>
  );
}
