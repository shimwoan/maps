import { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Input } from '../components/ui/input';
import { supabase } from '@monorepo/shared';
import { Search, User, X, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  nickname: string | null;
  phone: string | null;
  business_card_url: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchProfiles = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setProfiles([]);
      } else {
        setIsLoadingMore(true);
      }

      const currentLength = reset ? 0 : profiles.length;

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .range(currentLength, currentLength + PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('nickname', `%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      if (reset) {
        setProfiles(data || []);
      } else {
        setProfiles((prev) => [...prev, ...(data || [])]);
      }

      setTotalCount(count || 0);
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [profiles.length, searchTerm]);

  // 초기 로드 및 검색어 변경 시
  useEffect(() => {
    fetchProfiles(true);
  }, [searchTerm]);

  // Intersection Observer 설정
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchProfiles(false);
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
  }, [hasMore, isLoading, isLoadingMore, fetchProfiles]);

  return (
    <AdminLayout>
      <div className="tw-space-y-6">
        <div>
          <h1 className="tw-text-3xl tw-font-bold tw-tracking-tight">프로필 관리</h1>
          <p className="tw-text-muted-foreground">등록된 사용자 프로필 목록</p>
        </div>

        {/* 검색 */}
        <div className="tw-space-y-4">
          <div className="tw-flex tw-items-center tw-justify-between">
            <p className="tw-text-sm tw-text-gray-600">{totalCount}개</p>
          </div>
          <div className="tw-relative tw-w-full sm:tw-w-72">
            <Search className="tw-absolute tw-left-2.5 tw-top-3 tw-h-4 tw-w-4 tw-text-gray-400" />
            <Input
              placeholder="닉네임 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tw-pl-9"
            />
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
          ) : profiles.length === 0 ? (
            <div className="tw-text-center tw-py-8 tw-text-muted-foreground">
              {searchTerm ? '검색 결과가 없습니다.' : '등록된 프로필이 없습니다.'}
            </div>
          ) : (
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="tw-p-4 tw-bg-white tw-rounded-lg tw-border tw-border-gray-200 tw-shadow-sm"
                >
                  <div className="tw-flex tw-justify-between tw-items-center tw-mb-2">
                    <p className="tw-font-medium tw-text-base">
                      {profile.nickname || '-'}
                    </p>
                    <span className="tw-text-sm tw-text-gray-500">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
                  {profile.business_card_url ? (
                    <button
                      onClick={() => setSelectedImage(profile.business_card_url)}
                      className="tw-block tw-w-full tw-bg-transparent tw-border-0 tw-p-0 tw-cursor-pointer"
                    >
                      <img
                        src={profile.business_card_url}
                        alt="명함"
                        className="tw-w-full tw-h-auto tw-object-contain tw-rounded tw-border tw-border-gray-200 hover:tw-opacity-80 tw-transition-opacity"
                      />
                    </button>
                  ) : (
                    <div className="tw-flex tw-items-center tw-justify-center tw-w-full tw-h-40 tw-bg-gray-100 tw-rounded tw-border tw-border-gray-200">
                      <User className="tw-h-8 tw-w-8 tw-text-gray-400" />
                    </div>
                  )}
                </div>
              ))}

            </div>
          )}

          {/* 로드 더 트리거 */}
          {!isLoading && profiles.length > 0 && (
            <div ref={loadMoreRef} className="tw-py-4 tw-flex tw-justify-center">
              {isLoadingMore && (
                <Loader2 className="tw-h-6 tw-w-6 tw-animate-spin tw-text-gray-400" />
              )}
              {!hasMore && profiles.length > 0 && (
                <p className="tw-text-sm tw-text-gray-400">모든 프로필을 불러왔습니다</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 명함 모달 */}
      {selectedImage && (
        <div
          className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black/70"
          onClick={() => setSelectedImage(null)}
        >
          <div className="tw-relative tw-max-w-4xl tw-max-h-[90vh] tw-m-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="tw-absolute tw--top-10 tw-right-0 tw-bg-transparent tw-border-0 tw-text-white tw-cursor-pointer hover:tw-text-gray-300"
            >
              <X className="tw-h-8 tw-w-8" />
            </button>
            <img
              src={selectedImage}
              alt="명함 확대"
              className="tw-max-w-full tw-max-h-[85vh] tw-object-contain tw-rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
