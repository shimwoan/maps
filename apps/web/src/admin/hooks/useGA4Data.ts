import { useQuery } from '@tanstack/react-query';
import { supabase } from '@monorepo/shared/src/lib/supabase';
import { useAdminAuth } from '../contexts/AdminAuthContext';

interface GA4Data {
  dailyTraffic: Array<{
    date: string;
    users: number;
    sessions: number;
    pageViews: number;
  }>;
  todayUsers: number;
  todaySessions: number;
  todayPageViews: number;
}

export function useGA4Data() {
  const { password } = useAdminAuth();

  return useQuery<GA4Data>({
    queryKey: ['ga4-data'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ga4-analytics', {
        headers: {
          'x-admin-password': password || '',
        },
        body: {
          startDate: '30daysAgo',
          endDate: 'today',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // GA4 응답 데이터 변환
      const dailyTraffic = data.rows?.map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
        date: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value) || 0,
        sessions: parseInt(row.metricValues[1].value) || 0,
        pageViews: parseInt(row.metricValues[2].value) || 0,
      })) || [];

      // 날짜순 정렬
      dailyTraffic.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date));

      const todayData = dailyTraffic[dailyTraffic.length - 1] || {};

      return {
        dailyTraffic,
        todayUsers: todayData.users || 0,
        todaySessions: todayData.sessions || 0,
        todayPageViews: todayData.pageViews || 0,
      };
    },
    enabled: !!password,
    staleTime: 1000 * 60 * 5, // 5분
  });
}
