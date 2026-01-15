import { useForm, Controller } from 'react-hook-form';
import { Sheet, YStack, XStack, Text, Input, Button, View, TextArea, ScrollView, Dialog } from 'tamagui';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AddressSearch } from '../AddressSearch';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { RequestFormData, RequestFormModalProps, VisitType, AsType } from './types';

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
              의뢰 등록 완료
            </Text>

            {/* 안내 문구 */}
            <YStack gap="$2" alignItems="center">
              <Text fontSize={14} color="#666" textAlign="center" lineHeight={22}>
                의뢰가 성공적으로 등록되었습니다.
              </Text>
              <Text fontSize={14} color="#666" textAlign="center" lineHeight={22}>
                전문가가 의뢰를 신청하면{'\n'}
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
const AS_TYPES: AsType[] = ['복합기/OA', '프린터', '컴퓨터', '파쇄기', '기타'];
const DURATION_OPTIONS = ['30분', '1시간', '2시간', '3시간', '4시간', '반나절', '하루'];
const PERSONNEL_OPTIONS = [1, 2, 3, 4, 5];

// 필수 라벨 컴포넌트
function RequiredLabel({ children }: { children: string }) {
  return (
    <XStack gap="$1" alignItems="center">
      <Text fontSize={14} fontWeight="600" color="#333">{children}</Text>
      <Text fontSize={14} fontWeight="600" color="#ff4444">*</Text>
    </XStack>
  );
}

