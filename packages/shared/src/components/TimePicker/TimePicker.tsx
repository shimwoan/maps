import { useRef, useEffect } from 'react';
import { View, Text, XStack } from 'tamagui';
import { brandColors } from '@monorepo/ui/src/tamagui.config';

interface TimePickerProps {
  value: string; // "HH:MM" format
  onChange: (value: string) => void;
  hasError?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

const ITEM_HEIGHT = 44;

function WheelPicker({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = items.indexOf(value);

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      scrollRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  // 스크롤 핸들러
  const handleScroll = () => {
    if (!scrollRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current) return;

      const scrollTop = scrollRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));

      // 스냅 스크롤
      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      onChange(items[clampedIndex]);
    }, 80);
  };

  return (
    <View
      position="relative"
      height={ITEM_HEIGHT}
      width={56}
      overflow="hidden"
      backgroundColor={brandColors.primary + '15'}
      borderRadius={10}
    >
      {/* 스크롤 영역 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          height: '100%',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'y mandatory',
        }}
      >
        <style>{`
          .wheel-picker-compact::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {items.map((item) => (
          <div
            key={item}
            style={{
              height: ITEM_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              scrollSnapAlign: 'start',
            }}
          >
            <Text
              fontSize={20}
              fontWeight="600"
              color={brandColors.primary}
            >
              {item}
            </Text>
          </div>
        ))}
      </div>
    </View>
  );
}

export function TimePicker({ value, onChange, hasError }: TimePickerProps) {
  const [hour, minute] = value.split(':');

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour || '00'}:${newMinute}`);
  };

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      gap="$2"
      backgroundColor="white"
      borderRadius={12}
      borderWidth={1}
      borderColor={hasError ? '#ff4444' : '#eee'}
      padding="$2"
    >
      <WheelPicker
        items={HOURS}
        value={hour || '00'}
        onChange={handleHourChange}
      />
      <Text fontSize={20} fontWeight="700" color="#333">:</Text>
      <WheelPicker
        items={MINUTES}
        value={minute || '00'}
        onChange={handleMinuteChange}
      />
    </XStack>
  );
}
