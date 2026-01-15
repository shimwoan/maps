import { useEffect, useState } from 'react';
import { NaverMap } from '../components/NaverMap';

interface Location {
  latitude: number;
  longitude: number;
}

const DEFAULT_LOCATION: Location = {
  latitude: 37.5665,
  longitude: 126.978,
};

function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve) => {

    if (!navigator.geolocation) {
      resolve(DEFAULT_LOCATION);
      return;
    }

    console.log('Requesting geolocation...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Geolocation success:', position.coords);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        resolve(DEFAULT_LOCATION);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  });
}

export function HomeScreen() {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('HomeScreen mounted');
    getCurrentLocation().then((loc) => {
      console.log('Location received:', loc);
      setLocation(loc);
      setIsLoading(false);
    });
  }, []);

  return (
    <NaverMap
      latitude={location.latitude}
      longitude={location.longitude}
      zoom={14}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
