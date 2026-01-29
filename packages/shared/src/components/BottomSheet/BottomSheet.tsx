import { Sheet } from 'react-modal-sheet';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  title?: string;
  accentColor?: string;
  showMyBadge?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  title,
  accentColor,
  showMyBadge = false,
}: BottomSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      detent="content"
      style={{ zIndex }}
    >
      <Sheet.Container style={{
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        // @ts-ignore - CSS 변수 설정
        '--sheet-shadow': accentColor
          ? `0 0 0 2px ${accentColor}, 0 -4px 15px ${accentColor}30`
          : '0 -4px 20px rgba(0, 0, 0, 0.15)',
      } as React.CSSProperties}>
        {/* MY 텍스트 - 우측 상단 */}
        {showMyBadge && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 16,
              zIndex: 100,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8' }}>MY</span>
          </div>
        )}
        <Sheet.Header>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px 16px 12px',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                backgroundColor: '#ddd',
                borderRadius: 2,
              }}
            />
            {title && (
              <div style={{ width: '100%' }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>
                  {title}
                </span>
              </div>
            )}
          </div>
        </Sheet.Header>
        <Sheet.Content>
          <div style={{ padding: '0 16px 16px' }}>
            {children}
          </div>
        </Sheet.Content>
      </Sheet.Container>
      <Sheet.Backdrop onTap={onClose} />
    </Sheet>
  );
}
