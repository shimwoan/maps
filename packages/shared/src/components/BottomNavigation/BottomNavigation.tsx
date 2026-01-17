import { useState, useEffect } from 'react';
import { View, Text, XStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

type PageMode = 'home' | 'requests' | 'profile';

interface BottomNavigationProps {
  activeMode: PageMode;
  onNavigate: (mode: PageMode) => void;
  onLoginRequired?: () => void;
  isLoggedIn: boolean;
}

// PC 디바이스 체크 (터치 미지원 + 모바일 UA 아님)
const checkIsPC = () => {
  if (typeof window === 'undefined') return false;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return !isTouchDevice && !mobileUA;
};

export function BottomNavigation({
  activeMode,
  onNavigate,
  onLoginRequired,
  isLoggedIn,
}: BottomNavigationProps) {
  const [isPC, setIsPC] = useState(false);

  useEffect(() => {
    setIsPC(checkIsPC());
  }, []);

  const handlePress = (mode: PageMode) => {
    if (mode !== 'home' && !isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    onNavigate(mode);
  };

  const activeColor = brandColors.primary;
  const inactiveColor = '#1a1a1a';
  const textColor = '#666';

  return (
    <View
      position={isPC ? 'absolute' : 'fixed'}
      bottom={0}
      left={0}
      right={0}
      backgroundColor="white"
      borderTopWidth={1}
      borderTopColor="#f0f0f0"
      zIndex={200}
      height={56}
      justifyContent="center"
      // @ts-ignore
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <XStack alignItems="center" justifyContent="space-around" paddingVertical={8}>
        {/* 홈 */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          paddingHorizontal={16}
          onPress={() => handlePress('home')}
        >
          {activeMode === 'home' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                fill={activeColor}
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                stroke={inactiveColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
          <Text
            fontSize={12}
            fontWeight={activeMode === 'home' ? "600" : "400"}
            color={activeMode === 'home' ? activeColor : textColor}
            marginTop={4}
          >
            홈
          </Text>
        </View>

        {/* 내 의뢰 */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          paddingHorizontal={16}
          onPress={() => handlePress('requests')}
        >
          {activeMode === 'requests' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                fill={activeColor}
              />
              <path
                d="M14 2v6h6"
                stroke={activeColor}
                strokeWidth="1.5"
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke={inactiveColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M14 2v6h6"
                stroke={inactiveColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <Text
            fontSize={12}
            fontWeight={activeMode === 'requests' ? "600" : "400"}
            color={activeMode === 'requests' ? activeColor : textColor}
            marginTop={4}
          >
            내 의뢰
          </Text>
        </View>

        {/* MY */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          paddingHorizontal={16}
          onPress={() => handlePress('profile')}
        >
          {activeMode === 'profile' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7" r="4" fill={activeColor} />
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                fill={activeColor}
              />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke={inactiveColor}
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke={inactiveColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <Text
            fontSize={12}
            fontWeight={activeMode === 'profile' ? "600" : "400"}
            color={activeMode === 'profile' ? activeColor : textColor}
            marginTop={4}
          >
            MY
          </Text>
        </View>
      </XStack>
    </View>
  );
}
