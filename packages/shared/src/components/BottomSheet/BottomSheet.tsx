import { Sheet } from 'react-modal-sheet';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  title,
}: BottomSheetProps) {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      detent="content"
      style={{ zIndex }}
    >
      <Sheet.Container style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
        <Sheet.Header>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '12px 16px',
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
              <div style={{ position: 'absolute', left: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#000' }}>
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
