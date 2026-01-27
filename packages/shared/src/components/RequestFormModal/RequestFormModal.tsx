import { useForm, Controller } from 'react-hook-form';
import { Sheet, YStack, XStack, Text, Input, View, TextArea, ScrollView, Dialog } from 'tamagui';
import { Button } from '../Button';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import type { Profile } from '../../hooks/useProfile';
import { ProfileSetupModal } from '../ProfileSetupModal';
import { AddressSearch } from '../AddressSearch';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { RequestFormData, RequestFormModalProps, VisitType, AsType, EditRequest } from './types';
import { AS_TYPES } from './types';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { TimePicker } from '../TimePicker';

// 성공 팝업 컴포넌트
function SuccessDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog modal open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'quick',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          backgroundColor="white"
          borderRadius={16}
          padding="$5"
          width={320}
        >
          <YStack alignItems="center" gap="$4">
            {/* 체크 아이콘 */}
            <View
              width={64}
              height={64}
              borderRadius={32}
              backgroundColor="#E8F5E9"
              alignItems="center"
              justifyContent="center"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#4CAF50"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </View>

            {/* 제목 */}
            <Text fontSize={20} fontWeight="700" color="#000" textAlign="center">
              등록 완료
            </Text>

            {/* 안내 문구 */}
            <YStack gap="$2" alignItems="center">
              <Text fontSize={16} color="#000" textAlign="center" lineHeight={22}>
                협업요청이 성공적으로 등록되었습니다.
              </Text>
              <Text fontSize={16} color="#000" textAlign="center" lineHeight={22}>
                전문가가 협업을 수락하면{'\n'}
                <Text color={brandColors.primary} fontWeight="600">등록된 연락처로 문자를 발송해 드립니다.</Text>
              </Text>
            </YStack>

            {/* 확인 버튼 */}
            <Button
              size="$4"
              backgroundColor={brandColors.primary}
              color="white"
              fontWeight="600"
              width="100%"
              onPress={onClose}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              pressStyle={{ scale: 0.98 }}
            >
              확인
            </Button>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}

const VISIT_TYPES: VisitType[] = ['방문', '원격'];
const PERSONNEL_OPTIONS = [1, 2, 3, 4, 5];

// 필수 라벨 컴포넌트
function RequiredLabel({ children }: { children: string }) {
  return (
    <XStack gap="$1" alignItems="center">
      <Text fontSize={16} fontWeight="600" color="#000">{children}</Text>
      <Text fontSize={16} fontWeight="600" color="#ff4444">*</Text>
    </XStack>
  );
}

