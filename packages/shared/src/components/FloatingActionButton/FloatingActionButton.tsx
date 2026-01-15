import { View } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface FloatingActionButtonProps {
  onPress: () => void;
}

export function FloatingActionButton({ onPress }: FloatingActionButtonProps) {
  return (
    <View
      position="absolute"
      bottom={24}
      right={24}
      width={56}
      height={56}
      borderRadius={28}
      backgroundColor={brandColors.primary}
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onPress={onPress}
      shadowColor="#000"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.25}
      shadowRadius={4}
      hoverStyle={{
        backgroundColor: brandColors.primaryHover,
        scale: 1.05,
      }}
      pressStyle={{
        backgroundColor: brandColors.primaryPressed,
        scale: 0.95,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5V19M5 12H19"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </View>
  );
}
