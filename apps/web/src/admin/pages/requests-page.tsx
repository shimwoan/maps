import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '@monorepo/shared';
import { AlertCircle, Loader2 } from 'lucide-react';

interface Request {
  id: string;
  user_id: string;
  title: string;
  as_type: string;
  address: string;
  expected_fee: number;
  schedule_date: string;
  schedule_time: string;
  status: string;
  is_urgent: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' }> = {
  pending: { label: '대기중', variant: 'warning' },
  applied: { label: '신청있음', variant: 'info' },
  accepted: { label: '매칭완료', variant: 'default' },
  completed: { label: '완료', variant: 'success' },
  cancelled: { label: '취소', variant: 'destructive' },
};

const AS_TYPE_MAP: Record<string, string> = {
  computer: '컴퓨터',
  printer: '프린터',
  network: '네트워크',
  cctv: 'CCTV',
  server: '서버',
  pos: 'POS',
  other: '기타',
};

export function RequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchRequests = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setRequests([]);
      } else {
        setIsLoadingMore(true);
      }

      const currentLength = reset ? 0 : requests.length;

      let query = supabase
        .from('requests')
        .select('*', { count: 'exact' })
        .range(currentLength, currentLength + PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      if (reset) {
        setRequests(data || []);
      } else {
        setRequests((prev) => [...prev, ...(data || [])]);
      }

      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [requests.length, statusFilter]);

  // 초기 로드 및 필터 변경 시
  useEffect(() => {
    fetchRequests(true);
  }, [statusFilter]);

  // Intersection Observer 설정
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchRequests(false);
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
  }, [hasMore, isLoading, isLoadingMore, fetchRequests]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight tw-m-0">의뢰 관리</h1>
          <p className="tw-text-muted-foreground tw-m-0 tw-mt-1">등록된 의뢰 목록</p>
        </div>

        {/* 필터 */}
        <div className="tw-space-y-2">
          <p className="tw-text-sm tw-text-gray-600">{totalCount}개</p>
          <div className="tw-flex tw-gap-2 tw-flex-wrap tw-relative tw-z-10">
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
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="tw-p-4 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-shadow-sm tw-animate-pulse">
                  {/* Title + Badge */}
                  <div className="tw-flex tw-justify-between tw-items-start">
                    <div className="tw-h-5 tw-w-32 tw-bg-gray-200 tw-rounded" />
                    <div className="tw-h-5 tw-w-16 tw-bg-gray-200 tw-rounded-full" />
                  </div>
                  {/* 2x2 Grid */}
                  <div className="tw-grid tw-grid-cols-2 tw-gap-2 tw-mt-3">
                    <div className="tw-space-y-1">
                      <div className="tw-h-3 tw-w-8 tw-bg-gray-100 tw-rounded" />
                      <div className="tw-h-4 tw-w-14 tw-bg-gray-200 tw-rounded" />
                    </div>
                    <div className="tw-space-y-1">
                      <div className="tw-h-3 tw-w-12 tw-bg-gray-100 tw-rounded" />
                      <div className="tw-h-4 tw-w-20 tw-bg-gray-200 tw-rounded" />
                    </div>
                    <div className="tw-space-y-1">
                      <div className="tw-h-3 tw-w-8 tw-bg-gray-100 tw-rounded" />
                      <div className="tw-h-4 tw-w-24 tw-bg-gray-200 tw-rounded" />
                    </div>
                    <div className="tw-space-y-1">
                      <div className="tw-h-3 tw-w-10 tw-bg-gray-100 tw-rounded" />
                      <div className="tw-h-4 tw-w-20 tw-bg-gray-200 tw-rounded" />
                    </div>
                  </div>
                  {/* Address */}
                  <div className="tw-mt-3 tw-space-y-1">
                    <div className="tw-h-3 tw-w-8 tw-bg-gray-100 tw-rounded" />
                    <div className="tw-h-4 tw-w-full tw-bg-gray-200 tw-rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="tw-text-center tw-py-8 tw-text-muted-foreground">
              등록된 의뢰가 없습니다.
            </div>
          ) : (
            <>
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="tw-p-4 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-shadow-sm"
                >
                  <div className="tw-flex tw-justify-between tw-items-start">
                    <div className="tw-flex tw-items-center tw-gap-2">
                      {request.is_urgent && (
                        <AlertCircle className="tw-h-4 tw-w-4 tw-text-red-500" />
                      )}
                      <p className="tw-font-medium tw-text-base">
                        {request.title || '-'}
                      </p>
                    </div>
                    <Badge variant={STATUS_MAP[request.status]?.variant || 'secondary'}>
                      {STATUS_MAP[request.status]?.label || request.status}
                    </Badge>
                  </div>
                  <div className="tw-grid tw-grid-cols-2 tw-gap-2 tw-text-sm tw-mt-2">
                    <div>
                      <span className="tw-text-gray-500">유형</span>
                      <p className="tw-font-medium">
                        {AS_TYPE_MAP[request.as_type] || request.as_type}
                      </p>
                    </div>
                    <div>
                      <span className="tw-text-gray-500">예상 금액</span>
                      <p className="tw-font-medium">{formatCurrency(request.expected_fee)}</p>
                    </div>
                    <div>
                      <span className="tw-text-gray-500">일정</span>
                      <p className="tw-font-medium">
                        {request.schedule_date} {request.schedule_time}
                      </p>
                    </div>
                    <div>
                      <span className="tw-text-gray-500">등록일</span>
                      <p className="tw-font-medium">
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="tw-text-sm tw-mt-2">
                    <span className="tw-text-gray-500">주소</span>
                    <p className="tw-font-medium">{request.address || '-'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 로드 더 트리거 */}
            <div ref={loadMoreRef} className="tw-py-4 tw-flex tw-justify-center">
              {isLoadingMore && (
                <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-gray-400" />
              )}
              {!hasMore && requests.length > 0 && (
                <p className="tw-text-sm tw-text-gray-400">모든 의뢰를 불러왔습니다</p>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