// Toast 애니메이션 CSS 삽입
const injectToastStyles = () => {
  if (document.getElementById('toast-animation-styles')) return;
  const style = document.createElement('style');
  style.id = 'toast-animation-styles';
  style.textContent = `
    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
};

// Toast 컴포넌트
function Toast({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  useEffect(() => {
    injectToastStyles();
  }, []);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <View
      // @ts-ignore
      position="fixed"
      bottom={20}
      left={16}
      right={16}
      zIndex={100001}
      // @ts-ignore
      style={{
        animation: 'slideUp 0.3s ease-out',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <XStack
        backgroundColor="#333"
        paddingHorizontal={16}
        paddingVertical={12}
        borderRadius={8}
        alignItems="center"
        gap={10}
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.25}
        shadowRadius={4}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#EF4444" strokeWidth="2"/>
          <path d="M12 8v4M12 16h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <Text color="white" fontSize={16} fontWeight="500" flex={1}>{message}</Text>
        <View cursor="pointer" onPress={onClose} padding={4}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </View>
      </XStack>
    </View>
  );
}

export function RequestFormModal({ isOpen, onClose, onSuccess, defaultAddress = '', editRequest }: RequestFormModalProps) {
  const { user } = useAuth();
  const { profile, hasBusinessCard, hasPhone, updatePhone, refetch: refetchProfile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number | null; lng: number | null; id: string | null }>({ lat: null, lng: null, id: null });
  const [currentStep, setCurrentStep] = useState(1);
  const [phone1, setPhone1] = useState('010');
  const [phone2, setPhone2] = useState('');
  const [phone3, setPhone3] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [symptomImages, setSymptomImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const phone2Ref = useRef<any>(null);
  const phone3Ref = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewRef = useRef<any>(null);

  const isEditMode = !!editRequest;

  // 모달이 열릴 때 스텝 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      // 기존 전화번호가 있으면 파싱
      const existingPhone = profile?.phone || '';
      if (existingPhone.length >= 10) {
        setPhone1(existingPhone.slice(0, 3));
        setPhone2(existingPhone.slice(3, 7));
        setPhone3(existingPhone.slice(7, 11));
      } else {
        setPhone1('010');
        setPhone2('');
        setPhone3('');
      }
      setPhoneError(null);
    }
  }, [isOpen, profile?.phone]);

  // 스텝2로 이동 시 두 번째 입력창에 포커스
  useEffect(() => {
    if (currentStep === 2) {
      setTimeout(() => {
        phone2Ref.current?.focus();
      }, 100);
    }
  }, [currentStep]);

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RequestFormData>({
    defaultValues: {
      visitType: '방문',
      asType: '복합기/OA',
      title: '',
      address: defaultAddress,
      addressDetail: '',
      latitude: null,
      longitude: null,
      model: '',
      symptom: '',
      symptomImages: [],
      expectedFee: 50000,
      duration: '2시간',
      scheduleDate: new Date().toISOString().split('T')[0],
      scheduleTime: '17:00',
      requiredPersonnel: 1,
      description: '',
      isUrgent: false,
      needsInvoice: false,
    },
  });

  // 수정 모드일 때 폼 초기화
  useEffect(() => {
    if (isOpen && editRequest) {
      reset({
        visitType: (editRequest.visit_type as VisitType) || '방문',
        asType: (editRequest.as_type as AsType) || '복합기/OA',
        title: editRequest.title || '',
        address: editRequest.address || '',
        addressDetail: editRequest.address_detail || '',
        latitude: editRequest.latitude || null,
        longitude: editRequest.longitude || null,
        model: editRequest.model || '',
        symptom: editRequest.symptom || '',
        symptomImages: editRequest.symptom_images || [],
        expectedFee: editRequest.expected_fee || 50000,
        duration: editRequest.duration || '2시간',
        scheduleDate: editRequest.schedule_date || new Date().toISOString().split('T')[0],
        scheduleTime: editRequest.schedule_time || '17:00',
        requiredPersonnel: editRequest.required_personnel || 1,
        description: editRequest.description || '',
        isUrgent: editRequest.is_urgent || false,
        needsInvoice: editRequest.needs_invoice || false,
      });
      setSymptomImages(editRequest.symptom_images || []);
    }
  }, [isOpen, editRequest, reset]);

  // 이미지 업로드 핸들러
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setIsUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('symptom-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('symptom-images')
          .getPublicUrl(fileName);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setSymptomImages(prev => [...prev, ...uploadedUrls]);
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      const errorMessage = error?.message || error?.error_description || '알 수 없는 오류';
      alert(`이미지 업로드에 실패했습니다.\n\n오류: ${errorMessage}`);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 이미지 삭제 핸들러
  const handleImageRemove = (index: number) => {
    setSymptomImages(prev => prev.filter((_, i) => i !== index));
  };

  // 폼 에러 처리
  const onFormError = (formErrors: any) => {
    // 첫 번째 에러 메시지 찾기
    const errorFields = ['title', 'address', 'expectedFee', 'scheduleDate', 'scheduleTime', 'description'];
    for (const field of errorFields) {
      if (formErrors[field]) {
        setToastMessage(formErrors[field].message || '필수 항목을 입력해주세요');
        break;
      }
    }
    // 스크롤을 맨 위로
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // 명함 미등록 시 프로필 설정 모달 먼저 표시 (수정 모드에서는 체크 안함)
  const needsBusinessCard = isOpen && user && !hasBusinessCard && !isEditMode;

  // 전화번호 유효성 검사
  const validatePhone = (): boolean => {
    if (!phone1 || !phone2 || !phone3) return false;
    if (!/^01[0-9]$/.test(phone1)) return false;
    if (!/^[0-9]{3,4}$/.test(phone2)) return false;
    if (!/^[0-9]{4}$/.test(phone3)) return false;
    return true;
  };

  // 전화번호 합치기
  const getFullPhoneNumber = () => `${phone1}${phone2}${phone3}`;

  // 스텝1 완료 -> 스텝2로 이동 (연락처 없는 경우) 또는 바로 제출
  const handleStep1Submit = handleSubmit(async (data: RequestFormData) => {
    if (!user) return;

    // 수정 모드이거나 이미 연락처가 있으면 바로 제출
    if (isEditMode || hasPhone) {
      await submitRequest(data);
    } else {
      // 연락처 입력 스텝으로 이동
      setCurrentStep(2);
    }
  }, onFormError);

  // 스텝2에서 연락처 저장 후 의뢰 제출
  const handleStep2Submit = async () => {
    if (!phone2.trim() || !phone3.trim()) {
      setPhoneError('연락처를 모두 입력해주세요');
      return;
    }

    if (!validatePhone()) {
      setPhoneError('올바른 연락처 형식이 아닙니다');
      return;
    }

    setIsSavingPhone(true);
    setPhoneError(null);

    try {
      // 연락처 저장
      await updatePhone(getFullPhoneNumber());
      await refetchProfile();

      // 의뢰 제출
      handleSubmit(submitRequest)();
    } catch (error) {
      console.error('Failed to save phone:', error);
      setPhoneError('연락처 저장에 실패했습니다');
    } finally {
      setIsSavingPhone(false);
    }
  };

  // 명함 등록 완료 후 처리
  const handleProfileSuccess = async () => {
    await refetchProfile();
  };

  // 실제 의뢰 제출 함수
  const submitRequest = async (data: RequestFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const requestData = {
        visit_type: data.visitType,
        as_type: data.asType,
        title: data.title,
        address: data.address,
        address_detail: data.addressDetail,
        latitude: data.latitude,
        longitude: data.longitude,
        model: data.model,
        symptom: data.symptom,
        symptom_images: symptomImages.length > 0 ? symptomImages : null,
        expected_fee: data.expectedFee,
        duration: data.duration,
        schedule_date: data.scheduleDate,
        schedule_time: data.scheduleTime,
        required_personnel: data.requiredPersonnel,
        description: data.description,
        is_urgent: data.isUrgent,
        needs_invoice: data.needsInvoice,
      };

      let resultId: string | null = null;

      if (isEditMode && editRequest) {
        // 수정 모드
        const { error } = await supabase.from('requests')
          .update(requestData)
          .eq('id', editRequest.id);

        if (error) throw error;
        resultId = editRequest.id;
      } else {
        // 신규 등록 모드
        const { data: insertedData, error } = await supabase.from('requests').insert({
          ...requestData,
          user_id: user.id,
          status: 'pending',
        }).select('id').single();

        if (error) throw error;
        resultId = insertedData?.id || null;
      }

      // 좌표와 ID 저장 (성공 다이얼로그 닫힐 때 전달)
      setLastCoords({ lat: data.latitude, lng: data.longitude, id: resultId });
      // 폼 초기화
      reset({
        visitType: '방문',
        asType: '복합기/OA',
        title: '',
        address: '',
        addressDetail: '',
        latitude: null,
        longitude: null,
        model: '',
        symptom: '',
        symptomImages: [],
        expectedFee: 50000,
        duration: '2시간',
        scheduleDate: new Date().toISOString().split('T')[0],
        scheduleTime: '17:00',
        requiredPersonnel: 1,
        description: '',
        isUrgent: false,
        needsInvoice: false,
      });
      setSymptomImages([]);
      onClose();
      if (!isEditMode) {
        setShowSuccessDialog(true);
      } else {
        // 수정 완료 시 바로 콜백
        onSuccess?.(data.latitude, data.longitude, resultId);
      }
    } catch (error) {
      console.error('Failed to save request:', error);
      alert(isEditMode ? '협업요청 수정에 실패했습니다.' : '협업요청 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSymptomImages([]);
    setCurrentStep(1);
    setPhone1('010');
    setPhone2('');
    setPhone3('');
    setPhoneError(null);
    onClose();
  };

  // 명함 미등록 시 프로필 설정 모달 먼저 표시
  if (needsBusinessCard) {
    return (
      <ProfileSetupModal
        isOpen={true}
        onClose={onClose}
        onSuccess={handleProfileSuccess}
      />
    );
  }

  return (
    <>
    <Sheet
      modal
      open={isOpen}
      onOpenChange={(open: boolean) => !open && handleClose()}
      snapPoints={[90]}
      zIndex={100000}
      animation="medium"
      disableDrag
    >
      <Sheet.Overlay
        animation="medium"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.3)"
      />
      <Sheet.Frame
        backgroundColor="white"
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        animation="medium"
        enterStyle={{ y: 1000 }}
        exitStyle={{ y: 1000 }}
        maxWidth={768}
        alignSelf="center"
        width="100%"
      >
        {/* 고정 헤더 */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$3"
          borderBottomWidth={1}
          borderBottomColor="#eee"
          backgroundColor="white"
        >
          <XStack alignItems="center" gap="$2">
            {currentStep === 2 && (
              <View cursor="pointer" onPress={() => setCurrentStep(1)} padding="$1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18l-6-6 6-6" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </View>
            )}
            <Text fontSize={20} fontWeight="700" color="#000">
              {isEditMode ? '수정하기' : (currentStep === 1 ? '요청하기' : '연락처 등록')}
            </Text>
          </XStack>
          <View cursor="pointer" onPress={handleClose} padding="$1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
        </XStack>

        {/* 스텝 2: 연락처 입력 */}
        {currentStep === 2 && (
          <YStack padding="$4" gap="$4" flex={1}>
            {/* 안내 문구 */}
            <View
              backgroundColor="#FEF3C7"
              padding="$3"
              borderRadius={8}
            >
              <XStack gap="$2" alignItems="flex-start">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginTop: 2 }}>
                  <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <Text fontSize={14} color="#92400E" lineHeight={22} flex={1}>
                  전문가가 협업을 신청하면 등록된 연락처로 문자를 발송해 드립니다.
                </Text>
              </XStack>
            </View>

            {/* 연락처 입력 */}
            <YStack gap="$2">
              <XStack gap="$1" alignItems="center">
                <Text fontSize={16} fontWeight="600" color="#000">연락처</Text>
                <Text fontSize={16} fontWeight="600" color="#ff4444">*</Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <Input
                  width={72}
                  height={44}
                  placeholder="010"
                  value={phone1}
                  onChangeText={(text: string) => {
                    const numbers = text.replace(/[^0-9]/g, '').slice(0, 3);
                    setPhone1(numbers);
                    if (numbers.length === 3) {
                      phone2Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  backgroundColor="#f9f9f9"
                  borderColor={phoneError ? '#ff4444' : '#eee'}
                  color="#000"
                  textAlign="center"
                  maxLength={3}
                />
                <Text fontSize={16} color="#999">-</Text>
                <Input
                  ref={phone2Ref}
                  width={84}
                  height={44}
                  placeholder="0000"
                  value={phone2}
                  onChangeText={(text: string) => {
                    const numbers = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setPhone2(numbers);
                    if (numbers.length === 4) {
                      phone3Ref.current?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  backgroundColor="#f9f9f9"
                  borderColor={phoneError ? '#ff4444' : '#eee'}
                  color="#000"
                  textAlign="center"
                  maxLength={4}
                />
                <Text fontSize={16} color="#999">-</Text>
                <Input
                  ref={phone3Ref}
                  width={84}
                  height={44}
                  placeholder="0000"
                  value={phone3}
                  onChangeText={(text: string) => {
                    const numbers = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setPhone3(numbers);
                  }}
                  keyboardType="number-pad"
                  backgroundColor="#f9f9f9"
                  borderColor={phoneError ? '#ff4444' : '#eee'}
                  color="#000"
                  textAlign="center"
                  maxLength={4}
                />
              </XStack>
              {phoneError && <Text color="#ff4444" fontSize={14}>{phoneError}</Text>}
              <Text fontSize={14} color="#888" marginTop="$1">
                연락처는 안전하게 보관되며, 협업 관련 알림에만 사용됩니다.
              </Text>
            </YStack>

            {/* 하단 여백 채우기 */}
            <View flex={1} />

            {/* 제출 버튼 */}
            <Button
              size="$5"
              backgroundColor={brandColors.primary}
              color="white"
              fontWeight="700"
              marginBottom="$4"
              onPress={handleStep2Submit}
              disabled={isSubmitting || isSavingPhone}
              opacity={isSubmitting || isSavingPhone ? 0.7 : 1}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
            >
              {isSavingPhone ? '저장 중...' : isSubmitting ? '등록 중...' : '협업 요청하기'}
            </Button>
          </YStack>
        )}

        {/* 스텝 1: 의뢰 정보 입력 */}
        {currentStep === 1 && (
        <ScrollView ref={scrollViewRef}>
          <YStack padding="$4" gap="$4">
            {/* 방문/원격 선택 */}
            <YStack gap="$2">
              <Text fontSize={16} fontWeight="600" color="#000">방문 유형</Text>
              <Controller
                control={control}
                name="visitType"
                render={({ field: { onChange, value } }) => (
                  <XStack gap="$2">
                    {VISIT_TYPES.map((type) => (
                      <Button
                        key={type}
                        flex={1}
                        size="$3"
                        backgroundColor={value === type ? brandColors.primary : '#f5f5f5'}
                        color={value === type ? 'white' : '#000'}
                        borderWidth={0}
                        onPress={() => onChange(type)}
                        hoverStyle={{ backgroundColor: value === type ? brandColors.primaryHover : '#e8e8e8' }}
                        pressStyle={{ backgroundColor: value === type ? brandColors.primaryPressed : '#ddd', scale: 0.98 }}
                      >
                        {type}
                      </Button>
                    ))}
                  </XStack>
                )}
              />
            </YStack>

            {/* AS 종류 선택 */}
            <YStack gap="$2">
              <Text fontSize={16} fontWeight="600" color="#000">업종</Text>
              <Controller
                control={control}
                name="asType"
                render={({ field: { onChange, value } }) => (
                  <XStack flexWrap="wrap" gap="$2">
                    {AS_TYPES.map((type) => (
                      <Button
                        key={type}
                        size="$3"
                        backgroundColor={value === type ? brandColors.primary : '#f5f5f5'}
                        color={value === type ? 'white' : '#000'}
                        borderWidth={0}
                        onPress={() => {
                          if (type === '복합기/OA') {
                            onChange(type);
                          } else {
                            setToastMessage('서비스 준비중입니다.');
                          }
                        }}
                        paddingHorizontal="$3"
                        hoverStyle={{ backgroundColor: value === type ? brandColors.primaryHover : '#e8e8e8' }}
                        pressStyle={{ backgroundColor: value === type ? brandColors.primaryPressed : '#ddd', scale: 0.98 }}
                      >
                        {type}
                      </Button>
                    ))}
                  </XStack>
                )}
              />
            </YStack>

            {/* 의뢰 제목 */}
            <YStack gap="$2">
              <RequiredLabel>제목</RequiredLabel>
              <Controller
                control={control}
                name="title"
                rules={{ required: '제목을 입력해주세요' }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    size="$4"
                    placeholder="예: 용지 걸림, 토너 교체 필요"
                    value={value}
                    onChangeText={onChange}
                    backgroundColor="#f9f9f9"
                    borderColor={errors.title ? '#ff4444' : '#eee'}
                    color="#000"
                    />
                )}
              />
              {errors.title && <Text color="#ff4444" fontSize={14}>{errors.title.message}</Text>}
            </YStack>

            {/* 기종 - 복합기/OA, 가전/설비일 때만 표시 */}
            {(watch('asType') === '복합기/OA' || watch('asType') === '가전/설비') && (
              <YStack gap="$2">
                <Text fontSize={16} fontWeight="600" color="#000">기종</Text>
                <Controller
                  control={control}
                  name="model"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      size="$4"
                      placeholder="예: HP8710, 삼성 SL-M2020"
                      value={value}
                      onChangeText={onChange}
                      backgroundColor="#f9f9f9"
                      borderColor="#eee"
                      color="#000"
                    />
                  )}
                />
              </YStack>
            )}

            {/* 증상 */}
            <YStack gap="$2">
              <Text fontSize={16} fontWeight="600" color="#000">증상</Text>
              <Controller
                control={control}
                name="symptom"
                render={({ field: { onChange, value } }) => (
                  <Input
                    size="$4"
                    placeholder="예: 색 빠짐, 용지 걸림"
                    value={value}
                    onChangeText={onChange}
                    backgroundColor="#f9f9f9"
                    borderColor="#eee"
                    color="#000"
                    />
                )}
              />
            </YStack>

            {/* 증상 이미지 */}
            <YStack gap="$2">
              <Text fontSize={16} fontWeight="600" color="#000">증상 이미지</Text>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <XStack flexWrap="wrap" gap="$2">
                {symptomImages.map((url, index) => (
                  <View key={index} position="relative">
                    <View
                      width={80}
                      height={80}
                      borderRadius={8}
                      overflow="hidden"
                      borderWidth={1}
                      borderColor="#eee"
                      cursor="pointer"
                      onPress={() => setPreviewImage(url)}
                    >
                      <img
                        src={url}
                        alt={`증상 이미지 ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </View>
                    <View
                      position="absolute"
                      top={-6}
                      right={-6}
                      width={20}
                      height={20}
                      borderRadius={10}
                      backgroundColor="#ff4444"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onPress={(e: any) => { e.stopPropagation(); handleImageRemove(index); }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </View>
                  </View>
                ))}
                <View
                  width={80}
                  height={80}
                  borderRadius={8}
                  borderWidth={2}
                  borderColor="#ddd"
                  borderStyle="dashed"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  backgroundColor="#fafafa"
                  opacity={isUploadingImage ? 0.5 : 1}
                  onPress={() => !isUploadingImage && fileInputRef.current?.click()}
                  hoverStyle={{ backgroundColor: '#f0f0f0' }}
                >
                  {isUploadingImage ? (
                    <Text fontSize={14} color="#000">업로드중...</Text>
                  ) : (
                    <YStack alignItems="center" gap={4}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <Text fontSize={14} color="#000">추가</Text>
                    </YStack>
                  )}
                </View>
              </XStack>
              <Text fontSize={14} color="#000">증상을 확인할 수 있는 이미지를 등록해주세요</Text>
            </YStack>

            {/* 비용 */}
            <YStack gap="$2">
              <XStack alignItems="center" gap="$2">
                <RequiredLabel>비용</RequiredLabel>
                <Text fontSize={14} color="#888">(부품비 별도)</Text>
              </XStack>
              <Controller
                control={control}
                name="expectedFee"
                rules={{ required: '비용을 입력해주세요', min: { value: 10000, message: '최소 10,000원 이상' } }}
                render={({ field: { onChange, value } }) => (
                  <XStack alignItems="center" gap="$2">
                    <Input
                      flex={1}
                      size="$4"
                      placeholder="50000"
                      value={value?.toString() || ''}
                      onChangeText={(text: string) => onChange(parseInt(text.replace(/[^0-9]/g, '')) || 0)}
                      keyboardType="numeric"
                      backgroundColor="#f9f9f9"
                      borderColor={errors.expectedFee ? '#ff4444' : '#eee'}
                      color="#000"
                    />
                    <Text fontSize={16} color="#000">원</Text>
                  </XStack>
                )}
              />
              {errors.expectedFee && <Text color="#ff4444" fontSize={14}>{errors.expectedFee.message}</Text>}
            </YStack>

            {/* 주소 */}
            <YStack gap="$2">
              <RequiredLabel>주소</RequiredLabel>
              <Controller
                control={control}
                name="address"
                rules={{ required: '주소를 입력해주세요' }}
                render={({ field: { onChange, value } }) => (
                  <AddressSearch
                    value={value}
                    onChange={onChange}
                    onCoordinatesChange={(lat, lng) => {
                      setValue('latitude', lat, { shouldDirty: true });
                      setValue('longitude', lng, { shouldDirty: true });
                    }}
                    placeholder="주소 검색 버튼을 눌러주세요"
                    hasError={!!errors.address}
                  />
                )}
              />
              {errors.address && <Text color="#ff4444" fontSize={14}>{errors.address.message}</Text>}
              <Controller
                control={control}
                name="addressDetail"
                render={({ field: { onChange, value } }) => (
                  <Input
                    size="$4"
                    placeholder="상세 주소 입력 (건물명, 층, 호수 등)"
                    value={value}
                    onChangeText={onChange}
                    backgroundColor="#f9f9f9"
                    borderColor="#eee"
                    color="#000"
                    />
                )}
              />
            </YStack>

            {/* 세금계산서 발행 */}
            <Controller
              control={control}
              name="needsInvoice"
              render={({ field: { onChange, value } }) => (
                <XStack
                  alignItems="center"
                  cursor="pointer"
                  gap="$3"
                  onPress={() => onChange(!value)}
                >
                  <Text fontSize={16} fontWeight="600" color="#EF4444">세금계산서 발행</Text>
                  <View
                    width={22}
                    height={22}
                    borderRadius={4}
                    borderWidth={2}
                    borderColor={value ? brandColors.primary : '#ccc'}
                    backgroundColor={value ? brandColors.primary : 'white'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {value && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </View>
                </XStack>
              )}
            />

            {/* 처리 일정 */}
            <YStack gap="$2">
              <RequiredLabel>처리 요청 시간</RequiredLabel>
              <XStack gap="$2">
                <Controller
                  control={control}
                  name="scheduleDate"
                  rules={{ required: '날짜를 선택해주세요' }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      flex={1}
                      size="$4"
                      placeholder="YYYY-MM-DD"
                      value={value}
                      onChangeText={onChange}
                      backgroundColor="#f9f9f9"
                      borderColor={errors.scheduleDate ? '#ff4444' : '#eee'}
                      color="#000"
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="scheduleTime"
                  rules={{ required: '시간을 선택해주세요' }}
                  render={({ field: { onChange, value } }) => (
                    <TimePicker
                      value={value}
                      onChange={onChange}
                      hasError={!!errors.scheduleTime}
                    />
                  )}
                />
              </XStack>
              {(errors.scheduleDate || errors.scheduleTime) && (
                <Text color="#ff4444" fontSize={14}>
                  {errors.scheduleDate?.message || errors.scheduleTime?.message}
                </Text>
              )}
            </YStack>

            {/* 필요 인원 */}
            <YStack gap="$2">
              <Text fontSize={16} fontWeight="600" color="#000">필요 인원</Text>
              <Controller
                control={control}
                name="requiredPersonnel"
                render={({ field: { onChange, value } }) => (
                  <XStack gap="$2">
                    {PERSONNEL_OPTIONS.map((num) => (
                      <Button
                        key={num}
                        minWidth={56}
                        paddingHorizontal="$3"
                        size="$3"
                        backgroundColor={value === num ? brandColors.primary : '#f5f5f5'}
                        color={value === num ? 'white' : '#000'}
                        borderWidth={0}
                        onPress={() => onChange(num)}
                        hoverStyle={{ backgroundColor: value === num ? brandColors.primaryHover : '#e8e8e8' }}
                        pressStyle={{ backgroundColor: value === num ? brandColors.primaryPressed : '#ddd', scale: 0.98 }}
                      >
                        {num} 명
                      </Button>
                    ))}
                  </XStack>
                )}
              />
            </YStack>

            {/* 상세 설명 */}
            <YStack gap="$2">
              <RequiredLabel>상세 설명</RequiredLabel>
              <Controller
                control={control}
                name="description"
                rules={{ required: '상세 설명을 입력해주세요' }}
                render={({ field: { onChange, value } }) => (
                  <TextArea
                    size="$4"
                    placeholder="상세한 문제 상황이나 요청사항을 적어주세요"
                    value={value}
                    onChangeText={onChange}
                    backgroundColor="#f9f9f9"
                    borderColor={errors.description ? '#ff4444' : '#eee'}
                    numberOfLines={4}
                    minHeight={100}
                    color="#000"
                    />
                )}
              />
              {errors.description && <Text color="#ff4444" fontSize={14}>{errors.description.message}</Text>}
            </YStack>

            {/* 긴급 체크박스 */}
            <Controller
              control={control}
              name="isUrgent"
              render={({ field: { onChange, value } }) => (
                <XStack
                  alignItems="center"
                  gap="$3"
                  padding="$3"
                  backgroundColor={value ? '#FEF2F2' : '#f9f9f9'}
                  borderRadius={8}
                  borderWidth={1}
                  borderColor={value ? '#EF4444' : '#eee'}
                  cursor="pointer"
                  onPress={() => onChange(!value)}
                  hoverStyle={{ backgroundColor: value ? '#FEE2E2' : '#f0f0f0' }}
                  pressStyle={{ scale: 0.99 }}
                >
                  <View
                    width={24}
                    height={24}
                    borderRadius={4}
                    borderWidth={2}
                    borderColor={value ? '#EF4444' : '#ccc'}
                    backgroundColor={value ? '#EF4444' : 'white'}
                    alignItems="center"
                    justifyContent="center"
                  >
                    {value && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </View>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text fontSize={16} fontWeight="600" color={value ? '#DC2626' : '#333'}>
                        긴급 요청
                      </Text>
                      {value && (
                        <View backgroundColor="#EF4444" paddingHorizontal={8} paddingVertical={4} borderRadius={6}>
                          <Text fontSize={14} fontWeight="700" color="white">긴급</Text>
                        </View>
                      )}
                    </XStack>
                    <Text fontSize={14} color="#000" marginTop={2}>
                      긴급 처리가 필요한 경우 체크해주세요
                    </Text>
                  </YStack>
                </XStack>
              )}
            />

            {/* 다음 버튼 */}
            <Button
              size="$5"
              backgroundColor={brandColors.primary}
              color="white"
              fontWeight="700"
              marginTop="$2"
              marginBottom="$4"
              onPress={handleStep1Submit}
              disabled={isSubmitting}
              opacity={isSubmitting ? 0.7 : 1}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
            >
              {isSubmitting ? (isEditMode ? '수정 중...' : '등록 중...') : (isEditMode ? '수정 완료' : (hasPhone ? '협업 요청하기' : '다음'))}
            </Button>
          </YStack>
        </ScrollView>
        )}
        {/* Toast 알림 */}
        <Toast
          message={toastMessage || ''}
          isVisible={!!toastMessage}
          onClose={() => setToastMessage(null)}
        />
      </Sheet.Frame>
    </Sheet>

    {/* 성공 팝업 */}
    <SuccessDialog
      isOpen={showSuccessDialog}
      onClose={() => {
        setShowSuccessDialog(false);
        onSuccess?.(lastCoords.lat, lastCoords.lng, lastCoords.id);
      }}
    />

    {/* 이미지 미리보기 모달 */}
    <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}
