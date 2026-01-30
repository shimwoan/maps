import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, XStack, YStack } from 'tamagui';
import { AdminLayout } from '../components/layout/admin-layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  supabase,
  RequestCard,
  RequestDetailCard,
  ConfirmationDialog,
  EmptyState,
} from '@monorepo/shared';
import type { Request } from '@monorepo/shared';
import { Loader2, Trash2 } from 'lucide-react';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface Application {
  id: string;
  request_id: string;
  applicant_id: string;
  status: string;
  completion_requested: boolean;
  created_at: string;
  updated_at: string;
  requests?: Request;
  profiles?: {
    nickname: string | null;
    phone: string | null;
    business_card_url?: string | null;
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
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
          requests(*)
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
          .select('user_id, nickname, phone, business_card_url')
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

  // 삭제 처리
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('request_applications')
        .delete()
        .eq('id', deleteTargetId);

      if (error) throw error;

      setApplications(prev => prev.filter(app => app.id !== deleteTargetId));
      setTotalCount(prev => prev - 1);
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (appId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(appId);
    setShowDeleteDialog(true);
  };

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight tw-m-0">지원 관리</h1>
          <p className="tw-text-muted-foreground tw-m-0 tw-mt-1">등록된 지원(신청) 목록</p>
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
                  <div className="tw-flex tw-justify-between tw-items-start tw-gap-2">
                    <div className="tw-h-5 tw-w-32 tw-bg-gray-200 tw-rounded" />
                    <div className="tw-h-5 tw-w-14 tw-bg-gray-200 tw-rounded-full" />
                  </div>
                  <div className="tw-mt-2 tw-flex tw-items-center tw-gap-4">
                    <div className="tw-h-4 tw-w-12 tw-bg-gray-200 tw-rounded" />
                    <div className="tw-h-4 tw-w-24 tw-bg-gray-100 tw-rounded" />
                  </div>
                  <div className="tw-mt-3 tw-flex tw-gap-4">
                    <div className="tw-h-4 tw-w-16 tw-bg-gray-200 tw-rounded" />
                    <div className="tw-h-4 tw-w-20 tw-bg-gray-200 tw-rounded" />
                  </div>
                </div>
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
                  <View key={application.id}>
                    <RequestCard
                      title={application.requests?.title || '-'}
                      asType={application.requests?.as_type || '복합기/OA'}
                      status={application.status}
                      scheduleDate={application.requests?.schedule_date || ''}
                      scheduleTime={application.requests?.schedule_time || ''}
                      isTimeNegotiable={application.requests?.is_time_negotiable}
                      expectedFee={application.requests?.expected_fee || 0}
                      address={application.requests?.address}
                      collaborationType={application.requests?.collaboration_type}
                      isCompleted={application.status === 'completed'}
                      onCardPress={() => setSelectedApplication(application)}
                      rightAction={
                        <XStack alignItems="center" gap="$2">
                          {application.completion_requested && application.status !== 'completed' && (
                            <View
                              height={24}
                              paddingHorizontal={8}
                              backgroundColor="#DCFCE7"
                              borderRadius={6}
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Text fontSize={12} fontWeight="600" color="#16A34A">완료요청</Text>
                            </View>
                          )}
                          <View
                            padding={4}
                            cursor="pointer"
                            borderRadius={6}
                            hoverStyle={{ backgroundColor: '#FEE2E2' }}
                            onPress={(e: any) => openDeleteDialog(application.id, e)}
                          >
                            <Trash2 size={18} color="#EF4444" />
                          </View>
                        </XStack>
                      }
                    >
                      {/* 신청자 정보 */}
                      <XStack
                        marginTop="$2"
                        paddingTop="$2"
                        borderTopWidth={1}
                        borderTopColor="#f0f0f0"
                        alignItems="center"
                        gap="$3"
                      >
                        <XStack alignItems="center" gap="$2">
                          <View
                            width={28}
                            height={28}
                            borderRadius={14}
                            backgroundColor="#f0f0f0"
                            alignItems="center"
                            justifyContent="center"
                            overflow="hidden"
                          >
                            {application.profiles?.business_card_url ? (
                              <img
                                src={application.profiles.business_card_url}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="2"/>
                                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                            )}
                          </View>
                          <Text fontSize={14} fontWeight="600" color="#333">
                            {application.profiles?.nickname || '신청자'}
                          </Text>
                        </XStack>
                        <Text fontSize={13} color="#666">
                          {application.profiles?.phone || '-'}
                        </Text>
                      </XStack>
                    </RequestCard>
                  </View>
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

      {/* 상세 모달 */}
      {selectedApplication?.requests && (
        <RequestDetailCard
          request={selectedApplication.requests}
          onClose={() => setSelectedApplication(null)}
          myApplication={{
            id: selectedApplication.id,
            request_id: selectedApplication.request_id,
            applicant_id: selectedApplication.applicant_id,
            status: selectedApplication.status as 'pending' | 'accepted' | 'rejected' | 'completed',
            completion_requested: selectedApplication.completion_requested,
            created_at: selectedApplication.created_at,
            updated_at: selectedApplication.updated_at,
            applicant_profile: selectedApplication.profiles ? {
              nickname: selectedApplication.profiles.nickname,
              business_card_url: selectedApplication.profiles.business_card_url ?? null,
            } : undefined,
          }}
          hideActions
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDelete}
        title="지원 삭제"
        message="이 지원을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="danger"
        isLoading={isDeleting}
      />
    </AdminLayout>
  );
}
