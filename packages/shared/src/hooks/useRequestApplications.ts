import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface RequestApplication {
  id: string;
  request_id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  request?: {
    id: string;
    title: string;
    address: string;
    address_detail?: string;
    expected_fee: number;
    schedule_date: string;
    schedule_time: string;
    status: string;
    user_id: string;
    as_type: string;
    model?: string;
    symptom?: string;
    duration?: string;
    required_personnel?: number;
    symptom_images?: string[];
    description?: string;
    is_urgent?: boolean;
    latitude?: number;
    longitude?: number;
  };
  applicant?: {
    id: string;
    email: string;
    user_metadata: {
      name?: string;
      full_name?: string;
    };
  };
  applicant_profile?: {
    business_card_url: string | null;
    nickname: string | null;
  };
}

export function useRequestApplications() {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState<RequestApplication[]>([]);
  const [applicationsToMyRequests, setApplicationsToMyRequests] = useState<RequestApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 내가 신청한 의뢰들 조회
  const fetchMyApplications = useCallback(async () => {
    if (!user) {
      setMyApplications([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('request_applications')
        .select(`
          *,
          request:requests(*)
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyApplications(data || []);
    } catch (err) {
      console.error('Failed to fetch my applications:', err);
    }
  }, [user]);

  // 내 의뢰에 대한 신청들 조회
  const fetchApplicationsToMyRequests = useCallback(async () => {
    if (!user) {
      setApplicationsToMyRequests([]);
      return;
    }

    try {
      // 먼저 내 의뢰 ID들을 가져옴
      const { data: myRequests, error: reqError } = await supabase
        .from('requests')
        .select('id')
        .eq('user_id', user.id);

      if (reqError) throw reqError;

      if (!myRequests || myRequests.length === 0) {
        setApplicationsToMyRequests([]);
        return;
      }

      const requestIds = myRequests.map(r => r.id);

      // 해당 의뢰들에 대한 신청 조회
      const { data, error } = await supabase
        .from('request_applications')
        .select(`
          *,
          request:requests(*)
        `)
        .in('request_id', requestIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 신청자 프로필 정보 조회
      if (data && data.length > 0) {
        const applicantIds = [...new Set(data.map(a => a.applicant_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, business_card_url, nickname')
          .in('user_id', applicantIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const enrichedData = data.map(app => ({
          ...app,
          applicant_profile: profileMap.get(app.applicant_id) || null,
        }));

        setApplicationsToMyRequests(enrichedData);
      } else {
        setApplicationsToMyRequests([]);
      }
    } catch (err) {
      console.error('Failed to fetch applications to my requests:', err);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchMyApplications(), fetchApplicationsToMyRequests()]);
    setIsLoading(false);
  }, [fetchMyApplications, fetchApplicationsToMyRequests]);

  // Realtime 구독을 위한 ref
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime 구독
  useEffect(() => {
    if (!user) return;

    let retryCount = 0;
    const maxRetries = 5;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupSubscription = () => {
      // 기존 채널이 있으면 제거
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // 고유한 채널 이름 생성 (사용자 ID + 타임스탬프)
      const channelName = `request-applications-${user.id}-${Date.now()}`;

      // Realtime 구독 설정
      channelRef.current = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'request_applications',
          },
          (payload) => {
            // 내가 관련된 신청인 경우에만 리페치
            const newData = payload.new as { applicant_id?: string; request_id?: string };
            const oldData = payload.old as { applicant_id?: string; request_id?: string };

            // 내가 신청자이거나, 내 의뢰에 대한 신청인 경우 리페치
            if (
              newData?.applicant_id === user.id ||
              oldData?.applicant_id === user.id
            ) {
              // 내가 신청자인 경우
              fetchAll();
            } else {
              // 내 의뢰에 대한 신청일 수 있으므로 리페치
              fetchAll();
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('[Realtime] request_applications 채널 연결 성공');
            retryCount = 0; // 성공 시 재시도 카운트 리셋
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('[Realtime] request_applications 채널 연결 실패:', status, err);
            // 재연결 시도
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // 지수 백오프, 최대 30초
              console.log(`[Realtime] ${delay}ms 후 재연결 시도 (${retryCount}/${maxRetries})`);
              retryTimeout = setTimeout(() => {
                setupSubscription();
              }, delay);
            } else {
              console.error('[Realtime] 최대 재시도 횟수 초과, 폴링으로 전환');
              // 폴링 폴백: 30초마다 데이터 새로고침
              retryTimeout = setInterval(() => {
                fetchAll();
              }, 30000);
            }
          } else if (status === 'CLOSED') {
            console.log('[Realtime] request_applications 채널 연결 종료');
          }
        });
    };

    setupSubscription();

    // 백그라운드에서 포그라운드로 돌아올 때 Realtime 재연결
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useRequestApplications] 화면 활성화 - Realtime 재연결');
        fetchAll(); // 먼저 데이터 새로고침
        setupSubscription(); // Realtime 재구독
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        clearInterval(retryTimeout as unknown as number);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchAll]);

  // 의뢰에 신청하기
  const applyToRequest = async (requestId: string) => {
    if (!user) throw new Error('로그인이 필요합니다');

    // 의뢰 정보 조회 (의뢰자에게 알림 보내기 위해)
    const { data: requestData } = await supabase
      .from('requests')
      .select('user_id, title')
      .eq('id', requestId)
      .single();

    const { data, error } = await supabase
      .from('request_applications')
      .insert({
        request_id: requestId,
        applicant_id: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('이미 신청한 의뢰입니다');
      }
      throw error;
    }

    // 의뢰 상태를 'applied'로 업데이트
    await supabase
      .from('requests')
      .update({ status: 'applied' })
      .eq('id', requestId);

    // 의뢰자에게 알림 전송
    if (requestData) {
      const applicantName = user.user_metadata?.name || user.user_metadata?.full_name || '수행자';
      await supabase.from('notifications').insert({
        user_id: requestData.user_id,
        type: 'application_received',
        title: '새로운 작업 신청',
        message: `${applicantName}님이 "${requestData.title}" 의뢰에 작업을 신청했습니다.`,
        request_id: requestId,
      });
    }

    await fetchAll();
    return data;
  };

  // 신청 수락 (의뢰 작성자가)
  const acceptApplication = async (applicationId: string, requestId: string) => {
    if (!user) throw new Error('로그인이 필요합니다');

    // 신청 정보 조회 (수행자에게 알림 보내기 위해)
    const { data: appData } = await supabase
      .from('request_applications')
      .select('applicant_id')
      .eq('id', applicationId)
      .single();

    // 의뢰 정보 조회
    const { data: requestData } = await supabase
      .from('requests')
      .select('title')
      .eq('id', requestId)
      .single();

    // 같은 의뢰의 다른 신청자들 조회 (거절 처리 및 알림용)
    const { data: otherApps } = await supabase
      .from('request_applications')
      .select('id, applicant_id')
      .eq('request_id', requestId)
      .neq('id', applicationId)
      .eq('status', 'pending');

    // 신청 상태를 accepted로
    const { error: appError } = await supabase
      .from('request_applications')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (appError) throw appError;

    // 다른 신청자들은 rejected로 처리 (알림 없이)
    if (otherApps && otherApps.length > 0) {
      const otherAppIds = otherApps.map(a => a.id);
      await supabase
        .from('request_applications')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .in('id', otherAppIds);
    }

    // 의뢰 상태를 accepted로
    const { error: reqError } = await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (reqError) throw reqError;

    // 수락된 수행자에게 알림 전송
    if (appData && requestData) {
      await supabase.from('notifications').insert({
        user_id: appData.applicant_id,
        type: 'application_accepted',
        title: '작업 신청 수락됨',
        message: `"${requestData.title}" 의뢰의 작업 신청이 수락되었습니다.`,
        request_id: requestId,
      });
    }

    await fetchAll();
  };

  // 신청 거절
  const rejectApplication = async (applicationId: string) => {
    if (!user) throw new Error('로그인이 필요합니다');

    const { error } = await supabase
      .from('request_applications')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) throw error;
    await fetchAll();
  };

  // 신청 취소 (신청자가)
  const cancelApplication = async (applicationId: string, requestId: string) => {
    if (!user) throw new Error('로그인이 필요합니다');

    console.log('Canceling application:', applicationId, 'for request:', requestId);

    // 현재 신청 상태 확인 (진행중인 경우 의뢰자에게 알림 필요)
    const { data: currentApp } = await supabase
      .from('request_applications')
      .select('status')
      .eq('id', applicationId)
      .single();

    const wasAccepted = currentApp?.status === 'accepted';

    const { error, data } = await supabase
      .from('request_applications')
      .delete()
      .eq('id', applicationId)
      .eq('applicant_id', user.id)
      .select();

    console.log('Delete result:', { error, data });

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    // 다른 신청자가 있는지 확인
    const { data: otherApps } = await supabase
      .from('request_applications')
      .select('id, status')
      .eq('request_id', requestId);

    console.log('Other applications:', otherApps);

    // 진행중이었던 경우 (accepted) - 의뢰 상태를 다시 변경
    if (wasAccepted) {
      // 다른 pending 신청자가 있으면 applied, 없으면 pending
      const hasPendingApps = otherApps?.some(a => a.status === 'pending');
      const newStatus = hasPendingApps ? 'applied' : 'pending';

      await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      // 의뢰자에게 알림 전송
      const { data: requestData } = await supabase
        .from('requests')
        .select('user_id, title')
        .eq('id', requestId)
        .single();

      if (requestData) {
        const applicantName = user.user_metadata?.name || user.user_metadata?.full_name || '수행자';
        await supabase.from('notifications').insert({
          user_id: requestData.user_id,
          type: 'application_received',
          title: '작업 취소됨',
          message: `${applicantName}님이 "${requestData.title}" 의뢰 작업을 취소했습니다.`,
          request_id: requestId,
        });
      }
    } else {
      // pending 상태였던 경우 - 다른 신청자가 없으면 pending으로
      if (!otherApps || otherApps.length === 0) {
        await supabase
          .from('requests')
          .update({ status: 'pending' })
          .eq('id', requestId);
      }
    }

    await fetchAll();
    console.log('Refetch completed');
  };

  return {
    myApplications,
    applicationsToMyRequests,
    isLoading,
    applyToRequest,
    acceptApplication,
    rejectApplication,
    cancelApplication,
    refetch: fetchAll,
  };
}
