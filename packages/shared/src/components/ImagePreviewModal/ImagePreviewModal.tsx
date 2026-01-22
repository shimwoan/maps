import { createPortal } from 'react-dom';
import { View } from 'tamagui';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
  zIndex?: number;
}

export function ImagePreviewModal({ imageUrl, onClose, zIndex = 200000 }: ImagePreviewModalProps) {
  if (!imageUrl) return null;

  return createPortal(
    <View
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="rgba(0,0,0,0.9)"
      zIndex={zIndex}
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onPress={onClose}
    >
      <View
        position="absolute"
        top={16}
        right={16}
        width={40}
        height={40}
        borderRadius={20}
        backgroundColor="rgba(255,255,255,0.2)"
        alignItems="center"
        justifyContent="center"
        cursor="pointer"
        onPress={onClose}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </View>
      <img
        src={imageUrl}
        alt="미리보기"
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          objectFit: 'contain',
          borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </View>,
    document.body
  );
}
