import React from 'react';
import { MOCK_AQI, MOCK_KG_SAVED, MOCK_PERCENT } from './dashboardData';

interface AirQualityCardProps {
  isDarkMode: boolean;
}

const AirQualityCard: React.FC<AirQualityCardProps> = () => {
  return (
    <section className="dashboard-card aq-card">
      <div className="aq-left">
        <div className="aq-tag">no CO₂ gained</div>
        <div className="aq-main">
          <div className="aq-kg">
            {MOCK_KG_SAVED}
            <span>kg</span>
          </div>
          <p className="aq-subtitle">Reduced inhalation</p>
        </div>
        <p className="aq-description">
          By choosing cleaner routes, you avoided significant pollutants this month.
        </p>
      </div>
      <div className="aq-right">
        <p className="aq-label">Current level</p>
        <p className="aq-percent">{MOCK_PERCENT}%</p>
        <div className="aq-progress">
          <div className="aq-progress-fill" />
        </div>
        <p className="aq-footnote">Towards your weekly clean air goal</p>
        <p className="aq-index">Route index: {MOCK_AQI}</p>
      </div>
    </section>
  );
};

export default AirQualityCard;

