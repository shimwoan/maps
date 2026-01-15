import { styled, Input as TamaguiInput } from 'tamagui';

export const Input = styled(TamaguiInput, {
  name: 'CustomInput',
  borderWidth: 1,
  borderColor: '$gray6',
  borderRadius: '$3',
  paddingHorizontal: '$3',
  backgroundColor: '$background',
  color: '$color',
  focusStyle: {
    borderColor: '$blue10',
  },
  variants: {
    error: {
      true: {
        borderColor: '$red10',
      },
    },
    size: {
      sm: {
        height: 36,
      },
      md: {
        height: 44,
      },
      lg: {
        height: 52,
      },
    },
  } as const,
  defaultVariants: {
    size: 'md',
  },
});