export function RequestFormModal({ isOpen, onClose, onSuccess, defaultAddress = '' }: RequestFormModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<RequestFormData>({
    defaultValues: {
      visitType: '방문',
      asType: '복합기/OA',
      title: '',
      address: defaultAddress,
      addressDetail: '',
      latitude: null,
      longitude: null,
      expectedFee: 50000,
      duration: '2시간',
      scheduleDate: new Date().toISOString().split('T')[0],
      scheduleTime: '17:00',
      requiredPersonnel: 1,
      description: '',
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('requests').insert({
        user_id: user.id,
        visit_type: data.visitType,
        as_type: data.asType,
        title: data.title,
        address: data.address,
        address_detail: data.addressDetail,
        latitude: data.latitude,
        longitude: data.longitude,
        expected_fee: data.expectedFee,
        duration: data.duration,
        schedule_date: data.scheduleDate,
        schedule_time: data.scheduleTime,
        required_personnel: data.requiredPersonnel,
        description: data.description,
        status: 'pending',
      });

      if (error) throw error;

      // 좌표 저장 (성공 다이얼로그 닫힐 때 전달)
      setLastCoords({ lat: data.latitude, lng: data.longitude });
      reset();
      onClose();
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Failed to create request:', error);
      alert('의뢰 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
    <Sheet
      modal
      open={isOpen}
      onOpenChange={(open: boolean) => !open && handleClose()}
      snapPoints={[90]}
      dismissOnSnapToBottom
      zIndex={100000}
      animation="medium"
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
      >
        <Sheet.Handle backgroundColor="#ddd" marginTop="$3" />

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
          <Text fontSize={20} fontWeight="700" color="#000">의뢰 등록</Text>
          <View cursor="pointer" onPress={handleClose} padding="$1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </View>
        </XStack>

        <ScrollView>
          <YStack padding="$4" gap="$4">
            {/* 방문/원격 선택 */}
            <YStack gap="$2">
              <Text fontSize={14} fontWeight="600" color="#333">방문 유형</Text>
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
                        color={value === type ? 'white' : '#666'}
                        borderWidth={0}
                        onPress={() => onChange(type)}
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
              <Text fontSize={14} fontWeight="600" color="#333">AS 종류</Text>
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
                        color={value === type ? 'white' : '#666'}
                        borderWidth={0}
                        onPress={() => onChange(type)}
                        paddingHorizontal="$3"
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
              <RequiredLabel>의뢰 제목</RequiredLabel>
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
              {errors.title && <Text color="#ff4444" fontSize={12}>{errors.title.message}</Text>}
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
                      setValue('latitude', lat);
                      setValue('longitude', lng);
                    }}
                    placeholder="주소 검색 버튼을 눌러주세요"
                    hasError={!!errors.address}
                  />
                )}
              />
              {errors.address && <Text color="#ff4444" fontSize={12}>{errors.address.message}</Text>}
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

            {/* 예상 수익 */}
            <YStack gap="$2">
              <RequiredLabel>예상 수익</RequiredLabel>
              <Controller
                control={control}
                name="expectedFee"
                rules={{ required: '예상 수익을 입력해주세요', min: { value: 10000, message: '최소 10,000원 이상' } }}
                render={({ field: { onChange, value } }) => (
                  <XStack alignItems="center" gap="$2">
                    <Input
                      flex={1}
                      size="$4"
                      placeholder="50000"
                      value={value?.toString() || ''}
                      onChangeText={(text) => onChange(parseInt(text.replace(/[^0-9]/g, '')) || 0)}
                      keyboardType="numeric"
                      backgroundColor="#f9f9f9"
                      borderColor={errors.expectedFee ? '#ff4444' : '#eee'}
                      color="#000"
                    />
                    <Text fontSize={16} color="#333">원</Text>
                  </XStack>
                )}
              />
              {errors.expectedFee && <Text color="#ff4444" fontSize={12}>{errors.expectedFee.message}</Text>}
            </YStack>

            {/* 소요 시간 */}
            <YStack gap="$2">
              <Text fontSize={14} fontWeight="600" color="#333">예상 소요시간</Text>
              <Controller
                control={control}
                name="duration"
                render={({ field: { onChange, value } }) => (
                  <XStack flexWrap="wrap" gap="$2">
                    {DURATION_OPTIONS.map((option) => (
                      <Button
                        key={option}
                        size="$3"
                        backgroundColor={value === option ? brandColors.primary : '#f5f5f5'}
                        color={value === option ? 'white' : '#666'}
                        borderWidth={0}
                        onPress={() => onChange(option)}
                        paddingHorizontal="$3"
                      >
                        {option}
                      </Button>
                    ))}
                  </XStack>
                )}
              />
            </YStack>

            {/* 처리 일정 */}
            <YStack gap="$2">
              <RequiredLabel>처리 일정</RequiredLabel>
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
                    <Input
                      width={100}
                      size="$4"
                      placeholder="HH:MM"
                      value={value}
                      onChangeText={onChange}
                      backgroundColor="#f9f9f9"
                      borderColor={errors.scheduleTime ? '#ff4444' : '#eee'}
                      color="#000"
                    />
                  )}
                />
              </XStack>
              {(errors.scheduleDate || errors.scheduleTime) && (
                <Text color="#ff4444" fontSize={12}>
                  {errors.scheduleDate?.message || errors.scheduleTime?.message}
                </Text>
              )}
            </YStack>

            {/* 필요 인원 */}
            <YStack gap="$2">
              <Text fontSize={14} fontWeight="600" color="#333">필요 인원</Text>
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
                        color={value === num ? 'white' : '#666'}
                        borderWidth={0}
                        onPress={() => onChange(num)}
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
              {errors.description && <Text color="#ff4444" fontSize={12}>{errors.description.message}</Text>}
            </YStack>

            {/* 등록 버튼 */}
            <Button
              size="$5"
              backgroundColor={brandColors.primary}
              color="white"
              fontWeight="700"
              marginTop="$2"
              marginBottom="$4"
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              opacity={isSubmitting ? 0.7 : 1}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
              pressStyle={{ backgroundColor: brandColors.primaryPressed, scale: 0.98 }}
            >
              {isSubmitting ? '등록 중...' : '의뢰 등록하기'}
            </Button>
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>

    {/* 성공 팝업 */}
    <SuccessDialog
      isOpen={showSuccessDialog}
      onClose={() => {
        setShowSuccessDialog(false);
        onSuccess?.(lastCoords.lat, lastCoords.lng);
      }}
    />
    </>
  );
}
