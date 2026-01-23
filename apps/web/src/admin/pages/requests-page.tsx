import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '@monorepo/shared';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

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

const PAGE_SIZE = 10;

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' }> = {
  pending: { label: '대기중', variant: 'warning' },
  applied: { label: '신청있음', variant: 'info' },
  accepted: { label: '진행중', variant: 'default' },
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [currentPage, statusFilter]);

  async function fetchRequests() {
    try {
      setIsLoading(true);
      let query = supabase
        .from('requests')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setRequests(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight">의뢰 관리</h1>
          <p className="tw-text-muted-foreground">등록된 의뢰 목록</p>
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
              onClick={() => {
                setStatusFilter(null);
                setCurrentPage(1);
              }}
            >
              전체
            </Button>
            {Object.entries(STATUS_MAP).map(([key, { label }]) => (
              <Button
                key={key}
                variant={statusFilter === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(key);
                  setCurrentPage(1);
                }}
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
            ) : requests.length === 0 ? (
              <div className="tw-text-center tw-py-8 tw-text-muted-foreground">
                등록된 의뢰가 없습니다.
              </div>
            ) : (
              <>
                {/* 모바일 카드 뷰 */}
                <div className="tw-space-y-4 md:tw-hidden">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="tw-py-4 tw-border-b tw-border-gray-200 last:tw-border-b-0"
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
                      <div className="tw-grid tw-grid-cols-2 tw-gap-2 tw-text-sm">
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
                      <div className="tw-text-sm">
                        <span className="tw-text-gray-500">주소</span>
                        <p className="tw-font-medium">{request.address || '-'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱 테이블 뷰 */}
                <Card className="tw-hidden md:tw-block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>제목</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>주소</TableHead>
                        <TableHead>예상 금액</TableHead>
                        <TableHead>일정</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>등록일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="tw-font-medium">
                            <div className="tw-flex tw-items-center tw-gap-2">
                              {request.is_urgent && (
                                <AlertCircle className="tw-h-4 tw-w-4 tw-text-red-500" />
                              )}
                              {request.title || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {AS_TYPE_MAP[request.as_type] || request.as_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="tw-max-w-[200px] tw-truncate">
                            {request.address || '-'}
                          </TableCell>
                          <TableCell>{formatCurrency(request.expected_fee)}</TableCell>
                          <TableCell>
                            {request.schedule_date} {request.schedule_time}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_MAP[request.status]?.variant || 'secondary'}>
                              {STATUS_MAP[request.status]?.label || request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.created_at
                              ? new Date(request.created_at).toLocaleDateString('ko-KR')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {totalPages > 1 && (
                  <div className="tw-flex tw-items-center tw-justify-between tw-mt-4">
                    <p className="tw-text-sm tw-text-muted-foreground">
                      총 {totalCount}개 중 {(currentPage - 1) * PAGE_SIZE + 1}-
                      {Math.min(currentPage * PAGE_SIZE, totalCount)}개
                    </p>
                    <div className="tw-flex tw-gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="tw-h-4 tw-w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="tw-h-4 tw-w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </AdminLayout>
  );
}
