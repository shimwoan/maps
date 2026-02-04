// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMS_PROXY_URL = 'https://crewcrew-sms.duckdns.org:3000/send-sms';

interface SmsRequest {
  to: string;
  message: string;
}

serve(async (req: Request) => {
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

    const fromNumber = Deno.env.get('SENDON_FROM_NUMBER');

    if (!fromNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS 설정 오류' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanPhone = to.replace(/-/g, '');

    const proxyResponse = await fetch(SMS_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromNumber,
        to: cleanPhone,
        message: message,
      })
    });

    const result = await proxyResponse.json();
    console.log('[Sendon] SMS 발송 결과:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: proxyResponse.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Sendon] 오류:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
