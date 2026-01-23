import { useState, useEffect, useCallback } from 'react';

interface CityUser {
  city: string;
  users: number;
}

interface GA4Stats {
  activeUsers: number;
  newUsers: number;
  eventCount: number;
  avgEngagementTime: string;
  avgEngagementSeconds: number;
  cityUsers: CityUser[];
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const ADMIN_PASSWORD = '1127';
const REFRESH_INTERVAL = 30000; // 30초

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 오늘 날짜
export function getToday(): string {
  return formatDate(new Date());
}

// N일 전 날짜
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

export function useGA4Stats(dateRange?: DateRange) {
  const [stats, setStats] = useState<GA4Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startDate = dateRange?.startDate || 'today';
  const endDate = dateRange?.endDate || 'today';

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        setError('Supabase URL not configured');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/ga4-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': ADMIN_PASSWORD,
        },
        body: JSON.stringify({
          type: 'dashboard',
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error('GA4 데이터를 가져오는데 실패했습니다');
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GA4 데이터를 가져오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();

    // 30초마다 자동 갱신
    const interval = setInterval(fetchStats, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
}
