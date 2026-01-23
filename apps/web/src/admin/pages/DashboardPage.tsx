import { YStack, XStack, Text, Card, Spinner } from 'tamagui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DashboardLayout } from '../components/Dashboard/DashboardLayout';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { useAdminStats } from '../hooks/useAdminStats';
import { useGA4Data } from '../hooks/useGA4Data';

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useAdminStats();
  const { data: ga4Data, isLoading: ga4Loading, error: ga4Error } = useGA4Data();

  if (statsLoading) {
    return (
      <DashboardLayout>
        <YStack flex={1} justifyContent="center" alignItems="center" minHeight={400}>
          <Spinner size="large" color="$blue9" />
          <Text marginTop="$4" color="$gray10">데이터를 불러오는 중...</Text>
        </YStack>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <YStack gap="$4">
        <Text fontSize="$7" fontWeight="bold" color="$gray12">대시보드</Text>

        {/* 통계 카드 */}
        <XStack gap="$4" flexWrap="wrap">
          <StatsCard title="총 사용자" value={stats?.totalUsers || 0} icon="👥" />
          <StatsCard title="총 의뢰" value={stats?.totalRequests || 0} icon="📝" />
          {!ga4Error && (
            <>
              <StatsCard title="오늘 방문자" value={ga4Data?.todayUsers || 0} icon="👤" color="$green9" />
              <StatsCard title="오늘 페이지뷰" value={ga4Data?.todayPageViews || 0} icon="📄" color="$purple9" />
            </>
          )}
        </XStack>

        {/* GA4 트래픽 차트 */}
        {!ga4Error && ga4Data && (
          <Card padding="$4" elevate bordered>
            <Text fontSize="$5" fontWeight="bold" marginBottom="$4" color="$gray12">
              📈 일별 트래픽 (최근 30일)
            </Text>
            {ga4Loading ? (
              <YStack height={300} justifyContent="center" alignItems="center">
                <Spinner color="$blue9" />
              </YStack>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ga4Data.dailyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
                      return date.toLocaleDateString('ko-KR');
                    }}
                  />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" name="방문자" strokeWidth={2} />
                  <Line type="monotone" dataKey="sessions" stroke="#10b981" name="세션" strokeWidth={2} />
                  <Line type="monotone" dataKey="pageViews" stroke="#8b5cf6" name="페이지뷰" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {ga4Error && (
          <Card padding="$4" backgroundColor="$yellow2" bordered borderColor="$yellow6">
            <Text color="$yellow11">
              ⚠️ GA4 데이터를 불러올 수 없습니다. GA4 설정을 확인해주세요.
            </Text>
          </Card>
        )}

        {/* 의뢰 통계 차트 */}
        <Card padding="$4" elevate bordered>
          <Text fontSize="$5" fontWeight="bold" marginBottom="$4" color="$gray12">
            📊 일별 의뢰 현황 (최근 30일)
          </Text>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats?.dailyStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleDateString('ko-KR')}
              />
              <Bar dataKey="count" fill="#f97316" name="의뢰 수" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* 상태별 의뢰 */}
        <Card padding="$4" elevate bordered>
          <Text fontSize="$5" fontWeight="bold" marginBottom="$4" color="$gray12">
            📋 상태별 의뢰 현황
          </Text>
          <XStack gap="$4" flexWrap="wrap">
            {stats?.requestsByStatus?.map((item) => (
              <Card key={item.status} padding="$3" flex={1} minWidth={120} backgroundColor="$gray1">
                <YStack alignItems="center" gap="$1">
                  <Text fontSize="$6" fontWeight="bold" color="$gray12">
                    {item.count}
                  </Text>
                  <Text fontSize="$2" color="$gray10">
                    {item.status === 'pending' ? '대기중' :
                     item.status === 'accepted' ? '진행중' :
                     item.status === 'completed' ? '완료' : item.status}
                  </Text>
                </YStack>
              </Card>
            ))}
          </XStack>
        </Card>

        {/* 최근 의뢰 */}
        <Card padding="$4" elevate bordered>
          <Text fontSize="$5" fontWeight="bold" marginBottom="$4" color="$gray12">
            🕐 최근 의뢰
          </Text>
          <YStack gap="$2">
            {stats?.recentRequests?.slice(0, 5).map((request) => (
              <XStack
                key={request.id}
                padding="$3"
                backgroundColor="$gray1"
                borderRadius="$2"
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack flex={1}>
                  <Text fontWeight="600" color="$gray12">{request.title}</Text>
                  <Text fontSize="$2" color="$gray10">{request.as_type}</Text>
                </YStack>
                <XStack gap="$2" alignItems="center">
                  <Text
                    fontSize="$2"
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$2"
                    backgroundColor={
                      request.status === 'pending' ? '$blue3' :
                      request.status === 'accepted' ? '$yellow3' : '$green3'
                    }
                    color={
                      request.status === 'pending' ? '$blue10' :
                      request.status === 'accepted' ? '$yellow10' : '$green10'
                    }
                  >
                    {request.status === 'pending' ? '대기중' :
                     request.status === 'accepted' ? '진행중' : '완료'}
                  </Text>
                  <Text fontSize="$2" color="$gray9">
                    {new Date(request.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </XStack>
              </XStack>
            ))}
          </YStack>
        </Card>
      </YStack>
    </DashboardLayout>
  );
}
