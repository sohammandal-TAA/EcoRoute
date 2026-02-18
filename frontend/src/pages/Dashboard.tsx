import React, { useEffect, useState, useCallback } from 'react';
import Topbar from '../components/dashboard/Topbar';
import NavigationMap from '../components/dashboard/NavigationMap';
import AlternativeRoutes from '../components/dashboard/AlternativeRoutes';
import AirQualityCard from '../components/dashboard/AirQualityCard';
import ForecastChart from '../components/dashboard/ForecastChart';
import SensorReadings from '../components/dashboard/SensorReadings';
import EcoProCard from '../components/dashboard/EcoProCard';
import type { ForecastBar, RouteOption, SensorData } from '../components/dashboard/dashboardData';
import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [userName, setUserName] = useState<string>('Guest');
  const [originCoords, setOriginCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<google.maps.LatLngLiteral | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [airQuality, setAirQuality] = useState<{
    aqiIndex?: number | null;
    kgSaved?: number | null;
    goalPercent?: number | null;
  } | null>(null);
  const [sensors, setSensors] = useState<SensorData | null>(null);
  const [forecast, setForecast] = useState<ForecastBar[] | null>(null);

  useEffect(() => {
    const storedName = window.localStorage.getItem('userName');
    if (storedName?.trim()) {
      setUserName(storedName);
    }
  }, []);

  // --- REAL-TIME BACKEND SYNC ---
  // This triggers every time the origin (user moving) OR destination (user searching) changes
  const fetchEcoData = useCallback(async (origin: google.maps.LatLngLiteral, dest: google.maps.LatLngLiteral) => {
    try {
      const response = await fetch('http://localhost:8080/api/routes/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sLat: origin.lat,
          sLon: origin.lng,
          dLat: dest.lat,
          dLon: dest.lng,
        }),
      });

      if (!response.ok) throw new Error('Backend error');
      const data = await response.json();

      // Flexible Data Hydration
      setRoutes(data.routes || data.routeOptions || []);

      const aq = data.airQuality ?? data.air_quality;
      if (aq) {
        setAirQuality({
          aqiIndex: aq.aqiIndex ?? aq.aqi_index ?? aq.currentAqi ?? null,
          kgSaved: aq.kgSaved ?? aq.kg_saved ?? null,
          goalPercent: aq.goalPercent ?? aq.goal_percent ?? null,
        });
      }

      const snsr = data.sensors ?? data.sensorData ?? data.sensor_data;
      if (snsr) {
        setSensors({
          humidity: snsr.humidity ?? null,
          temperature: snsr.temperature ?? null,
          windSpeed: snsr.windSpeed ?? snsr.wind_speed ?? null,
        });
      }

      setForecast(data.forecast || data.forecastBars || []);
    } catch (error) {
      console.error('Error fetching EcoRoute data:', error);
    }
  }, []);

  // Effect to watch for coordinate changes and trigger the backend
  useEffect(() => {
    if (!originCoords || !destinationCoords) return;

    const timeout = setTimeout(() => {
      fetchEcoData(originCoords, destinationCoords);
    }, 800); // throttle backend calls

    return () => clearTimeout(timeout);
  }, [originCoords, destinationCoords]);


  const handleSearchDestination = useCallback(async (
    placeIdOrQuery: string,
    description?: string
  ) => {
    if (!window.google?.maps) return;

    // 🔥 Clear old data when new search begins
    setRoutes([]);
    setAirQuality(null);
    setSensors(null);
    setForecast(null);
    setRouteInfo(null);

    // 🔥 If it looks like a place_id, use PlacesService
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

    // 🔥 Otherwise fallback to normal address search
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
      />

      <NavigationMap
        isDarkMode={isDarkMode}
        onRouteCalculated={setRouteInfo}
        destinationOverride={destinationCoords}
        onOriginChange={setOriginCoords} // Map updates Dashboard's originCoords in real-time
      />

      <main className="dashboard-content">
        <div className="dashboard-columns">
          <AlternativeRoutes
            isDarkMode={isDarkMode}
            routeInfo={routeInfo}
            routes={routes}
          />
          <div className="dashboard-right-col">
            <AirQualityCard isDarkMode={isDarkMode} data={airQuality} />
            <ForecastChart isDarkMode={isDarkMode} data={forecast} />
          </div>
        </div>

        <SensorReadings isDarkMode={isDarkMode} data={sensors} />
        <EcoProCard isDarkMode={isDarkMode} />
      </main>
    </div>
  );
};

export default Dashboard;