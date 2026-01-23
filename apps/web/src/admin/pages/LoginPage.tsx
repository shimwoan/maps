import { useState } from 'react';
import { YStack, Input, Button, Text, Card, Spinner } from 'tamagui';
import { useAdminAuth } from '../contexts/AdminAuthContext';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAdminAuth();

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const success = await login(password);

    setIsSubmitting(false);

    if (!success) {
      setError('잘못된 비밀번호입니다.');
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
    if (e.nativeEvent.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" backgroundColor="$gray2" height="100vh">
      <Card padding="$6" width={400} elevate bordered>
        <YStack gap="$4">
          <YStack gap="$2" alignItems="center">
            <Text fontSize="$8" fontWeight="bold" color="$gray12">
              관리자 로그인
            </Text>
            <Text fontSize="$3" color="$gray10">
              협업 관리자 패널에 접속합니다
            </Text>
          </YStack>

          <YStack gap="$3">
            <Input
              placeholder="비밀번호를 입력하세요"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onKeyPress={handleKeyPress}
              size="$4"
              borderWidth={1}
              borderColor={error ? '$red8' : '$gray6'}
              focusStyle={{
                borderColor: '$blue8',
              }}
            />

            {error && (
              <Text color="$red10" fontSize="$2" textAlign="center">
                {error}
              </Text>
            )}

            <Button
              onPress={handleSubmit}
              disabled={isSubmitting}
              size="$4"
              pressStyle={{ opacity: 0.8 }}
              // @ts-ignore
              style={{ backgroundColor: '#3b82f6' }}
            >
              {isSubmitting ? (
                <Spinner color="white" />
              ) : (
                <Text color="white" fontWeight="600" fontSize={16}>로그인</Text>
              )}
            </Button>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
