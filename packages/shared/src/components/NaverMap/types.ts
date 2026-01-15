export interface RequestMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price: number;
  visitType: string;
  equipmentType: string;
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
  onMarkerClick?: (markerId: string) => void;
}

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}
