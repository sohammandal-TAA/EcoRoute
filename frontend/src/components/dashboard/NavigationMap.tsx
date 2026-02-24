// AQI color coding based on value (same as forecast bar graph)
const getAqiColor = (aqi: number): string => {
  if (aqi <= 50) return '#007f2e'; // Deep Green - Good
  if (aqi <= 100) return '#7ed957'; // Green Light - Satisfactory
  if (aqi <= 200) return '#ffe600'; // Yellow - Moderate
  if (aqi <= 300) return '#ff9900'; // Orange - Poor
  if (aqi <= 400) return '#ff0000'; // Red - Very Poor
  return '#7e0023'; // Maroon - Severe
};
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  OverlayView,
} from '@react-google-maps/api';

interface AQIMarker {
  location: [number, number]; // [lat, lng]
  aqi: number;
  pm25?: number;
  pm10?: number;
}

interface NavigationMapProps {
  isDarkMode: boolean;
  onRouteCalculated: (info: { distance: string; duration: string }) => void;
  destinationOverride?: google.maps.LatLngLiteral | null;
  onOriginChange?: (origin: google.maps.LatLngLiteral) => void;
  // optional backend-provided alternate routes — flexible shape
  backendRoutes?: any[];
  selectedRouteIndex?: number | null;
  onRouteSelect?: (index: number | null) => void;
  aqiMarkers?: AQIMarker[];
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
  backendRoutes,
  selectedRouteIndex: externalSelectedIndex,
  onRouteSelect,
  aqiMarkers = [],
}) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "geometry"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const requestIdRef = useRef<number>(0);

  const [currentLocation, setCurrentLocation] =
    useState<google.maps.LatLngLiteral | null>(null);

  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const polyRequestIdRef = useRef<number>(0);
  const distancesRef = useRef<number[]>([]);
  const [selectedPolyIndex, setSelectedPolyIndex] = useState<number | null>(null);

  // Sync external selection → internal polyline highlight
  useEffect(() => {
    if (externalSelectedIndex !== undefined) {
      setSelectedPolyIndex(externalSelectedIndex ?? null);
    }
  }, [externalSelectedIndex]);

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
  // Do not use frontend Google Maps Directions API for route calculation.
  // Only display routes using backend coordinates from /api/routes/raw.

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

  // Render backend alternative routes (if provided) as polylines (for /api/routes/raw)
  useEffect(() => {
    // clear previous polylines and listeners
    polylinesRef.current.forEach((p) => {
      try {
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.clearInstanceListeners(p);
        }
      } catch (e) { }
      p.setMap(null);
    });
    polylinesRef.current = [];

    if (!mapRef.current || !window.google || !Array.isArray(backendRoutes)) return;

    // Collect all coordinates for bounds calculation
    let allCoords: google.maps.LatLngLiteral[] = [];
    backendRoutes.forEach((r: any, idx: number) => {
      const pathArr: any[] = r.path || r.cleaned || r.coordinates || r.coords || [];
      if (!Array.isArray(pathArr) || pathArr.length === 0) return;
      const coords = pathArr.map((pt: any) => {
        if (pt.lat !== undefined && pt.lng !== undefined) return { lat: Number(pt.lat), lng: Number(pt.lng) };
        if (pt[0] !== undefined && pt[1] !== undefined) return { lat: Number(pt[0]), lng: Number(pt[1]) };
        return null;
      }).filter(Boolean) as google.maps.LatLngLiteral[];
      if (coords.length === 0) return;

      allCoords = allCoords.concat(coords);

      // Always create with light blue (unselected) style
      const poly = new window.google.maps.Polyline({
        path: coords,
        strokeColor: '#8AB4F8',
        strokeOpacity: 0.7,
        strokeWeight: 4,
        zIndex: 5 + idx,
      });
      poly.setMap(mapRef.current);
      polylinesRef.current.push(poly as any);

      // Add click/tap event to select this route
      poly.addListener('click', () => {
        setSelectedPolyIndex(idx);
        onRouteSelect?.(idx);
      });
    });

    // Zoom out to fit all routes, mimicking Google Maps
    if (allCoords.length > 0 && mapRef.current && window.google && window.google.maps.LatLngBounds) {
      const bounds = new window.google.maps.LatLngBounds();
      allCoords.forEach((coord) => bounds.extend(coord));
      mapRef.current.fitBounds(bounds, 40); // 60px padding for nice view
    }
  }, [backendRoutes, onRouteSelect]);

  // Only set selected route index to 0 if backendRoutes change and there is no selection
  // Do not auto-select any route by default; user must click to select
  useEffect(() => {
    setSelectedPolyIndex(null);
  }, [backendRoutes]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // When map remounts, re-attach existing markers immediately
    if (markerRef.current) markerRef.current.setMap(map);
    if (destinationMarkerRef.current) destinationMarkerRef.current.setMap(map);
  }, []);

  // Update polyline styles when selection changes and move map to selected route
  useEffect(() => {
    if (!window.google || !Array.isArray(backendRoutes)) return;
    polylinesRef.current.forEach((poly, idx) => {
      if (!poly) return;
      if (selectedPolyIndex === idx) {
        poly.setOptions({
          strokeColor: '#1A73E8',
          strokeWeight: 6,
          strokeOpacity: 0.95,
          zIndex: 100,
        });
        // Move map to fit this route
        const r = backendRoutes[idx];
        const pathArr = r.path || r.cleaned || r.coordinates || r.coords || [];
        const coords = pathArr.map((pt: any) => {
          if (pt.lat !== undefined && pt.lng !== undefined) return { lat: Number(pt.lat), lng: Number(pt.lng) };
          if (pt[0] !== undefined && pt[1] !== undefined) return { lat: Number(pt[0]), lng: Number(pt[1]) };
          return null;
        }).filter(Boolean);
        if (coords.length > 0 && mapRef.current && window.google && window.google.maps.LatLngBounds) {
          const bounds = new window.google.maps.LatLngBounds();
          coords.forEach((coord: any) => bounds.extend(coord));
          mapRef.current.fitBounds(bounds, 60);
        }
      } else {
        poly.setOptions({
          strokeColor: '#8AB4F8',
          strokeWeight: 4,
          strokeOpacity: 0.7,
          zIndex: 5 + idx,
        });
      }
    });
  }, [selectedPolyIndex, backendRoutes]);

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
        {/* Render AQI markers if provided */}
        {/* Render AQI markers using OverlayView for correct placement */}
        {Array.isArray(aqiMarkers) && aqiMarkers.map((marker: AQIMarker, idx: number) => (
          <OverlayView
            key={`aqi-marker-${idx}`}
            position={{ lat: marker.location[0], lng: marker.location[1] }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                border: `2px solid ${getAqiColor(marker.aqi)}`,
                borderRadius: '8px',
                padding: '4px 8px',
                fontWeight: 600,
                color: '#1A1A1A',
                fontSize: '13px',
                boxShadow: `0 2px 8px ${getAqiColor(marker.aqi)}22`,
                minWidth: '54px',
                textAlign: 'center',
                pointerEvents: 'auto',
                lineHeight: 1.3,
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#000000', marginBottom: 1 }}>
                AQI: <span style={{ color: '#000000' }}>{marker.aqi}</span>
              </div>
            </div>
          </OverlayView>
        ))}
      </GoogleMap>
      <button
        onClick={handleResetPosition}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '80px',
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