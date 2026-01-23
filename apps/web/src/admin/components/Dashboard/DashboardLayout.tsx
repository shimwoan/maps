import { XStack, YStack, Text, Button, ScrollView } from 'tamagui';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: '/admin', label: '대시보드', icon: '📊' },
  { path: '/admin/analytics', label: 'GA4 분석', icon: '📈' },
  { path: '/admin/users', label: '사용자 관리', icon: '👥' },
  { path: '/admin/requests', label: '의뢰 관리', icon: '📝' },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAdminAuth();

  return (
    <XStack flex={1} height="100vh">
      {/* 사이드바 */}
      <YStack width={240} backgroundColor="$gray1" padding="$4" borderRightWidth={1} borderRightColor="$gray4">
        <Text fontSize="$6" fontWeight="bold" color="$blue9" marginBottom="$6">
          협업 관리자
        </Text>

        <YStack gap="$2" flex={1}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                onPress={() => navigate(item.path)}
                backgroundColor={isActive ? '$blue4' : 'transparent'}
                borderRadius="$3"
                justifyContent="flex-start"
                paddingHorizontal="$3"
                pressStyle={{ backgroundColor: '$blue3' }}
                hoverStyle={{ backgroundColor: isActive ? '$blue4' : '$gray3' }}
              >
                <XStack gap="$2" alignItems="center">
                  <Text fontSize="$4">{item.icon}</Text>
                  <Text color={isActive ? '$blue10' : '$gray11'} fontWeight={isActive ? '600' : '400'}>
                    {item.label}
                  </Text>
                </XStack>
              </Button>
            );
          })}
        </YStack>

        <Button
          onPress={() => {
            logout();
            navigate('/admin/login');
          }}
          backgroundColor="$red4"
          borderRadius="$3"
          pressStyle={{ backgroundColor: '$red5' }}
        >
          <Text color="$red10">로그아웃</Text>
        </Button>
      </YStack>

      {/* 메인 콘텐츠 */}
      <YStack flex={1} backgroundColor="$gray2">
        <ScrollView flex={1}>
          <YStack padding="$4">
            {children}
          </YStack>
        </ScrollView>
      </YStack>
    </XStack>
  );
}
