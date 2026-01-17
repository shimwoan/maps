import { View, Text, XStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

type PageMode = 'home' | 'requests' | 'profile';

interface BottomNavigationProps {
  activeMode: PageMode;
  onNavigate: (mode: PageMode) => void;
  onLoginRequired?: () => void;
  isLoggedIn: boolean;
}

export function BottomNavigation({
  activeMode,
  onNavigate,
  onLoginRequired,
  isLoggedIn,
}: BottomNavigationProps) {
  const handlePress = (mode: PageMode) => {
    if (mode !== 'home' && !isLoggedIn) {
      onLoginRequired?.();
      return;
    }
    onNavigate(mode);
  };

  return (
    <View
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      backgroundColor="white"
      borderTopWidth={1}
      borderTopColor="#e5e5e5"
      zIndex={200}
      height={60}
      justifyContent="center"
      // @ts-ignore
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <XStack alignItems="center" justifyContent="space-around">
        {/* 홈 */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={() => handlePress('home')}
        >
          {activeMode === 'home' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                fill="#000"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                stroke="#999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
          <Text
            fontSize={14}
            fontWeight="600"
            color={activeMode === 'home' ? '#000' : '#999'}
            marginTop="$1.5"
          >
            홈
          </Text>
        </View>

        {/* 내 의뢰 */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={() => handlePress('requests')}
        >
          {activeMode === 'requests' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                fill="#000"
              />
              <path
                d="M14 2v6h6"
                stroke="#000"
                strokeWidth="1.5"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="#999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M14 2v6h6"
                stroke="#999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <Text
            fontSize={14}
            fontWeight="600"
            color={activeMode === 'requests' ? '#000' : '#999'}
            marginTop="$1.5"
          >
            내 의뢰
          </Text>
        </View>

        {/* MY */}
        <View
          alignItems="center"
          justifyContent="center"
          cursor="pointer"
          onPress={() => handlePress('profile')}
        >
          {activeMode === 'profile' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="7" r="4" fill="#000" />
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                fill="#000"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke="#999"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="#999"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <Text
            fontSize={14}
            fontWeight="600"
            color={activeMode === 'profile' ? '#000' : '#999'}
            marginTop="$1.5"
          >
            MY
          </Text>
        </View>
      </XStack>
    </View>
  );
}
