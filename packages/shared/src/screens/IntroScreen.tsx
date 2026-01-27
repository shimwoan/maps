import { View, Text, YStack, XStack } from 'tamagui';
import { Button } from '../components/Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useAuth } from '../contexts/AuthContext';

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  const { user } = useAuth();

  const getUserName = () => {
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return '전문가';
  };

  return (
    <View
      width="100%"
      height="100vh"
      backgroundColor="#FAFBFC"
      alignItems="center"
      overflow="hidden"
      // @ts-ignore - safe area for mobile browsers
      style={{
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <View
        width="100%"
        maxWidth={480}
        height="100%"
        paddingHorizontal="$4"
        paddingTop="$3"
        paddingBottom="$4"
        justifyContent="space-between"
      >
        {/* 최상단: 특징 */}
        <XStack justifyContent="center" alignItems="center" gap="$4">
          <FeatureItem icon="⚡" text="실시간 매칭" />
          <FeatureItem icon="✓" text="검증된 전문가" />
          <FeatureItem icon="📍" text="위치 기반" />
        </XStack>

        {/* 상단: 로고 + 슬로건 */}
        <YStack alignItems="center" gap="$1">
          <img src="/glove.png" alt="협업" width={180} height={180} style={{ objectFit: 'contain', marginTop: 32,marginLeft:12 }} />
          <Text fontSize={18} fontWeight="600" marginTop={-8} marginLeft={4}>
            가장 빠른 현장 연결
          </Text>
        </YStack>

        {/* 중앙: 앱 이름 + 설명 */}
        <YStack alignItems="center" gap="$4" flex={1} justifyContent="center">
          <YStack alignItems="center" gap="$2">
            <Text fontSize={40} fontWeight="800" color="#000">
              협업
            </Text>
            <XStack alignItems="center" gap="$3">
              <XStack alignItems="center" gap="$1.5">
                <View width={8} height={8} borderRadius={4} backgroundColor="#FF6B6B" />
                <Text fontSize={14} color="#666">협업 요청</Text>
              </XStack>
              <XStack alignItems="center" gap="$1.5">
                <View width={8} height={8} borderRadius={4} backgroundColor={brandColors.primary} />
                <Text fontSize={14} color="#666">작업 수락</Text>
              </XStack>
            </XStack>
          </YStack>

          {/* 설명 텍스트 */}
          <YStack alignItems="center" gap="$2" marginTop="$6">
            <Text fontSize={18} textAlign="center" color="#333">
              주변 전문가에게
            </Text>
            <Text fontSize={18} textAlign="center" fontWeight="600">
              실시간으로 작업을 요청하세요
            </Text>
            <Text fontSize={16} textAlign="center" color="#666" marginTop="$1">
              {user && <Text fontWeight="600" color="#333">{getUserName()}님! </Text>}오늘도 신속하고 안전하게 협업하세요
            </Text>
          </YStack>
        </YStack>

        {/* 하단: 버튼 */}
        <YStack gap="$3">
          <Button
            size="$5"
            backgroundColor={brandColors.primary}
            color="white"
            fontWeight="500"
            fontSize={17}
            width="100%"
            height={52}
            borderRadius={14}
            onPress={onStart}
            hoverStyle={{ backgroundColor: brandColors.primaryHover }}
            pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
          >
            시작하기
          </Button>
        </YStack>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <XStack alignItems="center" gap="$1.5">
      <Text fontSize={18}>{icon}</Text>
      <Text fontSize={16} color="#666">{text}</Text>
    </XStack>
  );
}
