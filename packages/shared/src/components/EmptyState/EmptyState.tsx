import { View, Text } from 'tamagui';
import { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  paddingVertical?: string;
}

export function EmptyState({ message, icon, paddingVertical = '$6' }: EmptyStateProps) {
  return (
    <View paddingVertical={paddingVertical} alignItems="center">
      {icon}
      <Text fontSize={16} color="#000" marginTop={icon ? '$2' : undefined}>
        {message}
      </Text>
    </View>
  );
}
