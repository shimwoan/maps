import { useState, useRef, useEffect } from 'react';
import { YStack, XStack, Text, View, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import { useProfile } from '../../hooks/useProfile';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { BottomSheet } from '../BottomSheet';

// 크롭 영역 스타일 커스터마이즈
const cropStyles = `
  .ReactCrop__crop-selection {
    border: 2px solid #6B7CFF !important;
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5) !important;
  }
  .ReactCrop__drag-handle {
    background-color: #6B7CFF !important;
    border: 2px solid white !important;
    width: 12px !important;
    height: 12px !important;
  }
`;

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isEdit?: boolean;
}

// 크롭된 이미지를 Blob으로 변환
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('No 2d context');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas is empty'));
    }, 'image/jpeg', 0.9);
  });
}

export function ProfileSetupModal({ isOpen, onClose, onSuccess, isEdit = false }: ProfileSetupModalProps) {
  const { uploadBusinessCard, updateBusinessCard } = useProfile();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 5,
    y: 5,
    width: 90,
    height: 90,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setCompletedCrop(null);
      setIsUploading(false);
      setError(null);
      setIsCropping(false);
      setCrop({
        unit: '%',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
      });
      // 파일 인풋도 초기화
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
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setIsCropping(true);
    setCrop({
      unit: '%',
      x: 5,
      y: 5,
      width: 90,
      height: 90,
    });
  };

  const handleCropAndUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      setError('이미지를 선택해주세요.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const blob = await getCroppedImg(imgRef.current, completedCrop);
      const file = new File([blob], 'business_card.jpg', { type: 'image/jpeg' });
      const publicUrl = await uploadBusinessCard(file);
      await updateBusinessCard(publicUrl);
      onSuccess?.();
      onClose();
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

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageSrc(null);
    setError(null);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      zIndex={100001}
      title={isEdit ? '명함 수정' : '명함 등록'}
    >
      {isCropping && imageSrc ? (
        // 크롭 모드
        <YStack gap="$3">
          <style dangerouslySetInnerHTML={{ __html: cropStyles }} />
          <View
            borderRadius={12}
            overflow="hidden"
            backgroundColor="#f0f0f0"
            alignItems="center"
            justifyContent="center"
            padding="$2"
          >
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              style={{ maxHeight: 300 }}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="crop"
                style={{ maxHeight: 300, maxWidth: '100%' }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const initialCrop: PixelCrop = {
                    unit: 'px',
                    x: img.width * 0.05,
                    y: img.height * 0.05,
                    width: img.width * 0.9,
                    height: img.height * 0.9,
                  };
                  setCompletedCrop(initialCrop);
                }}
              />
            </ReactCrop>
          </View>

          <Text fontSize={12} color="#888" textAlign="center">
            모서리나 테두리를 드래그하여 영역을 조절하세요
          </Text>

          <XStack gap="$2">
            <Button
              flex={1}
              size="$4"
              backgroundColor="#f0f0f0"
              color="#666"
              onPress={handleCancelCrop}
              disabled={isUploading}
              hoverStyle={{ backgroundColor: '#e8e8e8' }}
            >
              취소
            </Button>
            <Button
              flex={1}
              size="$4"
              backgroundColor={brandColors.primary}
              color="white"
              onPress={handleCropAndUpload}
              disabled={isUploading}
              hoverStyle={{ backgroundColor: brandColors.primaryHover }}
            >
              {isUploading ? <Spinner size="small" color="white" /> : '등록하기'}
            </Button>
          </XStack>

          {error && (
            <Text fontSize={13} color="#ff4444" textAlign="center">
              {error}
            </Text>
          )}
        </YStack>
      ) : (
        // 기본 모드 - 이미지 선택
        <YStack gap="$4">
          <Text fontSize={14} color="#666" textAlign="center">
            {isEdit
              ? '새로운 명함 이미지를 업로드해주세요.'
              : '작업을 수락하려면 명함 이미지를 등록해주세요.\n의뢰인에게 전문가 정보로 제공됩니다.'}
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
              <Text fontSize={13} color="#999">
                클릭하여 명함 이미지 업로드
              </Text>
              <Text fontSize={11} color="#bbb">
                JPG, PNG (최대 5MB)
              </Text>
            </YStack>
          </View>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {error && (
            <Text fontSize={13} color="#ff4444" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            size="$4"
            backgroundColor="#f0f0f0"
            color="#666"
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
