import { Button as TamaguiButton, styled } from 'tamagui';
import type { GetProps, TamaguiComponent } from 'tamagui';

// 호버/프레스 시 배경색 변화 완전 제거
export const Button: TamaguiComponent = styled(TamaguiButton, {
  unstyled: true,
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  cursor: 'pointer',
  borderRadius: 8,
  borderWidth: 0,

  variants: {
    size: {
      '$2': {
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 14,
      },
      '$3': {
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
      },
      '$4': {
        paddingHorizontal: 20,
        paddingVertical: 12,
        fontSize: 16,
      },
      '$5': {
        paddingHorizontal: 24,
        paddingVertical: 14,
        fontSize: 17,
      },
    },
  } as const,

  defaultVariants: {
    size: '$4',
  },
});

export type ButtonProps = GetProps<typeof Button>;
