import React, { useState } from 'react';
import Topbar from '../components/dashboard/Topbar';
import NavigationMap from '../components/dashboard/NavigationMap';
import AlternativeRoutes from '../components/dashboard/AlternativeRoutes';
import AirQualityCard from '../components/dashboard/AirQualityCard';
import ForecastChart from '../components/dashboard/ForecastChart';
import SensorReadings from '../components/dashboard/SensorReadings';
import EcoProCard from '../components/dashboard/EcoProCard';
import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  return (
    <div className={`dashboard ${isDarkMode ? 'dark' : 'light'}`}>
      <Topbar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prev) => !prev)} />

      <NavigationMap
        isDarkMode={isDarkMode}
        onRouteCalculated={(info) => setRouteInfo(info)}
      />

      <main className="dashboard-content">
        <div className="dashboard-columns">
          <AlternativeRoutes isDarkMode={isDarkMode} routeInfo={routeInfo} />
          <div className="dashboard-right-col">
            <AirQualityCard isDarkMode={isDarkMode} />
            <ForecastChart isDarkMode={isDarkMode} />
          </div>
        </div>

        <SensorReadings isDarkMode={isDarkMode} />
        <EcoProCard isDarkMode={isDarkMode} />
      </main>
    </div>
  );
};

export default Dashboard;

