import { View, Text, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface HeaderActionsProps {
  onNotificationPress: () => void;
  onLoginPress: () => void;
}

export function HeaderActions({ onNotificationPress, onLoginPress }: HeaderActionsProps) {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) {
    return (
      <Text
        fontSize={14}
        fontWeight="600"
        color="#000"
        cursor="pointer"
        style={{ userSelect: 'none' }}
        onPress={onLoginPress}
      >
        로그인
      </Text>
    );
  }

  return (
    <XStack gap="$2" alignItems="center">
      {/* 알림 아이콘 */}
      <View
        width={36}
        height={36}
        borderRadius={18}
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        position="relative"
        onPress={onNotificationPress}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <View
            position="absolute"
            top={2}
            right={2}
            minWidth={16}
            height={16}
            borderRadius={8}
            backgroundColor="#FF4444"
            alignItems="center"
            justifyContent="center"
            paddingHorizontal={4}
          >
            <Text fontSize={10} fontWeight="700" color="white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
      {/* 로그아웃 텍스트 */}
      <Text
        fontSize={14}
        fontWeight="600"
        color="#666"
        cursor="pointer"
        style={{ userSelect: 'none' }}
        onPress={() => signOut()}
      >
        로그아웃
      </Text>
    </XStack>
  );
}
