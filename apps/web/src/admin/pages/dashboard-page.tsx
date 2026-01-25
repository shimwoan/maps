import { Users, FileText, Send, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAdminStats } from '../hooks/useAdminStats';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="tw-flex tw-flex-col tw-items-center tw-space-y-1 tw-pb-2 md:tw-flex-row md:tw-justify-between md:tw-space-y-0">
        <CardTitle className="tw-text-sm tw-font-medium">{title}</CardTitle>
        <Icon className="tw-h-4 tw-w-4 tw-text-gray-400" />
      </CardHeader>
      <CardContent className="tw-text-center md:tw-text-left">
        <div className="tw-text-4xl tw-font-bold">{value}</div>
        {description && (
          <p className="tw-text-xs tw-text-gray-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { stats, isLoading } = useAdminStats();

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight">대시보드</h1>
        </div>

        {isLoading ? (
          <div className="tw-grid tw-gap-4 md:tw-grid-cols-2 lg:tw-grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="tw-pb-2">
                  <div className="tw-h-4 tw-w-24 tw-bg-gray-200 tw-rounded tw-animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="tw-h-8 tw-w-16 tw-bg-gray-200 tw-rounded tw-animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="tw-grid tw-gap-4 md:tw-grid-cols-2 lg:tw-grid-cols-3">
              <StatCard
                title="총 프로필"
                value={stats.totalProfiles}
                icon={Users}
                description="등록된 사용자 프로필"
              />
              <StatCard
                title="총 의뢰"
                value={stats.totalRequests}
                icon={FileText}
                description="등록된 전체 의뢰"
              />
              <StatCard
                title="총 신청"
                value={stats.totalApplications}
                icon={Send}
                description="접수된 전체 신청"
              />
              <StatCard
                title="대기중 의뢰"
                value={stats.pendingRequests}
                icon={Clock}
                description="대기중 또는 신청있음"
              />
              <StatCard
                title="진행중 의뢰"
                value={stats.acceptedRequests}
                icon={PlayCircle}
                description="현재 진행중인 의뢰"
              />
              <StatCard
                title="완료된 의뢰"
                value={stats.completedRequests}
                icon={CheckCircle}
                description="완료 처리된 의뢰"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>빠른 링크</CardTitle>
              </CardHeader>
              <CardContent className="tw-space-y-2">
                <a href="/admin/profiles" className="tw-block tw-text-sm tw-text-blue-600 hover:tw-underline">
                  프로필 관리 →
                </a>
                <a href="/admin/requests" className="tw-block tw-text-sm tw-text-blue-600 hover:tw-underline">
                  의뢰 관리 →
                </a>
                <a href="/admin/applications" className="tw-block tw-text-sm tw-text-blue-600 hover:tw-underline">
                  지원 관리 →
                </a>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
