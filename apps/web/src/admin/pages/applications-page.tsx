import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '@monorepo/shared';
import { CheckCircle, Loader2 } from 'lucide-react';

interface Application {
  id: string;
  request_id: string;
  applicant_id: string;
  status: string;
  completion_requested: boolean;
  created_at: string;
  updated_at: string;
  requests?: {
    title: string;
    as_type: string;
    expected_fee: number;
  };
  profiles?: {
    nickname: string | null;
    phone: string | null;
  };
}

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; description: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: '대기중', description: '의뢰자 수락 대기중', variant: 'warning' },
  accepted: { label: '수락됨', description: '의뢰자가 수락함', variant: 'success' },
  rejected: { label: '거절됨', description: '의뢰자가 거절함', variant: 'destructive' },
  completed: { label: '완료', description: '작업 완료됨', variant: 'default' },
};

export function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchApplications = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setApplications([]);
      } else {
        setIsLoadingMore(true);
      }

      const currentLength = reset ? 0 : applications.length;

      let query = supabase
        .from('request_applications')
        .select(`
          *,
          requests(title, as_type, expected_fee)
        `, { count: 'exact' })
        .range(currentLength, currentLength + PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // 신청자 프로필 정보 조회
      let enrichedData: Application[] = [];
      if (data && data.length > 0) {
        const applicantIds = [...new Set(data.map(a => a.applicant_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, phone')
          .in('user_id', applicantIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        enrichedData = data.map(app => ({
          ...app,
          profiles: profileMap.get(app.applicant_id) || null,
        }));
      }

      if (reset) {
        setApplications(enrichedData);
      } else {
        setApplications((prev) => [...prev, ...enrichedData]);
      }

      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [applications.length, statusFilter]);

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    fetchApplications(true);
  }, [statusFilter]);

  // Intersection Observer 설정
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchApplications(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore, fetchApplications]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight">지원 관리</h1>
          <p className="tw-text-muted-foreground">등록된 지원(신청) 목록</p>
        </div>

        {/* 필터 */}
        <div className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <p className="tw-text-sm tw-text-gray-600">{totalCount}개</p>
          </div>
          <div className="tw-flex tw-gap-2 tw-flex-wrap">
            <Button
              variant={statusFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(null)}
            >
              전체
            </Button>
            {Object.entries(STATUS_MAP).map(([key, { label }]) => (
              <Button
                key={key}
                variant={statusFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* 콘텐츠 */}
        <div>
          {isLoading ? (
            <div className="tw-space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="tw-h-12 tw-bg-gray-100 tw-rounded tw-animate-pulse" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="tw-text-center tw-py-8 tw-text-muted-foreground">
              등록된 지원이 없습니다.
            </div>
          ) : (
            <>
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
              {applications.map((application) => (
                <div
                  key={application.id}
                  className="tw-p-4 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-shadow-sm"
                >
                  {/* 제목 + 상태 */}
                  <div className="tw-flex tw-justify-between tw-items-start tw-gap-2">
                    <p className="tw-font-semibold tw-text-base tw-text-gray-900">
                      {application.requests?.title || '-'}
                    </p>
                    <Badge variant={STATUS_MAP[application.status]?.variant || 'secondary'}>
                      {STATUS_MAP[application.status]?.label || application.status}
                    </Badge>
                  </div>

                  {/* 신청자 정보 */}
                  <div className="tw-mt-2 tw-flex tw-items-center tw-gap-4">
                    <span className="tw-text-sm tw-font-medium tw-text-gray-900">
                      {application.profiles?.nickname || '-'}
                    </span>
                    <span className="tw-text-sm tw-text-gray-500">
                      {application.profiles?.phone || '-'}
                    </span>
                  </div>

                  {/* 상세 정보 */}
                  <div className="tw-mt-3 tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1 tw-text-sm">
                    <div className="tw-flex tw-items-center tw-gap-1">
                      <span className="tw-text-gray-400">금액</span>
                      <span className="tw-text-gray-700">
                        {application.requests?.expected_fee
                          ? formatCurrency(application.requests.expected_fee)
                          : '-'}
                      </span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-1">
                      <span className="tw-text-gray-400">신청일</span>
                      <span className="tw-text-gray-700">
                        {application.created_at
                          ? new Date(application.created_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </span>
                    </div>
                    {application.completion_requested && application.status !== 'completed' && (
                      <div className="tw-flex tw-items-center tw-gap-1 tw-text-green-600 tw-font-medium">
                        <CheckCircle className="tw-h-4 tw-w-4" />
                        <span>완료요청됨</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 로드 더 트리거 */}
            <div ref={loadMoreRef} className="tw-py-4 tw-flex tw-justify-center">
              {isLoadingMore && (
                <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-gray-400" />
              )}
              {!hasMore && applications.length > 0 && (
                <p className="tw-text-sm tw-text-gray-400">모든 지원을 불러왔습니다</p>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
