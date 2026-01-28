import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, XStack, Spinner } from 'tamagui';
import { Sheet } from 'react-modal-sheet';
import { brandColors } from '@monorepo/ui/src/tamagui.config';
import type { Request } from '../../hooks/useRequests';
import { RequestCard } from '../RequestCard';
import { COLLABORATION_TYPES, type CollaborationType } from '../RequestFormModal/types';
import '../BottomSheet/BottomSheet.css';

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
    return `내 위치로부터 ${Math.round(km * 1000)}m`;
  }
  return `내 위치로부터 ${km.toFixed(1)}km`;
}

const ITEMS_PER_PAGE = 10;

export function RequestListPanel({
  isOpen,
  onClose,
  requests,
  currentLocation,
  onSelectRequest,
  initialCollaborationType = null,
}: RequestListPanelProps) {
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCollaborationType, setSelectedCollaborationType] = useState<CollaborationType | null>(initialCollaborationType);
  const [showCollaborationTypeModal, setShowCollaborationTypeModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 필터링 및 거리순으로 정렬된 의뢰 목록
  const sortedRequests = useMemo(() => {
    let filtered = [...requests];

    // 카테고리 필터
    if (selectedCollaborationType) {
      filtered = filtered.filter(r => r.collaboration_type === selectedCollaborationType);
    }

    // 상태 정렬 우선순위: 대기중 → 진행중 → 완료
    const statusOrder: Record<string, number> = { pending: 0, accepted: 1, completed: 2 };

    if (!currentLocation) {
      return filtered.sort((a, b) => (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1));
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
      .sort((a, b) => {
        // 먼저 상태로 정렬 (대기중 → 진행중 → 완료)
        const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
        if (statusDiff !== 0) return statusDiff;
        // 같은 상태 내에서는 거리순
        return a.distance - b.distance;
      });
  }, [requests, currentLocation, selectedCollaborationType]);

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
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialCollaborationType]);

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
                backgroundColor={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primaryLight : 'white'}
                borderWidth={1}
                borderColor={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#ddd'}
                cursor="pointer"
                alignItems="center"
                justifyContent="center"
                gap={6}
                onPress={() => setShowCollaborationTypeModal(true)}
              >
                <Text fontSize={14} fontWeight="500" color={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#000'}>
                  {selectedCollaborationType && selectedCollaborationType !== '원격' ? selectedCollaborationType : '카테고리 전체'}
                </Text>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke={selectedCollaborationType && selectedCollaborationType !== '원격' ? brandColors.primary : '#333'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
                <RequestCard
                  key={request.id}
                  title={request.title}
                  asType={request.as_type}
                  status={request.status}
                  expectedFee={request.expected_fee}
                  address={request.address}
                  collaborationType={request.collaboration_type}
                  isCompleted={request.status === 'completed'}
                  isUrgent={request.is_urgent}
                  hidePendingBadge
                  distance={'distance' in request && currentLocation && (request as any).distance !== Infinity ? formatDistance((request as any).distance) : undefined}
                  onCardPress={() => onSelectRequest(request.id)}
                />
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

        {/* 협업 카테고리 필터 모달 - Sheet.Container 내부에서 Header/Content 위에 렌더링 */}
        {showCollaborationTypeModal && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
            onClick={() => setShowCollaborationTypeModal(false)}
          >
            <View
              width="90%"
              maxWidth={360}
              backgroundColor="white"
              borderRadius={16}
              overflow="hidden"
              onPress={(e: React.MouseEvent) => e.stopPropagation()}
              // @ts-ignore
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                  {COLLABORATION_TYPES.filter(t => t !== '원격').map((type) => {
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
          </div>
        )}
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
