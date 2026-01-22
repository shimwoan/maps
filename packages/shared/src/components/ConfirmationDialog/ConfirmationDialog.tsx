import { YStack, XStack, Text, Dialog, Spinner } from 'tamagui';
import { Button } from '../Button';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'primary' | 'danger';
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  isLoading = false,
  variant = 'primary',
}: ConfirmationDialogProps) {
  const confirmButtonColor = variant === 'danger' ? '#dc2626' : brandColors.primary;
  const confirmButtonHoverColor = variant === 'danger' ? '#b91c1c' : brandColors.primaryHover;

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
          animation={['quick', { opacity: { overshootClamping: true } }]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          backgroundColor="white"
          borderRadius={16}
          padding="$4"
          width={300}
          onPress={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <YStack gap="$4">
            <YStack gap="$2" alignItems="center">
              <Text fontSize={16} fontWeight="700" color="#000">
                {title}
              </Text>
              <Text fontSize={16} color="#000" textAlign="center">
                {message}
              </Text>
            </YStack>
            <XStack gap="$2" justifyContent="center">
              <Button
                flex={1}
                size="$3"
                backgroundColor="#f0f0f0"
                color="#000"
                onPress={onClose}
                disabled={isLoading}
              >
                {cancelText}
              </Button>
              <Button
                flex={1}
                size="$3"
                backgroundColor={confirmButtonColor}
                color="white"
                onPress={onConfirm}
                disabled={isLoading}
                hoverStyle={{ backgroundColor: confirmButtonHoverColor }}
              >
                {isLoading ? <Spinner size="small" color="white" /> : confirmText}
              </Button>
            </XStack>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
