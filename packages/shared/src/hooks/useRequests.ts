import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Request {
  id: string;
  user_id: string;
  collaboration_type: string;
  as_type: string;
  title: string;
  address: string;
  address_detail: string | null;
  latitude: number | null;
  longitude: number | null;
  model: string | null;
  symptom: string | null;
  symptom_images: string[] | null;
  expected_fee: number;
  duration: string;
  schedule_date: string;
  schedule_time: string;
  is_time_negotiable: boolean;
  time_negotiable_text: string | null;
  required_personnel: number;
  description: string | null;
  status: string;
  is_urgent: boolean;
  needs_invoice: boolean;
  created_at: string;
  updated_at?: string;
}

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      // 활성 상태 의뢰 조회 (위치 정보 없는 의뢰도 포함)
      const { data: activeData, error: activeError } = await supabase
        .from('requests')
        .select('*')
        .in('status', ['pending', 'applied', 'accepted']);

      if (activeError) throw activeError;

      // 완료된 의뢰 중 24시간 이내 것만 조회
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: completedData, error: completedError } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'completed')
        .gte('updated_at', oneDayAgo);

      if (completedError) throw completedError;

      setRequests([...(activeData || []), ...(completedData || [])]);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 초기 데이터 로드
    fetchRequests();

    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupSubscription = () => {
      // 기존 채널이 있으면 제거
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 고유한 채널 이름 생성 (타임스탬프 포함)
      const channelName = `requests-realtime-${Date.now()}`;

      // Supabase Realtime 구독
      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requests',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newRequest = payload.new as Request;
              setRequests(prev => [...prev, newRequest]);
            } else if (payload.eventType === 'UPDATE') {
              const updatedRequest = payload.new as Request;
              setRequests(prev => {
                const existingRequest = prev.find(r => r.id === updatedRequest.id);
                const validStatuses = ['pending', 'applied', 'accepted', 'completed'];

                // 유효하지 않은 상태면 제거
                if (!validStatuses.includes(updatedRequest.status)) {
                  return prev.filter(r => r.id !== updatedRequest.id);
                }

                // 기존 목록에 있으면 업데이트
                if (existingRequest) {
                  return prev.map(r => r.id === updatedRequest.id ? {
                    ...existingRequest,
                    ...updatedRequest,
                    latitude: updatedRequest.latitude ?? existingRequest.latitude,
                    longitude: updatedRequest.longitude ?? existingRequest.longitude,
                  } : r);
                }

                // 새로운 요청이면 추가 (위치 정보 유무와 관계없이)
                return [...prev, updatedRequest];
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedRequest = payload.old as Request;
              setRequests(prev => prev.filter(r => r.id !== deletedRequest.id));
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
              retryTimeout = setTimeout(() => {
                setupSubscription();
              }, delay);
            } else {
              retryTimeout = setInterval(() => {
                fetchRequests();
              }, 30000);
            }
          }
        });
    };

    setupSubscription();

    // 백그라운드에서 포그라운드로 돌아올 때 Realtime 재연결
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useRequests] 화면 활성화 - Realtime 재연결');
        fetchRequests(); // 먼저 데이터 새로고침
        setupSubscription(); // Realtime 재구독
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 클린업
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        clearInterval(retryTimeout as unknown as number);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchRequests]);

  return { requests, isLoading, error, refetch: fetchRequests };
}
