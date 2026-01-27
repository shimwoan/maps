import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, XStack, YStack, Spinner } from 'tamagui';
import { Sheet } from 'react-modal-sheet';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';
import { formatPrice } from '../../utils/format';
import { AsTypeIcon } from '../AsTypeIcon';
import { COLLABORATION_TYPES, type CollaborationType } from '../RequestFormModal/types';
import '../BottomSheet/BottomSheet.css';

// 협업 카테고리별 색상
const COLLABORATION_TYPE_COLORS: Record<CollaborationType, { bg: string; border: string; text: string }> = {
  '방문AS': { bg: '#fff', border: '#F97316', text: '#EA580C' },
  '설치이관': { bg: '#fff', border: '#3B82F6', text: '#2563EB' },
  '회수지원': { bg: '#fff', border: '#8B5CF6', text: '#7C3AED' },
  '원격': { bg: '#fff', border: '#10B981', text: '#059669' },
};

interface Location {
  latitude: number;
  longitude: number;
}

interface RequestListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  requests: Request[];
  currentLocation: Location | null;
  onSelectRequest: (requestId: string) => void;
  initialCollaborationType?: CollaborationType | null;
  initialIsUrgentFilter?: boolean;
}

// 두 좌표 간 거리 계산 (Haversine formula, km 단위)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 거리 포맷
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

const ITEMS_PER_PAGE = 10;

