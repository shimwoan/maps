/**
 * 센드온 SMS 발송 서비스
 * Supabase Edge Function을 통해 발송
 */

interface SendSmsParams {
  to: string; // 수신자 전화번호
  message: string; // 메시지 내용
}

interface SendSmsResponse {
  success: boolean;
  groupId?: string;
  error?: string;
}

/**
 * SMS 발송 함수 (Edge Function 호출)
 */
export async function sendSms({ to, message }: SendSmsParams): Promise<SendSmsResponse> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SMS] Supabase 설정이 없습니다.');
    return { success: false, error: 'Supabase 설정 오류' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ to, message }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('[SMS] 발송 성공:', data.groupId);
      return { success: true, groupId: data.groupId };
    } else {
      console.error('[SMS] 발송 실패:', data.error);
      return { success: false, error: data.error || '발송 실패' };
    }
  } catch (error) {
    console.error('[SMS] 발송 오류:', error);
    return { success: false, error: '네트워크 오류' };
  }
}

/**
 * 협업 알림 메시지 템플릿
 */
export const SmsTemplates = {
  // 1. 누군가 신청했을 때 (협업 작성자에게)
  newApplication: (applicantName: string, requestTitle: string) =>
    `[협업알림] ${applicantName}님이 "${requestTitle}" 협업에 신청했습니다. 확인해주세요.`,

  // 2. 신청이 수락되었을 때 (신청자에게)
  applicationAccepted: (requestTitle: string) =>
    `[협업알림] "${requestTitle}" 협업 신청이 수락되었습니다.`,

  // 3. 완료 요청이 들어왔을 때 (협업 작성자에게)
  completionRequested: (applicantName: string, requestTitle: string) =>
    `[협업알림] ${applicantName}님이 "${requestTitle}" 작업 완료를 요청했습니다. 확인해주세요.`,

  // 4. 작업이 완료되었을 때 (수행자에게)
  workCompleted: (requestTitle: string) =>
    `[협업알림] "${requestTitle}" 작업이 완료 처리되었습니다.`,
};
