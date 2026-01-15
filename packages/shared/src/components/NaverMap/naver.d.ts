declare namespace naver.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    x: number;
    y: number;
  }

  interface MapOptions {
    center?: LatLng;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
  }

  class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setZoom(zoom: number): void;
    getZoom(): number;
    destroy(): void;
  }

  namespace Event {
    function addListener(
      instance: Map,
      eventName: string,
      handler: (...args: unknown[]) => void
    ): void;
    function removeListener(listener: unknown): void;
  }
}
