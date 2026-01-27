import { useState, useEffect } from 'react';
import { View, Text, YStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface FloatingActionButtonProps {
  onPress: () => void;
}

// PC 디바이스 체크 (터치 미지원 + 모바일 UA 아님)
const checkIsPC = () => {
  if (typeof window === 'undefined') return false;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return !isTouchDevice && !mobileUA;
};

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  const [isPC, setIsPC] = useState(false);

  useEffect(() => {
    setIsPC(checkIsPC());
  }, []);

  return (
    <View
      position={isPC ? 'absolute' : 'fixed'}
      right={16}
      zIndex={200}
      // @ts-ignore - safe area for mobile browsers
      style={{
        bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))',
      }}
      width={64}
      height={64}
      borderRadius={32}
      backgroundColor={brandColors.primary}
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onPress={onPress}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.25}
      shadowRadius={8}
      hoverStyle={{
        backgroundColor: brandColors.primaryHover,
      }}
      pressStyle={{
        backgroundColor: brandColors.primaryPressed,
        scale: 0.95,
      }}
    >
      <YStack alignItems="center" marginBottom={6}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5v14"/>
        </svg>
        <Text color="#fff" fontSize={13} fontWeight="500">
          요청하기
        </Text>
      </YStack>
    </View>
  );
}
