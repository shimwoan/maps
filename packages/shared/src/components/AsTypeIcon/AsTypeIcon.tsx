import type { AsType } from '../RequestFormModal/types';

interface AsTypeIconProps {
  type: AsType | string;
  size?: number;
}

export function AsTypeIcon({ type, size = 14 }: AsTypeIconProps) {
  switch (type) {
    case '복합기/OA':
      return (
        <img src="/print.png" alt="복합기/OA" width={size} height={size} style={{ objectFit: 'contain' }} />
      );
    case 'PC':
      return (
        <img src="/pc.png" alt="PC" width={size * 1.3} height={size * 1.3} style={{ objectFit: 'contain' }} />
      );
    case '전기/통신':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1"/>
        </svg>
      );
    case '가전/설비':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#F97316" stroke="#EA580C" strokeWidth="1"/>
        </svg>
      );
    case '인테리어':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#14B8A6" stroke="#0D9488" strokeWidth="1"/>
        </svg>
      );
    case '청소':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2v5" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 7l5 15H7l5-15z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1"/>
        </svg>
      );
    case '소프트웨어':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" fill="#4B5563" stroke="#374151" strokeWidth="1"/>
          <rect x="4" y="5" width="16" height="10" fill="#60A5FA"/>
        </svg>
      );
    case '운반/설치':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M1 3h15v13H1z" fill="#FB923C" stroke="#EA580C" strokeWidth="1"/>
          <path d="M16 8h4l3 3v5h-7V8z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1"/>
        </svg>
      );
    default:
      return (
        <img src="/print.png" alt="기타" width={size} height={size} style={{ objectFit: 'contain' }} />
      );
  }
}
