import { useState } from 'react';
import { View, Text, YStack, XStack, ScrollView, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useNotifications, type Notification } from '../../hooks/useNotifications';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: 'myRequests' | 'myApplications') => void;
}

// 시간 포맷팅
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 알림 타입별 아이콘
function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'application_received':
      return (
        <View
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="#E0E7FF"
          alignItems="center"
          justifyContent="center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#6B7CFF" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="#6B7CFF" strokeWidth="2"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="#6B7CFF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </View>
      );
    case 'application_accepted':
      return (
        <View
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="#D1FAE5"
          alignItems="center"
          justifyContent="center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </View>
      );
    case 'request_completed':
      return (
        <View
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="#FEF3C7"
          alignItems="center"
          justifyContent="center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </View>
      );
  }
}

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (notification: Notification) => void;
}) {
  return (
    <XStack
      backgroundColor={notification.is_read ? 'white' : '#F8FAFF'}
      padding="$3"
      gap="$3"
      borderBottomWidth={1}
      borderBottomColor="#eee"
      cursor="pointer"
      hoverStyle={{ backgroundColor: '#f5f5f5' }}
      onPress={() => onClick(notification)}
    >
      <NotificationIcon type={notification.type} />
      <YStack flex={1} gap="$1">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={14} fontWeight="600" color="#000">
            {notification.title}
          </Text>
          {!notification.is_read && (
            <View
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor={brandColors.primary}
            />
          )}
        </XStack>
        <Text fontSize={13} color="#666" numberOfLines={2}>
          {notification.message}
        </Text>
        <Text fontSize={11} color="#999">
          {formatTime(notification.created_at)}
        </Text>
      </YStack>
    </XStack>
  );
}

const INITIAL_DISPLAY_COUNT = 3;

export function NotificationModal({ isOpen, onClose, onNavigate }: NotificationModalProps) {
  const { notifications, isLoading, isLoadingMore, hasMore, loadMore, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  // 표시할 알림: 펼치기 전에는 3개만, 펼친 후에는 전체
  const displayedNotifications = isExpanded ? notifications : notifications.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreToShow = !isExpanded && notifications.length > INITIAL_DISPLAY_COUNT;

  // 모달 닫힐 때 펼침 상태 초기화
  const handleClose = () => {
    setIsExpanded(false);
    onClose();
  };

  const handleNotificationClick = (notification: Notification) => {
    // 읽음 처리
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // 알림 타입에 따라 해당 탭으로 이동
    if (onNavigate) {
      if (notification.type === 'application_received') {
        // 의뢰자가 받은 알림 -> 내 의뢰 탭
        onNavigate('myRequests');
      } else {
        // 수행자가 받은 알림 -> 신청한 의뢰 탭
        onNavigate('myApplications');
      }
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="transparent"
      zIndex={500}
      onPress={handleClose}
    >
      <View
        position="absolute"
        top={50}
        right={16}
        width={340}
        maxWidth="90%"
        maxHeight="70%"
        backgroundColor="white"
        borderRadius={12}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.15}
        shadowRadius={12}
        overflow="hidden"
        onPress={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <XStack
          padding="$3"
          borderBottomWidth={1}
          borderBottomColor="#eee"
          alignItems="center"
          justifyContent="space-between"
        >
          <XStack alignItems="center" gap="$2">
            <Text fontSize={16} fontWeight="700" color="#000">
              알림
            </Text>
            {notifications.length > 0 && (
              <Text fontSize={12} color="#999">
                ({notifications.length}개)
              </Text>
            )}
          </XStack>
          {unreadCount > 0 && (
            <Button
              size="$2"
              backgroundColor="transparent"
              color={brandColors.primary}
              onPress={markAllAsRead}
            >
              모두 읽음
            </Button>
          )}
        </XStack>

        {/* 알림 목록 */}
        <ScrollView maxHeight={500}>
          {isLoading ? (
            <View padding="$6" alignItems="center">
              <Spinner size="large" color={brandColors.primary} />
            </View>
          ) : notifications.length === 0 ? (
            <View padding="$6" alignItems="center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Text fontSize={14} color="#999" marginTop="$2">
                알림이 없습니다
              </Text>
            </View>
          ) : (
            <YStack>
              {displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}
              {/* 더 보기 버튼 - 로컬에서 더 보여줄 것이 있을 때 */}
              {hasMoreToShow && (
                <View padding="$3" alignItems="center">
                  <Button
                    size="$3"
                    backgroundColor="#f5f5f5"
                    color="#666"
                    width="100%"
                    onPress={() => setIsExpanded(true)}
                  >
                    {notifications.length - INITIAL_DISPLAY_COUNT}개 더 보기
                  </Button>
                </View>
              )}
              {/* 서버에서 더 불러오기 버튼 - 펼친 상태에서만 */}
              {isExpanded && hasMore && (
                <View padding="$3" alignItems="center">
                  <Button
                    size="$3"
                    backgroundColor="#f5f5f5"
                    color="#666"
                    width="100%"
                    onPress={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <XStack gap="$2" alignItems="center">
                        <Spinner size="small" color="#666" />
                        <Text color="#666">로딩 중...</Text>
                      </XStack>
                    ) : (
                      '이전 알림 더 보기'
                    )}
                  </Button>
                </View>
              )}
            </YStack>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
