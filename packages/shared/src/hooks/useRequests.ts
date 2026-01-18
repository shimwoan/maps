import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Request {
  id: string;
  user_id: string;
  visit_type: string;
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
  required_personnel: number;
  description: string | null;
  status: string;
  is_urgent: boolean;
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
      // 활성 상태 의뢰 조회
      const { data: activeData, error: activeError } = await supabase
        .from('requests')
        .select('*')
        .in('status', ['pending', 'applied', 'accepted'])
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (activeError) throw activeError;

      // 완료된 의뢰 중 24시간 이내 것만 조회
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: completedData, error: completedError } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'completed')
        .gte('updated_at', oneDayAgo)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

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

    // Supabase Realtime 구독
    channelRef.current = supabase
      .channel('requests-realtime')
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
            // pending, applied, accepted 상태이고 위치값이 있는 경우에만 추가
            if (['pending', 'applied', 'accepted'].includes(newRequest.status) && newRequest.latitude && newRequest.longitude) {
              setRequests(prev => [...prev, newRequest]);
            }
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

              // 새로운 요청이고 위치값이 있으면 추가
              if (updatedRequest.latitude && updatedRequest.longitude) {
                return [...prev, updatedRequest];
              }

              return prev;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedRequest = payload.old as Request;
            setRequests(prev => prev.filter(r => r.id !== deletedRequest.id));
          }
        }
      )
      .subscribe();

    // 클린업
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchRequests]);

  return { requests, isLoading, error, refetch: fetchRequests };
}
