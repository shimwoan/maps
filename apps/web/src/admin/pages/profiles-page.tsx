import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/layout/admin-layout';
import { Card } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '@monorepo/shared';
import { ChevronLeft, ChevronRight, Search, User, X } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  nickname: string | null;
  phone: string | null;
  business_card_url: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 10;

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [currentPage, searchTerm]);

  async function fetchProfiles() {
    try {
      setIsLoading(true);
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('nickname', `%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setProfiles(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
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
              <>
                {/* 모바일 카드 뷰 */}
                <div className="md:tw-hidden">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="tw-py-4 tw-border-b tw-border-gray-200 last:tw-border-b-0"
                    >
                      <div className="tw-flex tw-justify-between tw-items-center">
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
                            className="tw-w-full tw-h-40 tw-object-cover tw-rounded tw-border tw-border-gray-200 hover:tw-opacity-80 tw-transition-opacity"
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

                {/* 데스크톱 테이블 뷰 */}
                <Card className="tw-hidden md:tw-block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>닉네임</TableHead>
                        <TableHead>명함</TableHead>
                        <TableHead>가입일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="tw-font-medium">
                            {profile.nickname || '-'}
                          </TableCell>
                          <TableCell>
                            {profile.business_card_url ? (
                              <button
                                onClick={() => setSelectedImage(profile.business_card_url)}
                                className="tw-block tw-bg-transparent tw-border-0 tw-p-0 tw-cursor-pointer"
                              >
                                <img
                                  src={profile.business_card_url}
                                  alt="명함"
                                  className="tw-w-56 tw-h-32 tw-object-cover tw-rounded tw-border tw-border-gray-200 hover:tw-opacity-80 tw-transition-opacity"
                                />
                              </button>
                            ) : (
                              <div className="tw-flex tw-items-center tw-justify-center tw-w-56 tw-h-32 tw-bg-gray-100 tw-rounded tw-border tw-border-gray-200">
                                <User className="tw-h-6 tw-w-6 tw-text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {profile.created_at
                              ? new Date(profile.created_at).toLocaleDateString('ko-KR')
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
