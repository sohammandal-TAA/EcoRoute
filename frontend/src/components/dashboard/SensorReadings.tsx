import React from 'react';
import { MOCK_SENSORS } from './dashboardData';

interface SensorReadingsProps {
  isDarkMode: boolean;
}

const SensorReadings: React.FC<SensorReadingsProps> = () => {
  return (
    <section className="sensor-section">
      <p className="sensor-header">── REAL TIME SENSORS ──</p>
      <ul className="sensor-list">
        <li>
          <div className="sensor-icon humidity">💧</div>
          <span className="sensor-label">Humidity</span>
          <span className="sensor-value">{MOCK_SENSORS.humidity}%</span>
        </li>
        <li>
          <div className="sensor-icon temperature">🌡</div>
          <span className="sensor-label">Temperature</span>
          <span className="sensor-value">{MOCK_SENSORS.temperature}°</span>
        </li>
        <li>
          <div className="sensor-icon wind">💨</div>
          <span className="sensor-label">Wind Speed</span>
          <span className="sensor-value">{MOCK_SENSORS.windSpeed}km/h</span>
        </li>
      </ul>
    </section>
  );
};

export default SensorReadings;

