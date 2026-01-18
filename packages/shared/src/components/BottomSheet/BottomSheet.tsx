import { Dialog, Sheet, XStack, View, YStack, Text, useMedia } from 'tamagui';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  showCloseButton?: boolean;
  maxWidth?: number;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  showCloseButton = true,
  maxWidth = 768,
  title,
}: BottomSheetProps) {
  const media = useMedia();
  const isMobile = media.sm;

  const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onClose();
  };

  const CloseButton = () => (
    <View
      position="absolute"
      right={0}
      top={0}
      width={28}
      height={28}
      borderRadius={14}
      backgroundColor="white"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onPress={handleCloseClick}
      hoverStyle={{ backgroundColor: '#f0f0f0' }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </View>
  );

  // 모바일: Sheet (바텀시트)
  if (isMobile) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open: boolean) => !open && onClose()}
        animation="quick"
        zIndex={zIndex}
        modal
        dismissOnSnapToBottom
        snapPoints={[85]}
        snapPointsMode="percent"
      >
        <Sheet.Overlay
          animation="quick"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.5)"
          zIndex={0}
        />
        <Sheet.Frame
          backgroundColor="white"
          borderTopLeftRadius={20}
          borderTopRightRadius={20}
          paddingBottom="$4"
          flex={1}
        >
          {/* Sheet 헤더 */}
          <XStack
            alignItems="center"
            justifyContent="center"
            position="relative"
            paddingVertical="$3"
            paddingHorizontal="$4"
          >
            <View width={36} height={4} backgroundColor="#ddd" borderRadius={2} />
            {title && (
              <View position="absolute" left="$4">
                <Text fontSize={18} fontWeight="700" color="#000">
                  {title}
                </Text>
              </View>
            )}
            {showCloseButton && <CloseButton />}
          </XStack>
          <Sheet.ScrollView flex={1} bounces={false}>
            <YStack paddingHorizontal="$4" paddingBottom="$2">
              {children}
            </YStack>
          </Sheet.ScrollView>
        </Sheet.Frame>
      </Sheet>
    );
  }

  // 데스크톱: Dialog (중앙 모달)
  return (
    <Dialog modal open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="rgba(0,0,0,0.5)"
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
          padding="$4"
          maxWidth={maxWidth}
          width="90%"
          maxHeight="85vh"
        >
          {/* Dialog 헤더 */}
          <XStack
            alignItems="center"
            justifyContent="center"
            position="relative"
            paddingBottom="$3"
          >
            {title && (
              <Dialog.Title fontSize={18} fontWeight="700" color="#000">
                {title}
              </Dialog.Title>
            )}
            {showCloseButton && <CloseButton />}
          </XStack>
          <YStack maxHeight="70vh" overflow="auto">
            {children}
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
