import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from '@react-google-maps/api';

interface NavigationMapProps {
  isDarkMode: boolean;
  onRouteCalculated: (info: { distance: string; duration: string }) => void;
  destinationOverride?: google.maps.LatLngLiteral | null;
  onOriginChange?: (origin: google.maps.LatLngLiteral) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const NavigationMap: React.FC<NavigationMapProps> = ({
  isDarkMode,
  onRouteCalculated,
  destinationOverride,
  onOriginChange,
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const requestIdRef = useRef<number>(0);

  const [currentLocation, setCurrentLocation] =
    useState<google.maps.LatLngLiteral | null>(null);

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const [zoom, setZoom] = useState(15);

  // ---------------------------
  // GEOLOCATION
  // ---------------------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCurrentLocation(next);
        onOriginChange?.(next);
      },
      console.error,
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [onOriginChange]);

  // ---------------------------
  // REQUEST ROUTE
  // ---------------------------
  const requestRoute = useCallback(
    (origin: google.maps.LatLngLiteral, destinationOverride: google.maps.LatLngLiteral | null | undefined) => {
      if (!window.google || !destinationOverride) return;

      const currentRequestId = ++requestIdRef.current;
      const service = new window.google.maps.DirectionsService();

      service.route(
        {
          origin,
          destination: destinationOverride,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result && currentRequestId === requestIdRef.current) {
            setDirections(result);

            const leg = result.routes[0].legs[0];
            onRouteCalculated({
              distance: leg.distance?.text || "",
              duration: leg.duration?.text || "",
            });
          }
        }
      );
    },
    [onRouteCalculated]
  );

  useEffect(() => {
    if (!currentLocation || !destinationOverride) return;
    setDirections(null);
    requestRoute(currentLocation, destinationOverride);
  }, [currentLocation, destinationOverride, requestRoute]);

  // ---------------------------
  // USER BLUE DOT MARKER
  // ---------------------------
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !window.google) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: currentLocation,
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
        zIndex: 999,
      });
    } else {
      markerRef.current.setPosition(currentLocation);
      // Ensure marker is attached to the current map instance
      markerRef.current.setMap(mapRef.current);
    }

    mapRef.current.panTo(currentLocation);
  }, [currentLocation]);

  // ---------------------------
  // DESTINATION RED MARKER
  // ---------------------------
  useEffect(() => {
    if (!mapRef.current || !destinationOverride || !window.google) return;

    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = new window.google.maps.Marker({
        position: destinationOverride,
        map: mapRef.current,
      });
    } else {
      destinationMarkerRef.current.setPosition(destinationOverride);
      // Ensure marker is attached to the current map instance
      destinationMarkerRef.current.setMap(mapRef.current);
    }
  }, [destinationOverride]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // When map remounts, re-attach existing markers immediately
    if (markerRef.current) markerRef.current.setMap(map);
    if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(map);
  }, []);

  const handleResetPosition = useCallback(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.panTo(currentLocation);
      mapRef.current.setZoom(15);
    }
  }, [currentLocation]);

  if (!isLoaded || !currentLocation) {
    return <p>Loading Map...</p>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <GoogleMap
        key={destinationOverride ? `${destinationOverride.lat}-${destinationOverride.lng}` : 'no-dest'}
        mapContainerStyle={mapContainerStyle}
        center={currentLocation}
        zoom={zoom}
        onLoad={onLoad}
        options={{
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {directions && (
          <DirectionsRenderer
            key={`dir-${destinationOverride?.lat}-${destinationOverride?.lng}`}
            directions={directions}
            options={{ suppressMarkers: true }}
          />
        )}
      </GoogleMap>
      <button
        onClick={handleResetPosition}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: '#4285F4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        📍 My Location
      </button>
    </div>
  );
};

export default NavigationMap;