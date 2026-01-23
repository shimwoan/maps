import { YStack, Text, Card } from 'tamagui';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
}

export function StatsCard({ title, value, icon, color = '$blue9' }: StatsCardProps) {
  return (
    <Card padding="$4" flex={1} minWidth={180} elevate bordered>
      <YStack gap="$2">
        <Text color="$gray10" fontSize="$3">
          {icon && `${icon} `}{title}
        </Text>
        <Text fontSize="$8" fontWeight="bold" color={color}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </YStack>
    </Card>
  );
}
