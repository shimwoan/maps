import { View, Text, XStack, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';

interface RequestDetailCardProps {
  request: Request | null;
  onClose: () => void;
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

export function RequestDetailCard({ request, onClose }: RequestDetailCardProps) {
  if (!request) return null;

  return (
    <View
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      zIndex={200}
      backgroundColor="white"
      borderTopLeftRadius={20}
      borderTopRightRadius={20}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.1}
      shadowRadius={8}
      elevation={10}
      animation="quick"
      enterStyle={{ y: 300, opacity: 0 }}
      exitStyle={{ y: 300, opacity: 0 }}
    >
      {/* 닫기 핸들 */}
      <View
        alignItems="center"
        paddingVertical="$2"
        onPress={onClose}
        cursor="pointer"
      >
        <View width={40} height={4} backgroundColor="#ddd" borderRadius={2} />
      </View>

      <YStack paddingHorizontal="$4" paddingBottom="$5" gap="$3">
        {/* 상단: 방문유형 + 장비 태그 */}
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
          <Text fontSize={14} color="#666">{request.equipment_type}</Text>
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
      </YStack>
    </View>
  );
}
