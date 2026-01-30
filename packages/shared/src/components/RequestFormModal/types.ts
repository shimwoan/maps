export type CollaborationType = '방문AS' | '설치이관' | '인력지원' | '원격' | '납품';

export type AsType = '복합기/OA' | 'PC' | '전기/통신' | '가전/설비' | '인테리어' | '청소' | '소프트웨어' | '운반/설치';

// 협업 카테고리 목록
export const COLLABORATION_TYPES: CollaborationType[] = ['방문AS', '설치이관', '인력지원', '원격', '납품'];

// AS 종류 목록 (필터 및 폼에서 공통 사용)
export const AS_TYPES: AsType[] = ['복합기/OA', 'PC', '전기/통신', '가전/설비', '인테리어', '청소', '소프트웨어', '운반/설치'];

export interface RequestFormData {
  collaborationType: CollaborationType;
  asType: AsType;
  title: string;
  address: string;
  addressDetail: string;
  latitude: number | null;
  longitude: number | null;
  model: string;
  symptom: string;
  symptomImages: string[];
  expectedFee: number;
  duration: string;
  scheduleDate: string;
  scheduleTime: string;
  isTimeNegotiable: boolean;
  requiredPersonnel: number;
  description: string;
  isUrgent: boolean;
  needsInvoice: boolean;
}

export interface EditRequest {
  id: string;
  collaboration_type: string;
  as_type: string;
  title: string;
  address: string;
  address_detail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  model?: string | null;
  symptom?: string | null;
  symptom_images?: string[] | null;
  expected_fee: number;
  duration: string;
  schedule_date: string;
  schedule_time: string;
  is_time_negotiable?: boolean;
  required_personnel: number;
  description?: string | null;
  is_urgent?: boolean;
  needs_invoice?: boolean;
}

export interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (latitude: number | null, longitude: number | null, requestId: string | null) => void;
  defaultAddress?: string;
  editRequest?: EditRequest | null;
}
