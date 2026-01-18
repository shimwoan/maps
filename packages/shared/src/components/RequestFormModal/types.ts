export type VisitType = '방문' | '원격';

export type AsType = '복합기/OA' | '전기/통신' | '가전/설비' | '인테리어' | '청소' | '소프트웨어' | '운반/설치';

// AS 종류 목록 (필터 및 폼에서 공통 사용)
export const AS_TYPES: AsType[] = ['복합기/OA', '전기/통신', '가전/설비', '인테리어', '청소', '소프트웨어', '운반/설치'];

export interface RequestFormData {
  visitType: VisitType;
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
  requiredPersonnel: number;
  description: string;
  isUrgent: boolean;
}

export interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (latitude: number | null, longitude: number | null, requestId: string | null) => void;
  defaultAddress?: string;
}
