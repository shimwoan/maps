import { View, Text, XStack } from 'tamagui';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

interface HeaderActionsProps {
  onNotificationPress: () => void;
  onLoginPress?: () => void;
}

export function HeaderActions({ onNotificationPress }: HeaderActionsProps) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  if (!user) {
    return null;
  }

  return (
    <XStack
      alignItems="center"
      gap="$1.5"
      cursor="pointer"
      onPress={onNotificationPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke="#333"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unreadCount > 0 && (
        <Text fontSize={14} fontWeight="600" color="#000">
          읽지않은 알림 {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      )}
    </XStack>
  );
}
