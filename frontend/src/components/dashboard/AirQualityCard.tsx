import React, { useEffect, useState } from 'react';

export type Metrics = {
  exposure_reduction_pct: number;
  pm25_avoided_ug: number;
  equivalent_minutes_avoided: number;
};

interface AirQualityCardProps {
  isDarkMode: boolean;
  metrics?: Metrics;
  destinationKey?: string | number; // unique key that changes when destination changes
}


const zeroMetrics: Metrics = {
  exposure_reduction_pct: 0,
  pm25_avoided_ug: 0,
  equivalent_minutes_avoided: 0
};

const AirQualityCard: React.FC<AirQualityCardProps> = ({ isDarkMode, metrics: metricsProp }) => {
  const metrics = metricsProp ?? zeroMetrics;
  const error: string | null = null;

  // Helper formatters
  const formatPct = (val?: number) =>
    typeof val === 'number' ? `${val.toFixed(1)}%` : '-- %';
  const formatPM25 = (val?: number) =>
    typeof val === 'number' ? `${val.toFixed(2)} µg less PM2.5` : '-- µg';
  const formatMinutes = (val?: number) =>
    typeof val === 'number'
      ? `Equivalent to ${val.toFixed(1)} minutes fewer on a high pollution route`
      : '-- minutes';
  // For now, set the weekly goal progress to 0 (to be implemented later)
  const progress = 0;

  return (
    <section className="dashboard-card aq-card">
      <div className="aq-left">
        <div className="aq-main">
          <div className="aq-kg">
            {formatPct(metrics?.exposure_reduction_pct)}
          </div>
          <p className="aq-subtitle">Exposure Reduced</p>
        </div>
        <p className="aq-description">
          {formatPM25(metrics?.pm25_avoided_ug)}
        </p>
        <p className="aq-description">
          {formatMinutes(metrics?.equivalent_minutes_avoided)}
        </p>
        {error && <p className="aq-description" style={{ color: 'red' }}>{error}</p>}
      </div>
      <div className="aq-right">
        <p className="aq-label">Weekly Goal</p>
        <p className="aq-percent">
          {formatPct(0)}
        </p>
        <div className="aq-progress">
          <div
            className="aq-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="aq-footnote">Progress towards your weekly clean air goal</p>
      </div>
    </section>
  );
};

export default AirQualityCard;

