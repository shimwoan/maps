export interface RequestMarker {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  title: string;
  price: number;
  visitType: string;
  asType: string;
  status: string;
}

export interface NaverMapProps {
  clientId?: string;
  latitude: number;
  longitude: number;
  zoom?: number;
  style?: {
    width?: number | string;
    height?: number | string;
    flex?: number;
  };
  onMapReady?: () => void;
  onCameraChange?: (lat: number, lng: number, zoom: number) => void;
  showCurrentLocation?: boolean;
  currentLocationLat?: number;
  currentLocationLng?: number;
  markers?: RequestMarker[];
  selectedMarkerId?: string | null;
  currentUserId?: string | null;
  appliedRequestIds?: string[];  // 현재 사용자가 신청한 의뢰 ID 목록
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: () => void;
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}
