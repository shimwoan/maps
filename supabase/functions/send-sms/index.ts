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

    const userId = Deno.env.get('SENDON_USER_ID');
    const apiKey = Deno.env.get('SENDON_API_KEY');
    const fromNumber = Deno.env.get('SENDON_FROM_NUMBER');

    if (!userId || !apiKey || !fromNumber) {
      console.error('[Sendon] 환경 변수 미설정:', { userId: !!userId, apiKey: !!apiKey, fromNumber: !!fromNumber });
      return new Response(
        JSON.stringify({ success: false, error: 'SMS 설정 오류' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 전화번호 형식 정리 (하이픈 제거)
    const cleanPhone = to.replace(/-/g, '');

    // 센드온 SDK 동적 import
    const sendonModule = await import('npm:@alipeople/sendon-sdk-typescript');
    const Sendon = sendonModule.Sendon || sendonModule.default?.Sendon || sendonModule.default;

    console.log('[Sendon] SDK 모듈:', Object.keys(sendonModule));

    // 센드온 SDK 초기화
    let sendon;
    if (typeof Sendon?.getInstance === 'function') {
      sendon = Sendon.getInstance(userId, apiKey);
    } else if (typeof Sendon === 'function') {
      sendon = new Sendon(userId, apiKey);
    } else {
      throw new Error('Sendon SDK를 초기화할 수 없습니다: ' + JSON.stringify(Object.keys(sendonModule)));
    }

    // SMS 발송
    const result = await sendon.sms.send({
      type: 'SMS',
      from: fromNumber,
      to: [cleanPhone],
      message,
    });

    console.log('[Sendon] SMS 발송 결과:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Sendon] 오류:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