export function RequestListPanel({
  isOpen,
  onClose,
  requests,
  currentLocation,
  onSelectRequest,
  initialCollaborationType = null,
  initialIsUrgentFilter = false,
}: RequestListPanelProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCollaborationType, setSelectedCollaborationType] = useState<CollaborationType | null>(initialCollaborationType);
  const [isUrgentFilterOn, setIsUrgentFilterOn] = useState(initialIsUrgentFilter);
  const [showCollaborationTypeModal, setShowCollaborationTypeModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 필터링 및 거리순으로 정렬된 의뢰 목록
  const sortedRequests = useMemo(() => {
    let filtered = [...requests];

    // 카테고리 필터
    if (selectedCollaborationType) {
      filtered = filtered.filter(r => r.collaboration_type === selectedCollaborationType);
    }

    // 긴급 필터
    if (isUrgentFilterOn) {
      filtered = filtered.filter(r => r.is_urgent);
    }

    if (!currentLocation) {
      return filtered;
    }

    // 위치 정보가 있는 의뢰는 거리 계산, 없는 의뢰는 맨 뒤에 배치
    return filtered
      .map(r => {
        if (r.latitude && r.longitude) {
          return {
            ...r,
            distance: calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              r.latitude,
              r.longitude
            ),
          };
        }
        // 위치 정보가 없는 경우 (원격 등)
        return { ...r, distance: Infinity };
      })
      .sort((a, b) => a.distance - b.distance);
  }, [requests, currentLocation, selectedCollaborationType, isUrgentFilterOn]);

  // 표시할 의뢰 목록
  const displayedRequests = useMemo(() => {
    return sortedRequests.slice(0, displayCount);
  }, [sortedRequests, displayCount]);

  // 더 로드할 항목이 있는지
  const hasMore = displayCount < sortedRequests.length;

  // 패널 열릴 때 스크롤 초기화 및 필터 동기화
  useEffect(() => {
    if (isOpen) {
      setDisplayCount(ITEMS_PER_PAGE);
      setSelectedCollaborationType(initialCollaborationType);
      setIsUrgentFilterOn(initialIsUrgentFilter);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialCollaborationType, initialIsUrgentFilter]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isLoadingMore || !hasMore) return;

    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // 스크롤이 바닥에서 100px 이내면 더 로드
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setDisplayCount(prev => prev + ITEMS_PER_PAGE);
        setIsLoadingMore(false);
      }, 300);
    }
  }, [isLoadingMore, hasMore]);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      detent="full-height"
      style={{ zIndex: 250 }}
    >
      <Sheet.Container style={{
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxWidth: 768,
        maxHeight: '90vh',
        margin: '0 auto',
      } as React.CSSProperties}>
        <Sheet.Header>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 16px 8px',
          }}>
            <div style={{
              width: 40,
              height: 4,
              backgroundColor: '#d1d5db',
              borderRadius: 2,
            }} />
          </div>
        </Sheet.Header>
        <Sheet.Content style={{ overflowY: 'auto' }}>
        {/* 필터 헤더 */}
        <View
          paddingHorizontal={12}
          paddingVertical={10}
          borderBottomWidth={1}
          borderBottomColor="#f0f0f0"
          backgroundColor="white"
        >
          <XStack alignItems="center" justifyContent="space-between">
            <XStack gap={8} alignItems="center" flex={1}>
              {/* 협업 카테고리 필터 버튼 */}
              <XStack
                paddingHorizontal={14}
                height={34}
                borderRadius={17}
                backgroundColor={selectedCollaborationType ? brandColors.primaryLight : 'white'}
                borderWidth={1}
                borderColor={selectedCollaborationType ? brandColors.primary : '#ddd'}
                cursor="pointer"
                alignItems="center"
                justifyContent="center"
                gap={6}
                onPress={() => setShowCollaborationTypeModal(true)}
              >
                <Text fontSize={14} fontWeight="500" color={selectedCollaborationType ? brandColors.primary : '#000'}>
                  {selectedCollaborationType || '카테고리 전체'}
                </Text>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke={selectedCollaborationType ? brandColors.primary : '#333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </XStack>

              {/* 긴급 필터 버튼 */}
              <XStack
                paddingHorizontal={14}
                height={34}
                borderRadius={17}
                backgroundColor={isUrgentFilterOn ? '#FEE2E2' : 'white'}
                borderWidth={1}
                borderColor={isUrgentFilterOn ? '#EF4444' : '#ddd'}
                cursor="pointer"
                alignItems="center"
                justifyContent="center"
                gap={6}
                onPress={() => setIsUrgentFilterOn(!isUrgentFilterOn)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22h20L12 2z" fill={isUrgentFilterOn ? '#EF4444' : '#999'}/>
                  <path d="M12 9v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1" fill="white"/>
                </svg>
                <Text fontSize={14} fontWeight="500" color={isUrgentFilterOn ? '#EF4444' : '#333'}>
                  긴급
                </Text>
              </XStack>

              </XStack>

            {/* 닫기 버튼 */}
            <View
              padding={8}
              cursor="pointer"
              onPress={onClose}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </View>
          </XStack>
        </View>

        {/* 협업 카테고리 필터 모달 */}
        {showCollaborationTypeModal && (
          <View
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.4)"
            zIndex={500}
            alignItems="center"
            justifyContent="center"
            onPress={() => setShowCollaborationTypeModal(false)}
          >
            <View
              width="90%"
              maxWidth={360}
              backgroundColor="white"
              borderRadius={16}
              overflow="hidden"
              onPress={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <XStack
                paddingHorizontal={20}
                paddingVertical={16}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text fontSize={18} fontWeight="700" color="#000">
                  협업 카테고리
                </Text>
                <View
                  padding={4}
                  cursor="pointer"
                  onPress={() => setShowCollaborationTypeModal(false)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </View>
              </XStack>

              {/* 모달 내용 */}
              <View padding={20} paddingTop={0}>
                {/* 전체 옵션 */}
                <View
                  height={48}
                  borderRadius={8}
                  backgroundColor={!selectedCollaborationType ? brandColors.primary : '#f5f5f5'}
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  marginBottom={10}
                  onPress={() => {
                    setSelectedCollaborationType(null);
                    setShowCollaborationTypeModal(false);
                  }}
                >
                  <XStack alignItems="center" gap={8}>
                    <View
                      width={20}
                      height={20}
                      borderRadius={10}
                      borderWidth={2}
                      borderColor={!selectedCollaborationType ? 'white' : '#ccc'}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {!selectedCollaborationType && (
                        <View width={10} height={10} borderRadius={5} backgroundColor="white" />
                      )}
                    </View>
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={!selectedCollaborationType ? 'white' : '#333'}
                    >
                      전체
                    </Text>
                  </XStack>
                </View>

                {/* 카테고리 옵션들 */}
                <View
                  // @ts-ignore
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}
                >
                  {COLLABORATION_TYPES.map((type) => {
                    const isSelected = selectedCollaborationType === type;
                    return (
                      <View
                        key={type}
                        height={48}
                        borderRadius={8}
                        backgroundColor={isSelected ? brandColors.primary : '#f5f5f5'}
                        alignItems="center"
                        justifyContent="center"
                        cursor="pointer"
                        onPress={() => {
                          setSelectedCollaborationType(type);
                          setShowCollaborationTypeModal(false);
                        }}
                      >
                        <XStack alignItems="center" gap={8}>
                          <View
                            width={20}
                            height={20}
                            borderRadius={10}
                            borderWidth={2}
                            borderColor={isSelected ? 'white' : '#ccc'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            {isSelected && (
                              <View width={10} height={10} borderRadius={5} backgroundColor="white" />
                            )}
                          </View>
                          <Text
                            fontSize={14}
                            fontWeight="600"
                            color={isSelected ? 'white' : '#333'}
                          >
                            {type}
                          </Text>
                        </XStack>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 위치 정보 없음 안내 */}
        {!currentLocation && (
          <View padding={16} backgroundColor="#FEF3C7">
            <Text fontSize={14} color="#D97706" textAlign="center">
              위치 정보가 없어 등록순으로 표시됩니다
            </Text>
          </View>
        )}

        {/* 의뢰 목록 */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            height: '100%',
          }}
        >
          <View padding={12} gap={10}>
            {displayedRequests.length === 0 ? (
              <View padding={40} alignItems="center">
                <Text fontSize={16} color="#666">
                  표시할 의뢰가 없습니다
                </Text>
              </View>
            ) : (
              displayedRequests.map((request) => (
                <View
                  key={request.id}
                  padding={14}
                  backgroundColor="#f8f9fa"
                  borderRadius={12}
                  cursor="pointer"
                  borderWidth={1}
                  borderColor="#eee"
                  hoverStyle={{ backgroundColor: '#f0f0f0', borderColor: brandColors.primary }}
                  pressStyle={{ scale: 0.98 }}
                  onPress={() => {
                    onSelectRequest(request.id);
                  }}
                >
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1} gap={6}>
                      {/* AS 아이콘 + 카테고리 + 상태 + 긴급 뱃지 */}
                      <XStack gap={6} alignItems="center" flexWrap="wrap">
                        <AsTypeIcon type={request.as_type} size={16} />
                        {/* 협업 카테고리 배지 */}
                        {request.collaboration_type && (
                          <View
                            height={24}
                            backgroundColor={COLLABORATION_TYPE_COLORS[request.collaboration_type as CollaborationType]?.bg || '#fff'}
                            borderWidth={1.5}
                            borderColor={COLLABORATION_TYPE_COLORS[request.collaboration_type as CollaborationType]?.border || '#999'}
                            paddingHorizontal={8}
                            borderRadius={6}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text
                              fontSize={12}
                              fontWeight="600"
                              color={COLLABORATION_TYPE_COLORS[request.collaboration_type as CollaborationType]?.text || '#666'}
                            >
                              {request.collaboration_type}
                            </Text>
                          </View>
                        )}
                        {/* 상태 배지 - 진행중, 완료만 표시 */}
                        {(request.status === 'completed' || request.status === 'accepted') && (
                          <View
                            height={24}
                            paddingHorizontal={8}
                            backgroundColor={
                              request.status === 'completed' ? '#E5E7EB' : '#FEF3C7'
                            }
                            borderRadius={6}
                            borderWidth={1.5}
                            borderColor={request.status === 'completed' ? '#D1D5DB' : '#FDE68A'}
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text
                              fontSize={12}
                              fontWeight="600"
                              color={
                                request.status === 'completed' ? '#6B7280' : '#D97706'
                              }
                            >
                              {request.status === 'completed' ? '완료' : '진행중'}
                            </Text>
                          </View>
                        )}
                        {request.is_urgent && (
                          <View height={24} paddingHorizontal={8} backgroundColor="#FEE2E2" borderRadius={6} alignItems="center" justifyContent="center">
                            <Text fontSize={12} fontWeight="600" color="#DC2626">긴급</Text>
                          </View>
                        )}
                        {/* 거리 표시 */}
                        {'distance' in request && currentLocation && (request as any).distance !== Infinity && (
                          <XStack alignItems="center" gap={4}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#666"/>
                              <circle cx="12" cy="9" r="2" fill="white"/>
                            </svg>
                            <Text fontSize={12} color="#666">
                              {formatDistance((request as any).distance)}
                            </Text>
                          </XStack>
                        )}
                      </XStack>

                      {/* 제목 */}
                      <Text fontSize={16} fontWeight="700" color="#000" numberOfLines={1}>
                        {request.title}
                      </Text>

                      {/* 주소 */}
                      <Text fontSize={13} color="#666" numberOfLines={1}>
                        {request.address}
                      </Text>
                    </YStack>

                    {/* 가격 */}
                    <Text fontSize={16} fontWeight="700" color={brandColors.primary}>
                      {formatPrice(request.expected_fee)}원
                    </Text>
                  </XStack>
                </View>
              ))
            )}

            {/* 로딩 인디케이터 */}
            {isLoadingMore && (
              <View padding={20} alignItems="center">
                <Spinner size="small" color={brandColors.primary} />
              </View>
            )}

            {/* 더 이상 데이터 없음 */}
            {!hasMore && displayedRequests.length > 0 && (
              <View padding={16} alignItems="center">
                <Text fontSize={14} color="#999">
                  모든 의뢰를 불러왔습니다
                </Text>
              </View>
            )}
          </View>
        </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
