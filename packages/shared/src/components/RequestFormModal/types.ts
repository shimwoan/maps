export type VisitType = '방문' | '원격';

export type AsType = '복합기/OA' | '프린터' | '컴퓨터' | '파쇄기' | '기타';

export interface RequestFormData {
  visitType: VisitType;
  asType: AsType;
  title: string;
  address: string;
  addressDetail: string;
  latitude: number | null;
  longitude: number | null;
  expectedFee: number;
  duration: string;
  scheduleDate: string;
  scheduleTime: string;
  requiredPersonnel: number;
  description: string;
}

export interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultAddress?: string;
}
