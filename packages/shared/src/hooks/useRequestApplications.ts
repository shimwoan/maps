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
    expected_fee: number;
    schedule_date: string;
    schedule_time: string;
    status: string;
    user_id: string;
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
          request:requests(id, title, address, expected_fee, schedule_date, schedule_time, status, user_id)
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
          request:requests(id, title, address, expected_fee, schedule_date, schedule_time, status, user_id)
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

    // 기존 채널이 있으면 제거
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Realtime 구독 설정
    channelRef.current = supabase
      .channel(`request-applications-${user.id}`)
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
      .subscribe();

    return () => {
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

    // 신청 상태를 accepted로
    const { error: appError } = await supabase
      .from('request_applications')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (appError) throw appError;

    // 의뢰 상태를 accepted로
    const { error: reqError } = await supabase
      .from('requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (reqError) throw reqError;

    // 수행자에게 알림 전송
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

    // 다른 신청자가 없으면 의뢰 상태를 다시 pending으로
    const { data: otherApps } = await supabase
      .from('request_applications')
      .select('id')
      .eq('request_id', requestId);

    console.log('Other applications:', otherApps);

    if (!otherApps || otherApps.length === 0) {
      await supabase
        .from('requests')
        .update({ status: 'pending' })
        .eq('id', requestId);
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
