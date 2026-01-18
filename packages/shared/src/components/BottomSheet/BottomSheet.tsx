import { Sheet } from 'react-modal-sheet';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  zIndex?: number;
  showCloseButton?: boolean;
  title?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  zIndex = 100000,
  showCloseButton = true,
  title,
}: BottomSheetProps) {
  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

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
            {showCloseButton && (
              <div
                onClick={handleCloseClick}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
                </svg>
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
