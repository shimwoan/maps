import { useState, useEffect } from 'react';
import { View, Text } from 'tamagui';
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
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
      }}
      paddingHorizontal={20}
      height={48}
      borderRadius={24}
      backgroundColor={brandColors.primary}
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      gap={8}
      cursor="pointer"
      onPress={onPress}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.3}
      shadowRadius={8}
      hoverStyle={{
        backgroundColor: brandColors.primaryHover,
      }}
      pressStyle={{
        backgroundColor: brandColors.primaryPressed,
        scale: 0.95,
      }}
    >
      <Text color="#fff" fontSize={15} fontWeight="600">
        외주 요청하기
      </Text>
    </View>
  );
}
