import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const DEFAULT_DESTINATION = {
  lat: 23.5441,
  lng: 87.3025,
};

const libraries: ("geometry")[] = ["geometry"];

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

  const [currentLocation, setCurrentLocation] =
    useState<google.maps.LatLngLiteral | null>(null);

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const [zoom, setZoom] = useState(15);

  // ---------------------------
  // GEOLOCATION (optimized)
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
  }, []);

  // ---------------------------
  // REQUEST ROUTE
  // ---------------------------
  const requestRoute = useCallback(
    (origin: google.maps.LatLngLiteral) => {
      if (!window.google) return;

      const service = new window.google.maps.DirectionsService();
      const destination = destinationOverride || DEFAULT_DESTINATION;

      service.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
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
    [destinationOverride, onRouteCalculated]
  );

  // 🔥 Recalculate route when destination changes
  useEffect(() => {
    if (currentLocation) {
      requestRoute(currentLocation);
    }
  }, [currentLocation, destinationOverride]);

  // ---------------------------
  // MARKER (no re-render spam)
  // ---------------------------
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !window.google) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: currentLocation,
        map: mapRef.current,
      });
    } else {
      markerRef.current.setPosition(currentLocation);
    }

    // 🔥 Only pan, don't force zoom every time
    mapRef.current.panTo(currentLocation);
  }, [currentLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const mapCenter = currentLocation || destinationOverride || DEFAULT_DESTINATION;

  if (!isLoaded) return <p>Loading Map...</p>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
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
          directions={directions}
          options={{ suppressMarkers: true }}
        />
      )}
    </GoogleMap>
  );
};

export default React.memo(NavigationMap);
