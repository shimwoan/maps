import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: 'application_received' | 'application_accepted' | 'request_completed';
  title: string;
  message: string;
  request_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  createNotification: (
    targetUserId: string,
    type: Notification['type'],
    title: string,
    message: string,
    requestId?: string
  ) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const PAGE_SIZE = 20;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // 읽지 않은 알림 수 조회
      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setUnreadCount(unread || 0);

      // 첫 페이지 조회
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      setNotifications(data || []);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 더 보기
  const loadMore = useCallback(async () => {
    if (!user || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const lastNotification = notifications[notifications.length - 1];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', lastNotification.created_at)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      setNotifications(prev => [...prev, ...(data || [])]);
      setHasMore((data?.length || 0) >= PAGE_SIZE);
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, notifications, isLoadingMore, hasMore]);

  // 알림 생성 (다른 사용자에게)
  const createNotification = useCallback(async (
    targetUserId: string,
    type: Notification['type'],
    title: string,
    message: string,
    requestId?: string
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type,
          title,
          message,
          request_id: requestId || null,
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }, []);

  // 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    // 이미 읽은 알림인지 먼저 확인
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;

    // 낙관적 업데이트 (UI 먼저 반영)
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // 실패 시 롤백
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    }
  }, [notifications]);

  // 모든 알림 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    // 낙관적 업데이트
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      // 실패 시 리페치
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Realtime 구독을 위한 ref
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 초기 로드 및 Realtime 구독
  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // 기존 채널이 있으면 제거
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Realtime 구독 설정
    channelRef.current = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 새 알림 추가
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            // 알림 업데이트 (읽음 처리 등)
            const updatedNotification = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            // 읽음 처리된 경우 카운트 업데이트
            const oldNotification = payload.old as { is_read?: boolean };
            if (!oldNotification.is_read && updatedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            // 알림 삭제
            const deletedId = (payload.old as { id: string }).id;
            const deletedNotification = notifications.find(n => n.id === deletedId);
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
            if (deletedNotification && !deletedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        createNotification,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
