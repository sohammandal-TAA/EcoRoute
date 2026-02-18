import React from 'react';

interface AirQualitySnapshot {
  /** e.g. overall AQI along the selected route */
  aqiIndex?: number | null;
  /** e.g. kilograms of pollutants avoided */
  kgSaved?: number | null;
  /** e.g. progress towards weekly goal, 0–100 */
  goalPercent?: number | null;
}

interface AirQualityCardProps {
  isDarkMode: boolean;
  data?: AirQualitySnapshot | null;
}

const AirQualityCard: React.FC<AirQualityCardProps> = ({ data }) => {
  const kgSaved = data?.kgSaved ?? null;
  const goalPercent = data?.goalPercent ?? null;
  const aqiIndex = data?.aqiIndex ?? null;

  return (
    <section className="dashboard-card aq-card">
      <div className="aq-left">
        <div className="aq-tag">no CO₂ gained</div>
        <div className="aq-main">
          <div className="aq-kg">
            {kgSaved != null ? kgSaved : '—'}
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
        <p className="aq-percent">
          {goalPercent != null ? `${goalPercent}%` : '—'}
        </p>
        <div className="aq-progress">
          <div className="aq-progress-fill" />
        </div>
        <p className="aq-footnote">Towards your weekly clean air goal</p>
        {aqiIndex != null && (
          <p className="aq-index">Route index: {aqiIndex}</p>
        )}
      </div>
    </section>
  );
};

export default AirQualityCard;

