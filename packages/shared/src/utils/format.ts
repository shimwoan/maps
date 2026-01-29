import { brandColors } from '@monorepo/ui/src/tamagui.config';

/**
 * 가격을 숫자 형식으로 포맷팅 (예: 500000 → "500,000")
 */
export function formatPrice(price: number): string {
  return price.toLocaleString();
}

/**
 * 날짜를 한국어 형식으로 포맷팅 (예: "2026. 4. 20", 오늘이면 "오늘")
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return '오늘';
  }
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

/**
 * 완료 날짜/시간을 한국어 형식으로 포맷팅 (예: "1월 15일 14:30")
 */
export function formatCompletedDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}월 ${day}일 ${hours}:${minutes}`;
}

/**
 * 상대 시간 포맷 (예: "5분 전", "2시간 전", "3일 전")
 */
export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const created = new Date(dateStr);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '방금';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else {
    return `${diffDays}일 전`;
  }
}

/**
 * 의뢰 상태에 따른 라벨과 색상 정보 반환
 */
export function getStatusLabel(status: string): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'pending':
      return { label: '대기중', color: '#3B82F6', bgColor: '#EFF6FF' };
    case 'applied':
      return { label: '대기중', color: '#3B82F6', bgColor: '#EFF6FF' };
    case 'accepted':
      return { label: '매칭완료', color: '#F59E0B', bgColor: '#F59E0B' };
    case 'rejected':
      return { label: '다른작업자와 매칭완료', color: '#9CA3AF', bgColor: '#9CA3AF' };
    case 'completed':
      return { label: '완료', color: '#9CA3AF', bgColor: '#9CA3AF' };
    default:
      return { label: status, color: '#333', bgColor: '#f0f0f0' };
  }
}
