import React from 'react';
import { SensorData } from './dashboardData';

interface SensorReadingsProps {
  isDarkMode: boolean;
  data?: SensorData | null;
}

const SensorReadings: React.FC<SensorReadingsProps> = ({ data }) => {
  return (
    <section className="sensor-section">
      <p className="sensor-header">── REAL TIME SENSORS ──</p>
      <ul className="sensor-list">
        <li>
          <div className="sensor-icon humidity">💧</div>
          <span className="sensor-label">Humidity</span>
          <span className="sensor-value">
            {data?.humidity != null ? `${data.humidity}%` : '—'}
          </span>
        </li>
        <li>
          <div className="sensor-icon temperature">🌡</div>
          <span className="sensor-label">Temperature</span>
          <span className="sensor-value">
            {data?.temperature != null ? `${data.temperature}°` : '—'}
          </span>
        </li>
        <li>
          <div className="sensor-icon wind">💨</div>
          <span className="sensor-label">Wind Speed</span>
          <span className="sensor-value">
            {data?.windSpeed != null ? `${data.windSpeed}km/h` : '—'}
          </span>
        </li>
      </ul>
    </section>
  );
};

export default SensorReadings;

