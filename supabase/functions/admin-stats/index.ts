import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 관리자 비밀번호 검증
    const adminPassword = req.headers.get('x-admin-password');
    const expectedPassword = Deno.env.get('ADMIN_PASSWORD');

    // 디버그 로그
    console.log('Received password:', adminPassword);
    console.log('Expected password:', expectedPassword);
    console.log('Match:', adminPassword === expectedPassword);

    if (!adminPassword || adminPassword !== expectedPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', debug: { received: adminPassword, expected: expectedPassword ? '[SET]' : '[NOT SET]' } }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Supabase 클라이언트 (service role key 사용)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 병렬로 데이터 조회
    const [
      usersResult,
      requestsResult,
      recentRequestsResult,
      statusStatsResult,
      dailyStatsResult,
    ] = await Promise.all([
      // 총 사용자 수
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      // 총 의뢰 수
      supabase.from('requests').select('*', { count: 'exact', head: true }),
      // 최근 의뢰 10개
      supabase
        .from('requests')
        .select('id, title, status, created_at, as_type')
        .order('created_at', { ascending: false })
        .limit(10),
      // 상태별 의뢰 수 (RPC 대신 직접 쿼리)
      supabase.from('requests').select('status'),
      // 최근 30일 의뢰 (일별 집계용)
      supabase
        .from('requests')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // 상태별 집계
    const statusCounts: Record<string, number> = {};
    statusStatsResult.data?.forEach((item: { status: string }) => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });
    const requestsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // 일별 집계
    const dailyCounts: Record<string, number> = {};
    dailyStatsResult.data?.forEach((item: { created_at: string }) => {
      const date = item.created_at.split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });
    const dailyStats = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return new Response(
      JSON.stringify({
        totalUsers: usersResult.count || 0,
        totalRequests: requestsResult.count || 0,
        recentRequests: recentRequestsResult.data || [],
        requestsByStatus,
        dailyStats,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Admin stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
