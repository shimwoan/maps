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
    >
      <View
        width="100%"
        maxWidth={480}
        height="100%"
        paddingHorizontal="$5"
        paddingTop="$6"
        paddingBottom="$5"
        justifyContent="space-between"
      >
        {/* 상단: 로고 + 앱 이름 */}
        <YStack alignItems="center" gap="$3" paddingTop="$4">
          <View
            width={72}
            height={72}
            borderRadius={20}
            backgroundColor={brandColors.primaryLight}
            alignItems="center"
            justifyContent="center"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3.5" fill={brandColors.primary} />
              <circle cx="12" cy="3.5" r="2" fill={brandColors.primary} />
              <circle cx="19.5" cy="7.5" r="2" fill={brandColors.primary} />
              <circle cx="19.5" cy="16.5" r="2" fill={brandColors.primary} />
              <circle cx="12" cy="20.5" r="2" fill={brandColors.primary} />
              <circle cx="4.5" cy="16.5" r="2" fill={brandColors.primary} />
              <circle cx="4.5" cy="7.5" r="2" fill={brandColors.primary} />
              <path
                d="M12 5.5v3.5M12 15v3.5M14.5 10.5l3.5-2M14.5 13.5l3.5 2M9.5 10.5l-3.5-2M9.5 13.5l-3.5 2"
                stroke={brandColors.primary}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </View>
          <YStack alignItems="center" gap="$1">
            <Text fontSize={32} fontWeight="800" color={brandColors.primary}>
              협업
            </Text>
            <Text fontSize={14} fontWeight="500" color="#888">
              가장 빠른 현장 연결
            </Text>
          </YStack>
        </YStack>

        {/* 중앙: 지도 인포그래픽 */}
        <View
          width="100%"
          flex={1}
          alignItems="center"
          justifyContent="center"
          paddingVertical="$4"
        >
          <View
            width="100%"
            maxWidth={320}
            height={240}
            borderRadius={24}
            backgroundColor="white"
            overflow="hidden"
            shadowColor="#000"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.08}
            shadowRadius={16}
            position="relative"
          >
            {/* 지도 배경 그리드 */}
            <View position="absolute" top={0} left={0} right={0} bottom={0}>
              <svg width="100%" height="100%" viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
                {/* 배경 */}
                <rect width="320" height="240" fill="#f8fafc" />
                {/* 도로 그리드 */}
                <path d="M0 80 L320 80" stroke="#e2e8f0" strokeWidth="12" />
                <path d="M0 160 L320 160" stroke="#e2e8f0" strokeWidth="8" />
                <path d="M80 0 L80 240" stroke="#e2e8f0" strokeWidth="10" />
                <path d="M200 0 L200 240" stroke="#e2e8f0" strokeWidth="8" />
                <path d="M260 0 L260 240" stroke="#e2e8f0" strokeWidth="6" />
                {/* 건물 블록들 */}
                <rect x="20" y="100" width="40" height="45" rx="4" fill="#cbd5e1" />
                <rect x="100" y="95" width="55" height="50" rx="4" fill="#cbd5e1" />
                <rect x="220" y="100" width="35" height="40" rx="4" fill="#cbd5e1" />
                <rect x="25" y="180" width="45" height="35" rx="4" fill="#cbd5e1" />
                <rect x="100" y="175" width="40" height="45" rx="4" fill="#cbd5e1" />
                <rect x="230" y="170" width="50" height="50" rx="4" fill="#cbd5e1" />
                <rect x="110" y="20" width="50" height="40" rx="4" fill="#cbd5e1" />
                <rect x="220" y="15" width="45" height="45" rx="4" fill="#cbd5e1" />
                {/* 마커 핀 1 - 요청자 */}
                <g transform="translate(160, 70)">
                  <ellipse cx="0" cy="28" rx="8" ry="3" fill="rgba(0,0,0,0.15)" />
                  <path d="M0 0 C-12 0 -18 8 -18 16 C-18 28 0 32 0 32 C0 32 18 28 18 16 C18 8 12 0 0 0Z" fill="#FF6B6B" />
                  <circle cx="0" cy="14" r="6" fill="white" />
                </g>
                {/* 마커 핀 2 - 수행자 */}
                <g transform="translate(90, 130)">
                  <ellipse cx="0" cy="24" rx="6" ry="2.5" fill="rgba(0,0,0,0.12)" />
                  <path d="M0 0 C-10 0 -15 7 -15 13 C-15 23 0 27 0 27 C0 27 15 23 15 13 C15 7 10 0 0 0Z" fill={brandColors.primary} />
                  <circle cx="0" cy="11" r="5" fill="white" />
                </g>
                {/* 마커 핀 3 - 수행자 */}
                <g transform="translate(240, 120)">
                  <ellipse cx="0" cy="24" rx="6" ry="2.5" fill="rgba(0,0,0,0.12)" />
                  <path d="M0 0 C-10 0 -15 7 -15 13 C-15 23 0 27 0 27 C0 27 15 23 15 13 C15 7 10 0 0 0Z" fill={brandColors.primary} />
                  <circle cx="0" cy="11" r="5" fill="white" />
                </g>
                {/* 연결선 애니메이션 효과 (점선) */}
                <path d="M160 85 Q125 110 90 130" stroke={brandColors.primary} strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6" />
                <path d="M160 85 Q200 100 240 120" stroke={brandColors.primary} strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6" />
                {/* 펄스 효과 원 */}
                <circle cx="160" cy="70" r="25" fill="none" stroke="#FF6B6B" strokeWidth="1" opacity="0.3" />
                <circle cx="160" cy="70" r="35" fill="none" stroke="#FF6B6B" strokeWidth="1" opacity="0.15" />
              </svg>
            </View>
            {/* 오버레이 텍스트 */}
            <View
              position="absolute"
              bottom={16}
              left={16}
              right={16}
              backgroundColor="rgba(255,255,255,0.95)"
              borderRadius={12}
              paddingHorizontal="$3"
              paddingVertical="$2"
            >
              <XStack alignItems="center" gap="$2">
                <View width={8} height={8} borderRadius={4} backgroundColor="#FF6B6B" />
                <Text fontSize={12} color="#666">의뢰 요청</Text>
                <View width={8} height={8} borderRadius={4} backgroundColor={brandColors.primary} marginLeft="$2" />
                <Text fontSize={12} color="#666">작업 수락</Text>
              </XStack>
            </View>
          </View>

          {/* 설명 텍스트 */}
          <Text
            fontSize={14}
            color="#888"
            textAlign="center"
            marginTop="$4"
            lineHeight={22}
          >
            내 주변 전문가에게{'\n'}
            <Text fontWeight="600" color="#555">실시간으로 작업을 요청</Text>하세요
          </Text>
        </View>

        {/* 하단: 인사말 + 버튼 + 특징 */}
        <YStack gap="$4">
          {/* 인사말 */}
          <View
            width="100%"
            paddingHorizontal="$4"
            paddingVertical="$3"
            backgroundColor="white"
            borderRadius={14}
            borderWidth={1}
            borderColor="#eee"
          >
            <Text fontSize={15} fontWeight="600" color="#333" textAlign="center">
              {getUserName()}님! <Text color="#666" fontWeight="400">오늘도 신속하고 안전하게 협업하세요</Text>
            </Text>
          </View>

          {/* 시작 버튼 */}
          <Button
            size="$5"
            backgroundColor={brandColors.primary}
            color="white"
            fontWeight="700"
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

          {/* 하단 특징 */}
          <XStack justifyContent="space-around" alignItems="center" paddingTop="$2">
            <FeatureItem icon="⚡" text="실시간 매칭" />
            <FeatureItem icon="✓" text="검증된 전문가" />
            <FeatureItem icon="📍" text="위치 기반" />
          </XStack>
        </YStack>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <XStack alignItems="center" gap="$1.5">
      <Text fontSize={14}>{icon}</Text>
      <Text fontSize={12} color="#888">{text}</Text>
    </XStack>
  );
}
