import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password',
};

// Google OAuth2 토큰 발급
async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const key = JSON.parse(serviceAccountKey);

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // JWT 생성
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // RSA 서명
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(key.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signatureB64}`;

  // 토큰 교환
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// PEM to ArrayBuffer 변환
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 관리자 비밀번호 검증
    const adminPassword = req.headers.get('x-admin-password');
    const expectedPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminPassword || adminPassword !== expectedPassword) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const serviceAccountKey = Deno.env.get('GA4_SERVICE_ACCOUNT_KEY');
    const propertyId = Deno.env.get('GA4_PROPERTY_ID');

    if (!serviceAccountKey || !propertyId) {
      return new Response(
        JSON.stringify({ error: 'GA4 not configured', rows: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { startDate = '30daysAgo', endDate = 'today', type = 'report' } = body;

    // Access Token 발급
    const accessToken = await getAccessToken(serviceAccountKey);

    // 실시간 데이터 요청
    if (type === 'realtime') {
      const realtimeResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dimensions: [{ name: 'country' }],
            metrics: [{ name: 'activeUsers' }],
          }),
        }
      );

      const realtimeData = await realtimeResponse.json();

      // 분당 활성 사용자 (minutesAgo dimension)
      const minuteResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dimensions: [{ name: 'minutesAgo' }],
            metrics: [{ name: 'activeUsers' }],
            minuteRanges: [{ startMinutesAgo: 29, endMinutesAgo: 0 }],
          }),
        }
      );

      const minuteData = await minuteResponse.json();

      return new Response(
        JSON.stringify({ realtime: realtimeData, perMinute: minuteData }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 대시보드 통계 (오늘 기준)
    if (type === 'dashboard') {
      // 실시간 활성 사용자
      const realtimeResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            metrics: [{ name: 'activeUsers' }],
          }),
        }
      );
      const realtimeData = await realtimeResponse.json();

      // 도시별 실시간 사용자
      const cityResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dimensions: [{ name: 'city' }],
            metrics: [{ name: 'activeUsers' }],
          }),
        }
      );
      const cityData = await cityResponse.json();

      // 기간별 통계 (새 사용자, 이벤트 수, 참여 시간)
      const periodResponse = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'newUsers' },
              { name: 'eventCount' },
              { name: 'userEngagementDuration' },
              { name: 'activeUsers' },
            ],
          }),
        }
      );
      const periodData = await periodResponse.json();

      // 데이터 파싱
      const activeUsers = realtimeData.rows?.[0]?.metricValues?.[0]?.value || '0';

      // 도시별 사용자 파싱
      const cityUsers = (cityData.rows || []).map((row: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
        city: row.dimensionValues[0].value,
        users: parseInt(row.metricValues[0].value, 10),
      }));

      const periodRow = periodData.rows?.[0]?.metricValues || [];
      const newUsers = periodRow[0]?.value || '0';
      const eventCount = periodRow[1]?.value || '0';
      const engagementDuration = parseFloat(periodRow[2]?.value || '0');
      const periodActiveUsers = parseInt(periodRow[3]?.value || '1', 10) || 1;

      // 평균 참여 시간 계산 (초 단위)
      const avgEngagementSeconds = Math.round(engagementDuration / periodActiveUsers);
      const minutes = Math.floor(avgEngagementSeconds / 60);
      const seconds = avgEngagementSeconds % 60;
      const avgEngagementTime = `${minutes}분 ${seconds}초`;

      return new Response(
        JSON.stringify({
          activeUsers: parseInt(activeUsers, 10),
          newUsers: parseInt(newUsers, 10),
          eventCount: parseInt(eventCount, 10),
          avgEngagementTime,
          avgEngagementSeconds,
          cityUsers,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // GA4 Data API 호출 (일반 리포트)
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'newUsers' },
            { name: 'eventCount' },
          ],
        }),
      }
    );

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('GA4 analytics error:', error);
    return new Response(
      JSON.stringify({ error: error.message, rows: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
