/**
 * 센드온 SMS 발송 서비스
 * https://sdk.sendon.io
 */

const SENDON_API_URL = 'https://api.sendon.io/v2/messages/sms';

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
 * SMS 발송 함수
 */
export async function sendSms({ to, message }: SendSmsParams): Promise<SendSmsResponse> {
  const apiKey = import.meta.env.VITE_SENDON_API_KEY;
  const fromNumber = import.meta.env.VITE_SENDON_FROM_NUMBER;

  if (!apiKey || !fromNumber) {
    console.error('[Sendon] API 키 또는 발신번호가 설정되지 않았습니다.');
    return { success: false, error: 'API 설정 오류' };
  }

  // 전화번호 형식 정리 (하이픈 제거)
  const cleanPhone = to.replace(/-/g, '');

  try {
    const response = await fetch(SENDON_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        type: 'SMS',
        from: fromNumber,
        to: [cleanPhone],
        message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.code === 200) {
      console.log('[Sendon] SMS 발송 성공:', data.data?.groupId);
      return { success: true, groupId: data.data?.groupId };
    } else {
      console.error('[Sendon] SMS 발송 실패:', data);
      return { success: false, error: data.message || '발송 실패' };
    }
  } catch (error) {
    console.error('[Sendon] SMS 발송 오류:', error);
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
