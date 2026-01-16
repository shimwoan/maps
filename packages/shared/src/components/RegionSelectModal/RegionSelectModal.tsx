import { useState, useEffect } from 'react';
import { View, Text, XStack, YStack, ScrollView } from 'tamagui';
import { SIDO_LIST, SIGUNGU_LIST, DONG_LIST, getSigunguBySido, getDongBySigungu, type Region, type SiGunGu, type Dong } from '../../data/regions';

interface CurrentAddress {
  sido: string;
  sigungu: string;
  dong: string;
}

interface RegionSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (region: { name: string; lat: number; lng: number; zoom?: number }) => void;
  currentAddress?: CurrentAddress | null;
}

type Step = 'sido' | 'sigungu' | 'dong';

export function RegionSelectModal({ isOpen, onClose, onSelect, currentAddress }: RegionSelectModalProps) {
  const [step, setStep] = useState<Step>('sido');
  const [selectedSido, setSelectedSido] = useState<Region | null>(null);
  const [selectedSigungu, setSelectedSigungu] = useState<SiGunGu | null>(null);
  const [sigunguList, setSigunguList] = useState<SiGunGu[]>([]);
  const [dongList, setDongList] = useState<Dong[]>([]);

  // 모달이 열릴 때 항상 시도 선택부터 시작
  useEffect(() => {
    if (isOpen) {
      setStep('sido');
      setSelectedSido(null);
      setSelectedSigungu(null);
      setSigunguList([]);
      setDongList([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSidoSelect = (sido: Region) => {
    setSelectedSido(sido);
    const list = getSigunguBySido(sido.code);
    setSigunguList(list);
    if (list.length > 0) {
      setStep('sigungu');
    } else {
      // 세종시처럼 하위 구가 없는 경우
      onSelect({ name: sido.name, lat: sido.lat, lng: sido.lng });
      handleClose();
    }
  };

  const handleSigunguSelect = (sigungu: SiGunGu) => {
    setSelectedSigungu(sigungu);
    const list = getDongBySigungu(sigungu.code);
    setDongList(list);
    if (list.length > 0) {
      setStep('dong');
    } else {
      // 하위 동이 없는 경우 시군구 선택으로 완료
      onSelect({ name: sigungu.name, lat: sigungu.lat, lng: sigungu.lng, zoom: 14 });
      handleClose();
    }
  };

  const handleDongSelect = (dong: Dong) => {
    const displayName = `${selectedSigungu?.name} ${dong.name}`;
    onSelect({ name: displayName, lat: dong.lat, lng: dong.lng, zoom: 16 });
    handleClose();
  };

  const handleClose = () => {
    setStep('sido');
    setSelectedSido(null);
    setSelectedSigungu(null);
    setSigunguList([]);
    setDongList([]);
    onClose();
  };

  const handleBack = () => {
    if (step === 'dong') {
      setStep('sigungu');
      setSelectedSigungu(null);
      setDongList([]);
    } else if (step === 'sigungu') {
      setStep('sido');
      setSelectedSido(null);
      setSigunguList([]);
    } else {
      handleClose();
    }
  };

  // 3열 그리드로 변환
  const toGrid = <T,>(items: T[], cols: number = 3): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += cols) {
      result.push(items.slice(i, i + cols));
    }
    return result;
  };

  const sidoGrid = toGrid(SIDO_LIST);
  const sigunguGrid = toGrid(sigunguList);
  const dongGrid = toGrid(dongList);

  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      backgroundColor="white"
      zIndex={200}
    >
      {/* 헤더 */}
      <XStack
        paddingVertical="$3"
        paddingHorizontal="$4"
        alignItems="center"
        justifyContent="space-between"
        borderBottomWidth={1}
        borderBottomColor="#eee"
      >
        <View padding="$2" cursor="pointer" onPress={handleClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12L11 6M5 12L11 18" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </View>
        <Text fontSize={18} fontWeight="600" color="#000">
          지역선택
        </Text>
        <View width={24} />
      </XStack>

      {/* 브레드크럼 */}
      <XStack paddingVertical="$4" paddingHorizontal="$4" gap="$2" alignItems="center" flexWrap="wrap">
        {/* 시·도 */}
        <Text
          fontSize={16}
          fontWeight={selectedSido ? '600' : (step === 'sido' ? '600' : '400')}
          color={selectedSido ? '#000' : (step === 'sido' ? '#22c55e' : '#999')}
          cursor="pointer"
          onPress={() => {
            setStep('sido');
            setSelectedSido(null);
            setSelectedSigungu(null);
          }}
        >
          {selectedSido ? selectedSido.name : '시·도 선택'}
        </Text>
        <Text fontSize={14} color="#999">{'>'}</Text>
        {/* 시·군·구 */}
        <Text
          fontSize={16}
          fontWeight={selectedSigungu ? '600' : (step === 'sigungu' ? '600' : '400')}
          color={selectedSigungu ? '#000' : (step === 'sigungu' ? '#22c55e' : '#999')}
          cursor={selectedSigungu ? 'pointer' : 'default'}
          onPress={() => {
            if (selectedSigungu) {
              setStep('sigungu');
              setSelectedSigungu(null);
            }
          }}
        >
          {selectedSigungu ? selectedSigungu.name : '시·군·구'}
        </Text>
        <Text fontSize={14} color="#999">{'>'}</Text>
        {/* 읍·면·동 */}
        <Text
          fontSize={16}
          fontWeight={step === 'dong' ? '600' : '400'}
          color={step === 'dong' ? '#22c55e' : '#999'}
        >
          읍·면·동 선택
        </Text>
      </XStack>

      {/* 지역 목록 */}
      <ScrollView flex={1} paddingHorizontal="$4">
        <YStack gap="$2" paddingBottom="$4">
          {step === 'sido' && sidoGrid.map((row, rowIndex) => (
            <XStack key={rowIndex} gap="$2">
              {row.map((sido) => (
                <View
                  key={sido.code}
                  flexBasis={0}
                  flexGrow={1}
                  paddingVertical="$3"
                  backgroundColor="#f5f5f5"
                  borderRadius="$2"
                  alignItems="center"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '#e5e5e5' }}
                  pressStyle={{ backgroundColor: '#ddd' }}
                  onPress={() => handleSidoSelect(sido)}
                >
                  <Text fontSize={14} color="#000" textAlign="center">
                    {sido.name}
                  </Text>
                </View>
              ))}
              {row.length < 3 && Array(3 - row.length).fill(null).map((_, i) => (
                <View key={`empty-${i}`} flexBasis={0} flexGrow={1} />
              ))}
            </XStack>
          ))}

          {step === 'sigungu' && sigunguGrid.map((row, rowIndex) => (
            <XStack key={rowIndex} gap="$2">
              {row.map((sigungu) => (
                <View
                  key={sigungu.code}
                  flexBasis={0}
                  flexGrow={1}
                  paddingVertical="$3"
                  backgroundColor="#f5f5f5"
                  borderRadius="$2"
                  alignItems="center"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '#e5e5e5' }}
                  pressStyle={{ backgroundColor: '#ddd' }}
                  onPress={() => handleSigunguSelect(sigungu)}
                >
                  <Text fontSize={14} color="#000" textAlign="center">
                    {sigungu.name}
                  </Text>
                </View>
              ))}
              {row.length < 3 && Array(3 - row.length).fill(null).map((_, i) => (
                <View key={`empty-${i}`} flexBasis={0} flexGrow={1} />
              ))}
            </XStack>
          ))}

          {step === 'dong' && dongGrid.map((row, rowIndex) => (
            <XStack key={rowIndex} gap="$2">
              {row.map((dong) => (
                <View
                  key={dong.code}
                  flexBasis={0}
                  flexGrow={1}
                  paddingVertical="$3"
                  backgroundColor="#f5f5f5"
                  borderRadius="$2"
                  alignItems="center"
                  cursor="pointer"
                  hoverStyle={{ backgroundColor: '#e5e5e5' }}
                  pressStyle={{ backgroundColor: '#ddd' }}
                  onPress={() => handleDongSelect(dong)}
                >
                  <Text fontSize={13} color="#000" textAlign="center">
                    {dong.name}
                  </Text>
                </View>
              ))}
              {row.length < 3 && Array(3 - row.length).fill(null).map((_, i) => (
                <View key={`empty-${i}`} flexBasis={0} flexGrow={1} />
              ))}
            </XStack>
          ))}
        </YStack>
      </ScrollView>
    </View>
  );
}
