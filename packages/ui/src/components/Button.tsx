import { styled, Button as TamaguiButton } from 'tamagui';

export const Button = styled(TamaguiButton, {
  name: 'CustomButton',
  backgroundColor: '$blue10',
  borderRadius: '$4',
  pressStyle: {
    backgroundColor: '$blue11',
    opacity: 0.9,
  },
  variants: {
    variant: {
      primary: {
        backgroundColor: '$blue10',
      },
      secondary: {
        backgroundColor: '$gray10',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$blue10',
      },
    },
    size: {
      sm: {
        height: 36,
        paddingHorizontal: '$3',
      },
      md: {
        height: 44,
        paddingHorizontal: '$4',
      },
      lg: {
        height: 52,
        paddingHorizontal: '$5',
      },
    },
  } as const,
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
