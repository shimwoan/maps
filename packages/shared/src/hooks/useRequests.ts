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
  expected_fee: number;
  duration: string;
  schedule_date: string;
  schedule_time: string;
  required_personnel: number;
  description: string | null;
  status: string;
  created_at: string;
}

export function useRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'pending')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;
      setRequests(data || []);
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
            // pending 상태이고 위치값이 있는 경우에만 추가
            if (newRequest.status === 'pending' && newRequest.latitude && newRequest.longitude) {
              setRequests(prev => [...prev, newRequest]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedRequest = payload.new as Request;
            setRequests(prev => {
              // pending이 아니거나 위치값이 없으면 목록에서 제거
              if (updatedRequest.status !== 'pending' || !updatedRequest.latitude || !updatedRequest.longitude) {
                return prev.filter(r => r.id !== updatedRequest.id);
              }
              // 기존 목록에 있으면 업데이트, 없으면 추가
              const exists = prev.some(r => r.id === updatedRequest.id);
              if (exists) {
                return prev.map(r => r.id === updatedRequest.id ? updatedRequest : r);
              }
              return [...prev, updatedRequest];
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
