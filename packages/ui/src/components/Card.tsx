import { styled, YStack } from 'tamagui';

export const Card = styled(YStack, {
  name: 'CustomCard',
  backgroundColor: '$background',
  borderRadius: '$4',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$gray4',
  variants: {
    variant: {
      elevated: {
        borderWidth: 0,
        elevation: 4,
      },
      outlined: {
        borderWidth: 1,
        borderColor: '$gray6',
      },
    },
  } as const,
});
