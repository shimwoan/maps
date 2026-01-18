import { Sheet, XStack, View } from 'tamagui';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  disableDrag?: boolean;
  showCloseButton?: boolean;
  maxWidth?: number;
  /** 'fit' for auto-height, 'percent' for fixed percentage */
  mode?: 'fit' | 'percent';
  /** Snap point percentage when mode is 'percent' (e.g., 60 for 60%) */
  snapPoint?: number;
  /** Enable ScrollView for scrollable content */
  scrollable?: boolean;
  /** Add padding for bottom navigation */
  hasBottomNav?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  disableDrag = false,
  showCloseButton = true,
  maxWidth = 768,
  mode = 'fit',
  snapPoint = 60,
  scrollable = false,
  hasBottomNav = false,
}: BottomSheetProps) {
  const handleCloseClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onClose();
  };

  const renderContent = () => {
    if (scrollable) {
      return (
        <Sheet.ScrollView showsVerticalScrollIndicator={false} bounces={false} flex={1}>
          {children}
        </Sheet.ScrollView>
      );
    }
    return children;
  };

  return (
    <Sheet
      forceRemoveScrollEnabled={isOpen}
      open={isOpen}
      onOpenChange={(open: boolean) => !open && onClose()}
      snapPointsMode={mode === 'fit' ? 'fit' : 'percent'}
      snapPoints={mode === 'percent' ? [snapPoint] : undefined}
      dismissOnSnapToBottom={!disableDrag}
      disableDrag={disableDrag}
      zIndex={zIndex}
      animation="medium"
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
        paddingHorizontal={mode === 'fit' ? '$4' : undefined}
        paddingBottom={mode === 'fit' ? '$4' : undefined}
        paddingTop="$2"
        maxWidth={maxWidth}
        alignSelf="center"
        width="100%"
        // @ts-ignore
        style={hasBottomNav ? { paddingBottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' } : undefined}
      >
        {/* 핸들 + X 버튼 */}
        <XStack
          alignItems="center"
          justifyContent="center"
          position="relative"
          paddingVertical="$3"
          paddingHorizontal={mode === 'percent' ? '$4' : undefined}
        >
          <View width={36} height={4} backgroundColor="#ddd" borderRadius={2} />
          {showCloseButton && (
            <View
              position="absolute"
              right={mode === 'percent' ? 12 : 0}
              width={28}
              height={28}
              borderRadius={14}
              backgroundColor="white"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              onPress={handleCloseClick}
              hoverStyle={{ backgroundColor: '#e0e0e0' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </View>
          )}
        </XStack>

        {renderContent()}
      </Sheet.Frame>
    </Sheet>
  );
}
