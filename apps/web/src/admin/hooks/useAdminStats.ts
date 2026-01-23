import { useState, useEffect } from 'react';
import { supabase } from '@monorepo/shared';

interface AdminStats {
  totalProfiles: number;
  totalRequests: number;
  totalApplications: number;
  pendingRequests: number;
  acceptedRequests: number;
  completedRequests: number;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalProfiles: 0,
    totalRequests: 0,
    totalApplications: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);
        setError(null);

        // 프로필 수
        const { count: profilesCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // 의뢰 수 및 상태별 카운트
        const { data: requestsData, count: requestsCount } = await supabase
          .from('requests')
          .select('status', { count: 'exact' });

        // 신청 수
        const { count: applicationsCount } = await supabase
          .from('request_applications')
          .select('*', { count: 'exact', head: true });

        // 상태별 의뢰 카운트
        const requests = requestsData || [];
        const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'applied').length;
        const acceptedRequests = requests.filter(r => r.status === 'accepted').length;
        const completedRequests = requests.filter(r => r.status === 'completed').length;

        setStats({
          totalProfiles: profilesCount || 0,
          totalRequests: requestsCount || 0,
          totalApplications: applicationsCount || 0,
          pendingRequests,
          acceptedRequests,
          completedRequests,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '통계 데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { stats, isLoading, error };
}
