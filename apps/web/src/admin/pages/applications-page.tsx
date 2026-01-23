import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { supabase } from '@monorepo/shared';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

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

const PAGE_SIZE = 10;

const STATUS_MAP: Record<string, { label: string; description: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
  pending: { label: '대기중', description: '의뢰자 수락 대기중', variant: 'warning' },
  accepted: { label: '수락됨', description: '의뢰자가 수락함', variant: 'success' },
  rejected: { label: '거절됨', description: '의뢰자가 거절함', variant: 'destructive' },
};

export function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [currentPage, statusFilter]);

  async function fetchApplications() {
    try {
      setIsLoading(true);
      let query = supabase
        .from('request_applications')
        .select(`
          *,
          requests(title, as_type, expected_fee)
        `, { count: 'exact' })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      // 신청자 프로필 정보 조회
      if (data && data.length > 0) {
        const applicantIds = [...new Set(data.map(a => a.applicant_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, nickname, phone')
          .in('user_id', applicantIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedData = data.map(app => ({
          ...app,
          profiles: profileMap.get(app.applicant_id) || null,
        }));

        setApplications(enrichedData);
      } else {
        setApplications([]);
      }

      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching applications:', error);
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
            ) : applications.length === 0 ? (
              <div className="tw-text-center tw-py-8 tw-text-muted-foreground">
                등록된 지원이 없습니다.
              </div>
            ) : (
              <>
                {/* 모바일 카드 뷰 */}
                <div className="md:tw-hidden">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="tw-py-4 tw-border-b tw-border-gray-200 last:tw-border-b-0"
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

                      {/* 신청자 정보 - 강조 */}
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
                        {application.completion_requested && (
                          <span className="tw-text-green-600 tw-font-medium">완료요청됨</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱 테이블 뷰 */}
                <Card className="tw-hidden md:tw-block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>의뢰</TableHead>
                        <TableHead>예상 금액</TableHead>
                        <TableHead>신청자</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>완료요청</TableHead>
                        <TableHead>신청일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((application) => (
                        <TableRow key={application.id}>
                          <TableCell className="tw-font-medium">
                            {application.requests?.title || '-'}
                          </TableCell>
                          <TableCell>
                            {application.requests?.expected_fee
                              ? formatCurrency(application.requests.expected_fee)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {application.profiles?.nickname || '-'}
                          </TableCell>
                          <TableCell>
                            {application.profiles?.phone || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="tw-flex tw-flex-col tw-gap-1">
                              <Badge variant={STATUS_MAP[application.status]?.variant || 'secondary'}>
                                {STATUS_MAP[application.status]?.label || application.status}
                              </Badge>
                              <span className="tw-text-xs tw-text-gray-500">
                                {STATUS_MAP[application.status]?.description || ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {application.completion_requested ? (
                              <div className="tw-flex tw-flex-col tw-gap-1">
                                <CheckCircle className="tw-h-5 tw-w-5 tw-text-green-500" />
                                <span className="tw-text-xs tw-text-gray-500">수행자가 완료 요청함</span>
                              </div>
                            ) : (
                              <span className="tw-text-xs tw-text-gray-400">요청 없음</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {application.created_at
                              ? new Date(application.created_at).toLocaleDateString('ko-KR')
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
