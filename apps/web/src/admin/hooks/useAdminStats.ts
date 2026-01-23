import { useQuery } from '@tanstack/react-query';
import { supabase } from '@monorepo/shared/src/lib/supabase';
import { useAdminAuth } from '../contexts/AdminAuthContext';

interface AdminStats {
  totalUsers: number;
  totalRequests: number;
  requestsByStatus: { status: string; count: number }[];
  dailyStats: { date: string; count: number }[];
  recentRequests: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    as_type: string;
  }>;
}

export function useAdminStats() {
  const { password } = useAdminAuth();

  return useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('admin-stats', {
        headers: {
          'x-admin-password': password || '',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!password,
    staleTime: 1000 * 60 * 5, // 5분
    refetchInterval: 1000 * 60 * 5, // 5분마다 자동 새로고침
  });
}
