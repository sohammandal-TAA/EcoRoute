import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/dashboard/Topbar';
import NavigationMap from '../components/dashboard/NavigationMap';
import AlternativeRoutes from '../components/dashboard/AlternativeRoutes';
import AirQualityCard from '../components/dashboard/AirQualityCard';
import { ForecastChartInteractive } from '../components/dashboard/ForecastChart';
import SensorReadings from '../components/dashboard/SensorReadings';
import EcoProCard from '../components/dashboard/EcoProCard';
import type { ForecastBar, RouteOption, SensorData } from '../components/dashboard/dashboardData';
import '../styles/dashboard.css';


/**
 * Dashboard main component for EcoRoute.ai
 * Handles route search, backend sync, and dashboard widget state.
 */

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [userName, setUserName] = useState<string>('Guest');
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [originCoords, setOriginCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [airQuality, setAirQuality] = useState<{
    aqiIndex?: number | null;
    kgSaved?: number | null;
    goalPercent?: number | null;
  } | null>(null);
  const [routeSensorData, setRouteSensorData] = useState<any[]>([]);
  const [aqiMarkers, setAqiMarkers] = useState<{ location: [number, number]; aqi: number }[]>([]);
  const [recommendedRouteName, setRecommendedRouteName] = useState<string | null>(null);
  const [allRouteForecasts, setAllRouteForecasts] = useState<any>({});
  const [forecastLoading, setForecastLoading] = useState(false);
  const [routeQualities, setRouteQualities] = useState<Record<string, 'best' | 'moderate' | 'poor'>>({});


  /**
   * Loads user name from localStorage on mount.
   */
  useEffect(() => {
    const storedName = window.localStorage.getItem('userName');
    if (storedName?.trim()) {
      setUserName(storedName);
    }
  }, []);

  // --- REAL-TIME BACKEND SYNC ---
  // This triggers every time the origin (user moving) OR destination (user searching) changes
  // const fetchEcoData = useCallback(async (origin: google.maps.LatLngLiteral, dest: google.maps.LatLngLiteral) => { ... }, []);


  /**
   * Fetches route geometry and pollution data, then triggers forecast fetch.
   * @param origin - Origin coordinates
   * @param dest - Destination coordinates
   */
  const fetchRawRouteMarkers = useCallback(async (origin: google.maps.LatLngLiteral, dest: google.maps.LatLngLiteral) => {
    try {
      setForecastLoading(true); // Start loading forecast
      setAllRouteForecasts({}); // Clear previous forecast
      const params = new URLSearchParams({
        sLat: origin.lat.toString(),
        sLon: origin.lng.toString(),
        dLat: dest.lat.toString(),
        dLon: dest.lng.toString(),
      });
      // Fetch route coordinates for display
      const response = await fetch(`http://localhost:8080/api/routes/raw?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch route geometry');
      const data = await response.json();
      let backendRoutes: any[] = [];
      if (Array.isArray(data.routes)) {
        backendRoutes = data.routes.map((route: any, idx: number) => ({
          id: `Route_${idx + 1}`,
          name: `Route_${idx + 1}`,
          duration: route.duration,
          distance: route.distance,
          pollutionLevel: 'medium',
          label: `Route_${idx + 1}`,
          path: route.coordinates,
          avgExposureAqi: null,
        }));
      }
      setRoutes(backendRoutes);
      // Always deselect route after new destination so user must select
      setSelectedRoute(null);
      setRecommendedRouteName(null);
      setRouteQualities({}); // Reset route qualities so cards show UNKNOWN until backend responds

      // Fetch pollution/process data
      const processResp = await fetch('http://localhost:8080/api/routes/process', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sLat: origin.lat,
          sLon: origin.lng,
          dLat: dest.lat,
          dLon: dest.lng,
        }),
      });
      if (processResp.ok) {
        const processData = await processResp.json();
        if (processData.recommended) {
          setRecommendedRouteName(processData.recommended);
        }
        // Extract route qualities (best/moderate/poor) from processData
        const qualities: Record<string, 'best' | 'moderate' | 'poor'> = {};
        Object.entries(processData).forEach(([key, value]) => {
          if (/^Route_\d+$/.test(key) && (value === 'best' || value === 'moderate' || value === 'poor')) {
            qualities[key] = value;
          }
        });
        setRouteQualities(qualities);
        if (processData.route_analysis && typeof processData.route_analysis === 'object') {
          const sensorsArr = Object.keys(processData.route_analysis).map((key) => processData.route_analysis[key]);
          setRouteSensorData(sensorsArr);
          const allMarkers: { location: [number, number]; aqi: number }[] = [];
          Object.values(processData.route_analysis).forEach((route: any) => {
            if (Array.isArray(route.details)) {
              route.details.forEach((d: any) => {
                if (Array.isArray(d.location) && typeof d.aqi === 'number') {
                  allMarkers.push({ location: d.location, aqi: d.aqi });
                }
              });
            }
          });
          setAqiMarkers(allMarkers);
        } else {
          setRouteSensorData([]);
          setAqiMarkers([]);
        }
        // Fetch forecast after process
        try {
          const predictResp = await fetch('/api/routes/predict', { credentials: 'include' });
          if (predictResp.ok) {
            const predictData = await predictResp.json();
            setAllRouteForecasts(predictData.route_forecasts || {});
          } else {
            setAllRouteForecasts({});
          }
        } catch (e) {
          setAllRouteForecasts({});
        }
        setForecastLoading(false); // Stop loading forecast
      } else {
        setRouteSensorData([]);
        setAqiMarkers([]);
        setAllRouteForecasts({});
      }
    } catch (error) {
      console.error('Error fetching raw route/process data:', error);
      setRouteSensorData([]);
    }
  }, []);


  /**
   * Triggers backend sync when origin or destination changes.
   */
  useEffect(() => {
    if (!originCoords || !destinationCoords) return;
    const timeout = setTimeout(() => {
      fetchRawRouteMarkers(originCoords, destinationCoords);
    }, 800); // throttle backend calls
    return () => clearTimeout(timeout);
  }, [originCoords, destinationCoords, fetchRawRouteMarkers]);


  /**
   * Handles logo click to redirect to landing page.
   */
  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);


  /**
   * Handles destination search and sets destination coordinates.
   * @param placeIdOrQuery - Place ID or address string
   * @param description - Optional description
   */
  const handleSearchDestination = useCallback(async (
    placeIdOrQuery: string,
    description?: string
  ) => {
    if (!window.google?.maps) return;

    // Clear old data when new search begins
    setRoutes([]);
    setAirQuality(null);
    setRouteInfo(null);

    // If it looks like a place_id, use PlacesService
    if (placeIdOrQuery.startsWith("ChIJ") && window.google.maps.places) {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.getDetails(
        { placeId: placeIdOrQuery },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place?.geometry?.location
          ) {
            const loc = place.geometry.location;
            setDestinationCoords({
              lat: loc.lat(),
              lng: loc.lng(),
            });
          } else {
            console.error("Place details failed:", status);
          }
        }
      );
      return;
    }

    // Otherwise fallback to normal address search
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: placeIdOrQuery }, (results, status) => {
      if (status === "OK" && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        setDestinationCoords({
          lat: loc.lat(),
          lng: loc.lng(),
        });
      } else {
        console.error("Failed to geocode destination", status);
      }
    });
  }, []);


  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : 'light'}`}>
      <Topbar
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        userName={userName}
        onSearchDestination={handleSearchDestination}
        onLogoClick={handleLogoClick}
      />

      <NavigationMap
        isDarkMode={isDarkMode}
        onRouteCalculated={setRouteInfo}
        destinationOverride={destinationCoords}
        onOriginChange={setOriginCoords} // Map updates Dashboard's originCoords in real-time
        backendRoutes={routes}
        selectedRouteIndex={selectedRoute}
        onRouteSelect={setSelectedRoute}
        aqiMarkers={(() => {
          // Only show AQI markers for the selected route
          if (selectedRoute != null && Array.isArray(routeSensorData) && routeSensorData[selectedRoute] && Array.isArray(routeSensorData[selectedRoute].details)) {
            return routeSensorData[selectedRoute].details
              .filter((d: any) => Array.isArray(d.location) && typeof d.aqi === 'number')
              .map((d: any) => ({
                location: d.location,
                aqi: d.aqi
              }));
          }
          // If no route is selected, show no AQI markers
          return [];
        })()}
      />

      <main className="dashboard-content">
        <div className="dashboard-columns">
          <AlternativeRoutes
            isDarkMode={isDarkMode}
            routeInfo={routeInfo}
            routes={routes}
            selectedRouteIndex={selectedRoute}
            onRouteSelect={setSelectedRoute}
            recommendedRouteName={recommendedRouteName}
            routeQualities={routeQualities}
          />
          <div className="dashboard-right-col">
            <AirQualityCard isDarkMode={isDarkMode} data={airQuality} />
            <ForecastChartInteractive
              isDarkMode={isDarkMode}
              loading={forecastLoading}
              forecastData={(() => {
                if (
                  selectedRoute != null &&
                  Array.isArray(routes) &&
                  routes[selectedRoute] &&
                  allRouteForecasts &&
                  allRouteForecasts[routes[selectedRoute].name] &&
                  Array.isArray(allRouteForecasts[routes[selectedRoute].name].forecast)
                ) {
                  return allRouteForecasts[routes[selectedRoute].name].forecast.map((f: any) => ({
                    time: f.time,
                    value: f.aqi,
                    level:
                      f.health_info.category === 'Satisfactory'
                        ? 'low'
                        : f.health_info.category === 'Moderate'
                          ? 'medium'
                          : 'high',
                    color: f.health_info.color,
                  }));
                }
                return [];
              })()}
            />
          </div>
        </div>

        <SensorReadings
          isDarkMode={isDarkMode}
          data={(() => {
            if (selectedRoute != null && routeSensorData[selectedRoute]) {
              const r = routeSensorData[selectedRoute];
              // Only pass summary stats, not details, and fill required fields
              return {
                pm25: r?.avg_pm25 ?? null,
                pm10: r?.avg_pm10 ?? null,
                co: r?.avg_co ?? null,
                humidity: 0,
                temperature: 0,
                windSpeed: 0,
              };
            }
            return null;
          })()}
        />
        <EcoProCard isDarkMode={isDarkMode} />
      </main>
    </div>
  );
};

export default Dashboard;