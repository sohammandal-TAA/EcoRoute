import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { MOCK_AQI } from './dashboardData';

interface NavigationMapProps {
  isDarkMode: boolean;
  onRouteCalculated: (info: { distance: string; duration: string }) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '58vh',
};

const destination = {
  lat: 28.7041,
  lng: 77.1025,
};

const libraries: ('geometry')[] = ['geometry'];

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#e8f4f0' }] },
  { featureType: 'water', stylers: [{ color: '#b2dfdb' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d4e8d4' }] },
  { featureType: 'landscape', stylers: [{ color: '#e8f5e9' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: '#0d1a0d' }] },
  { featureType: 'water', stylers: [{ color: '#071207' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0d1a0d' }] },
  { featureType: 'landscape', stylers: [{ color: '#111f11' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a7a4a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1a0d' }] },
];

const NavigationMap: React.FC<NavigationMapProps> = ({ isDarkMode, onRouteCalculated }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const lastRouteTimeRef = useRef<number>(0);

  const [currentLocation, setCurrentLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [error, setError] = useState<string>('');
  const [isRerouting, setIsRerouting] = useState(false);
  const [zoom, setZoom] = useState(14);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        setError('');
      },
      (geoError) => {
        setError(`Location error: ${geoError.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const requestRoute = useCallback(
    (origin: google.maps.LatLngLiteral) => {
      if (!window.google) return;
      const now = Date.now();
      if (now - lastRouteTimeRef.current < 5000) return;
      lastRouteTimeRef.current = now;

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
        },
        (result, status) => {
          if (status === 'OK' && result) {
            setDirections(result);
            const leg = result.routes[0]?.legs[0];
            if (leg && leg.distance && leg.duration) {
              onRouteCalculated({
                distance: leg.distance.text,
                duration: leg.duration.text,
              });
            }
          } else {
            setError('Failed to calculate route');
          }
        },
      );
    },
    [onRouteCalculated],
  );

  useEffect(() => {
    if (currentLocation && !directions) {
      requestRoute(currentLocation);
    }
  }, [currentLocation, directions, requestRoute]);

  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: currentLocation,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#4caf50',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } else {
      markerRef.current.setPosition(currentLocation);
    }

    mapRef.current.panTo(currentLocation);
    mapRef.current.setZoom(zoom);
  }, [currentLocation, zoom]);

  useEffect(() => {
    if (!currentLocation || !directions || !window.google || isRerouting) return;

    const routePath = directions.routes[0].overview_path;
    const polyline = new window.google.maps.Polyline({
      path: routePath,
    });

    const threshold = 30;
    const isOnRoute = window.google.maps.geometry?.poly.isLocationOnEdge(
      new window.google.maps.LatLng(currentLocation),
      polyline,
      threshold,
    );

    if (isOnRoute === false) {
      setIsRerouting(true);
      requestRoute(currentLocation);
      setIsRerouting(false);
    }
  }, [currentLocation, directions, isRerouting, requestRoute]);

  if (!isLoaded) {
    return (
      <div className="map-shell loading">
        <p>Loading map…</p>
      </div>
    );
  }

  return (
    <section className="map-shell">
      {error && <div className="map-banner error">{error}</div>}
      {isRerouting && <div className="map-banner info">Recalculating route…</div>}

      <div className="aq-floating-card">
        <p className="aq-floating-label">Current Index</p>
        <p className="aq-floating-value">{MOCK_AQI}</p>
        <p className="aq-floating-sub">Air quality along your eco route</p>
        <button type="button" className="aq-floating-btn">
          Find a trip
        </button>
      </div>

      <div className="map-zoom-controls">
        <button type="button" onClick={() => setZoom((z) => Math.min(z + 1, 20))}>
          +
        </button>
        <button type="button" onClick={() => setZoom((z) => Math.max(z - 1, 3))}>
          −
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={currentLocation || destination}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: isDarkMode ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        }}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4caf50',
                strokeOpacity: 0.9,
                strokeWeight: 4,
                icons: [
                  {
                    icon: {
                      path: 'M 0,-1 0,1',
                      strokeOpacity: 1,
                      scale: 3,
                    },
                    offset: '0',
                    repeat: '12px',
                  },
                ],
              },
            }}
          />
        )}
      </GoogleMap>
    </section>
  );
};

export default NavigationMap;

