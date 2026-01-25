// 관리자 접근이 허용된 닉네임 목록
export const ALLOWED_ADMIN_NICKNAMES = ['신동환', '재무'];

// 관리자 닉네임인지 확인하는 헬퍼 함수
export function isAdminNickname(nickname: string | null | undefined): boolean {
  if (!nickname) return false;
  return ALLOWED_ADMIN_NICKNAMES.includes(nickname);
}
