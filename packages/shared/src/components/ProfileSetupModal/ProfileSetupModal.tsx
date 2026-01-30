import { useState, useRef, useEffect } from 'react';
import { YStack, Text, View, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useProfile } from '../../hooks/useProfile';
import { BottomSheet } from '../BottomSheet';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isEdit?: boolean;
}

export function ProfileSetupModal({ isOpen, onClose, onSuccess, isEdit = false }: ProfileSetupModalProps) {
  const { uploadBusinessCard, updateBusinessCard } = useProfile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsUploading(false);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('이미지를 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const publicUrl = await uploadBusinessCard(selectedFile);
      await updateBusinessCard(publicUrl);
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
      setError(`업로드 실패: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCancelSelect = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndex={100001}
      title={isEdit ? '명함 or 사업자 등록증 수정' : '명함 or 사업자 등록증 등록'}
    >
      {previewUrl ? (
        // 미리보기 모드
        <YStack gap="$3">
          <View
            borderRadius={12}
            overflow="hidden"
            backgroundColor="#f0f0f0"
            alignItems="center"
            justifyContent="center"
            padding="$2"
          >
            <img
              src={previewUrl}
              alt="preview"
              style={{ maxHeight: 300, maxWidth: '100%', borderRadius: 8 }}
            />
          </View>

          <Button
            size="$4"
            backgroundColor={brandColors.primary}
            color="white"
            onPress={handleUpload}
            disabled={isUploading}
            hoverStyle={{ backgroundColor: brandColors.primaryHover }}
          >
            {isUploading ? <Spinner size="small" color="white" /> : '등록하기'}
          </Button>

          <Button
            size="$4"
            backgroundColor="#f0f0f0"
            color="#000"
            onPress={handleCancelSelect}
            disabled={isUploading}
            hoverStyle={{ backgroundColor: '#e8e8e8' }}
          >
            다시 선택
          </Button>

          {error && (
            <Text fontSize={14} color="#ff4444" textAlign="center">
              {error}
            </Text>
          )}
        </YStack>
      ) : (
        // 기본 모드 - 이미지 선택
        <YStack gap="$4">
          <Text fontSize={16} color="#000" textAlign="center">
            {isEdit
              ? '새로운 명함 이미지 or 사업자 등록증를 업로드해주세요.'
              : '작업을 수락하려면 명함 이미지 or 사업자 등록증을 등록해주세요.\n요청자에게 전문가 정보로 제공됩니다.'}
          </Text>

          {/* 이미지 업로드 영역 */}
          <View
            backgroundColor="#f5f5f5"
            borderRadius={12}
            borderWidth={2}
            borderColor="#ddd"
            borderStyle="dashed"
            minHeight={140}
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            onPress={handleClickUpload}
            overflow="hidden"
          >
            <YStack alignItems="center" gap="$1.5" padding="$3">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14M5 12h14"
                  stroke="#999"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <Text fontSize={14} color="#999">
                클릭하여 명함 이미지 업로드
              </Text>
              <Text fontSize={14} color="#bbb">
                JPG, PNG (최대 5MB)
              </Text>
            </YStack>
          </View>

          <Text fontSize={13} color="#F59E0B" textAlign="center" fontWeight="500">
            💡 가로 비율의 이미지를 권장합니다
          </Text>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {error && (
            <Text fontSize={14} color="#ff4444" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            size="$4"
            backgroundColor="#f0f0f0"
            color="#000"
            onPress={onClose}
            hoverStyle={{ backgroundColor: '#e8e8e8' }}
          >
            취소
          </Button>
        </YStack>
      )}
    </BottomSheet>
  );
}
