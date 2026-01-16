import { View, Text, Sheet, Spinner } from 'tamagui';
import { Button } from '../Button';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const { signInWithKakao } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleKakaoLogin = async () => {
    try {
      setLoading(true);
      await signInWithKakao();
      onLoginSuccess?.();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      forceRemoveScrollEnabled={isOpen}
      open={isOpen}
      onOpenChange={(open: boolean) => !open && onClose()}
      snapPointsMode="fit"
      dismissOnSnapToBottom
      zIndex={100000}
      animation="medium"
    >
      <Sheet.Overlay
        animation="quick"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="rgba(0,0,0,0.7)"
      />
      <Sheet.Frame
        padding="$4"
        justifyContent="center"
        alignItems="center"
        backgroundColor="white"
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        maxWidth={768}
        alignSelf="center"
        width="100%"
      >
        <Sheet.Handle backgroundColor="#ddd" />

        <View width="100%" paddingTop="$2" gap="$4">
          <Text fontSize={20} fontWeight="700" textAlign="center" color="#222">
            로그인이 필요합니다
          </Text>

          <Text fontSize={14} color="#888" textAlign="center">
            서비스를 이용하려면 로그인해주세요
          </Text>

          <Button
            size="$5"
            backgroundColor="#FEE500"
            color="#000"
            fontWeight="600"
            borderRadius={12}
            onPress={handleKakaoLogin}
            disabled={loading}
            hoverStyle={{ backgroundColor: '#F5DC00' }}
            pressStyle={{ backgroundColor: '#E6CE00' }}
          >
            {loading ? (
              <Spinner size="small" color="#000" />
            ) : (
              <View flexDirection="row" alignItems="center" gap="$2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 3C6.48 3 2 6.52 2 10.84C2 13.61 3.88 16.04 6.71 17.39L5.71 21.15C5.61 21.52 6.03 21.81 6.35 21.59L10.86 18.56C11.23 18.6 11.61 18.62 12 18.62C17.52 18.62 22 15.1 22 10.78C22 6.52 17.52 3 12 3Z"
                    fill="#000"
                  />
                </svg>
                <Text color="#000" fontWeight="600">카카오로 시작하기</Text>
              </View>
            )}
          </Button>

          <Button
            size="$4"
            backgroundColor="transparent"
            color="#999"
            onPress={onClose}
            hoverStyle={{ backgroundColor: 'transparent', opacity: 0.7 }}
            pressStyle={{ backgroundColor: 'transparent', opacity: 0.5 }}
          >
            나중에 하기
          </Button>
        </View>
      </Sheet.Frame>
    </Sheet>
  );
}
