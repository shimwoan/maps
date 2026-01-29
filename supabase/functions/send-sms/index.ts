import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmsRequest {
  to: string;
  message: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, message }: SmsRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: '수신번호와 메시지가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('SENDON_API_KEY');
    const userId = Deno.env.get('SENDON_USER_ID');
    const fromNumber = Deno.env.get('SENDON_FROM_NUMBER');

    if (!apiKey || !userId || !fromNumber) {
      console.error('[Sendon] 환경 변수 미설정:', { apiKey: !!apiKey, userId: !!userId, fromNumber: !!fromNumber });
      return new Response(
        JSON.stringify({ success: false, error: 'SMS 설정 오류' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const cleanPhone = to.replace(/-/g, '');

    // 센드온 API 호출
    const response = await fetch('https://api.sendon.io/v2/messages/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        type: 'SMS',
        from: fromNumber,
        to: [cleanPhone],
        message,
      }),
    });

    const data = await response.json();
    console.log('[Sendon] API 응답:', data);

    if (response.ok && data.code === 200) {
      return new Response(
        JSON.stringify({ success: true, groupId: data.data?.groupId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('[Sendon] SMS 발송 실패:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.message || '발송 실패' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[Sendon] 오류:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
