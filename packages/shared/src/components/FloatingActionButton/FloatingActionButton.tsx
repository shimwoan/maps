import { View, Text } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface FloatingActionButtonProps {
  onPress: () => void;
}

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  return (
    <View
      position="fixed"
      right={16}
      zIndex={1000}
      // @ts-ignore - safe area for mobile browsers
      style={{
        bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        right: '16px',
      }}
      paddingHorizontal={20}
      height={48}
      borderRadius={24}
      backgroundColor={brandColors.primary}
      alignItems="center"
      justifyContent="center"
      flexDirection="row"
      gap={8}
      cursor="pointer"
      onPress={onPress}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.3}
      shadowRadius={8}
      hoverStyle={{
        backgroundColor: brandColors.primaryHover,
        scale: 1.05,
      }}
      pressStyle={{
        backgroundColor: brandColors.primaryPressed,
        scale: 0.95,
      }}
    >
      <Text color="#fff" fontSize={15} fontWeight="600">
        협업요청하기
      </Text>
    </View>
  );
}
