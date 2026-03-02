import React from 'react';

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


/**
 * Default metrics used when no data is provided.
 */
const zeroMetrics: Metrics = {
  exposure_reduction_pct: 0,
  pm25_avoided_ug: 0,
  equivalent_minutes_avoided: 0
};

/**
 * AirQualityCard component
 * Displays air quality health metrics for the selected route.
 * All values are color-coded and formatted for clarity.
 *
 * Props:
 * - isDarkMode: boolean - Whether dark mode is enabled
 * - metrics: Metrics (optional) - Health metrics to display
 * - destinationKey: string | number (optional) - Unique key for destination changes
 */
const AirQualityCard: React.FC<AirQualityCardProps> = ({ isDarkMode, metrics: metricsProp }) => {
  // Use provided metrics or fallback to zeroMetrics
  const metrics = metricsProp ?? zeroMetrics;

  // Color theme for highlighted values
  const exposureColor = isDarkMode ? '#4fd1c5' : '#3182ce';

  /**
   * Format exposure reduction percentage
   */
  const formatPct = (val?: number) =>
    typeof val === 'number' ? `${val.toFixed(1)}%` : '-- %';

  /**
   * Format PM2.5 value, bold and colored
   */
  const formatPM25 = (val?: number) =>
    typeof val === 'number'
      ? <span style={{ fontWeight: 'bold', color: exposureColor }}>{val.toFixed(2)}</span>
      : <span style={{ color: exposureColor }}>--</span>;


  // Weekly goal progress (static for now)
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
          <span style={{ color: exposureColor }}>{formatPM25(metrics?.pm25_avoided_ug)}</span> <span>µg less PM2.5</span>
        </p>
        <p className="aq-description">
          <>Equivalent to <span style={{ fontWeight: 'bold', color: exposureColor }}>{typeof metrics?.equivalent_minutes_avoided === 'number' ? metrics.equivalent_minutes_avoided.toFixed(1) : '--'}</span> minutes fewer on a high pollution route</>
        </p>
        {/* Error display (reserved for future use) */}
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

