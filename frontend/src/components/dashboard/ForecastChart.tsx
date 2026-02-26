import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ForecastBar } from './dashboardData';

interface ForecastChartProps {
  isDarkMode: boolean;
  data?: ForecastBar[] | null;
}

// AQI color coding based on value
const getAqiColor = (aqi: number): string => {
  if (aqi <= 50) return '#166534';   // Rich Emerald (Good)
  if (aqi <= 100) return '#65a30d';  // Smooth Lime (Satisfactory)
  if (aqi <= 200) return '#f3dc13';  // Warm Amber (Moderate)
  if (aqi <= 300) return '#f97316';  // Deep Orange (Poor)
  if (aqi <= 400) return '#dc2626';  // Refined Red (Very Poor)
  return '#7f1d1d';   // Maroon - Severe
};

// Deprecated: kept for compatibility if needed
const barColor = (level: 'low' | 'medium' | 'high', value?: number) => {
  if (typeof value === 'number') return getAqiColor(value);
  if (level === 'low') return '#4caf50';
  if (level === 'medium') return '#ffeb3b';
  return '#ef9a9a';
};

const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const items = data ?? [];

  return (
    <section className="dashboard-card forecast-card">
      <header className="forecast-header">
        <div>
          <h2>Next 12 Hours Forecast</h2>
          <p className="muted">Predicted exposure for your current eco route.</p>
        </div>
        <div className="forecast-legend">
          <span className="dot dot-predicted" />
          <span>Predicted AQI</span>
          <span className="dot dot-threshold" />
          <span>Avg Threshold</span>
          <button type="button" className="badge-next">
            NEXT 12h ↗
          </button>
        </div>
      </header>

      <div className="forecast-chart-inner">
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={items} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="time" tickLine={false} axisLine={false} />
            <XAxis hide />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              isAnimationActive={false}
              fill="#4caf50"
            >
              {items.map((entry, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <Cell key={index} fill={barColor(entry.level)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

// ...existing code...

// Interactive forecast chart for multiple routes

// Interactive forecast chart for multiple routes (controlled by parent)
interface ForecastChartInteractiveProps {
  isDarkMode: boolean;
  forecastData?: Array<{ time: string; value: number; level: 'low' | 'medium' | 'high'; color: string }>;
  loading?: boolean;
  error?: string | null;
}

const ForecastChartInteractive: React.FC<ForecastChartInteractiveProps> = ({ isDarkMode, forecastData = [], loading = false, error = null }) => {

  return (
    <section className="dashboard-card forecast-card">
      <header className="forecast-header">
        <div>
          <h2>Next 12 Hours Forecast</h2>
          <p className="muted">Predicted exposure for your current eco route.</p>
        </div>
        <div className="forecast-legend">
          <span className="dot dot-predicted" />
          <span>Predicted AQI</span>
          <span className="dot dot-threshold" />
          <span>Avg Threshold</span>
          <button type="button" className="badge-next">
            NEXT 12h ↗
          </button>
        </div>
      </header>
      {/* Route selection is now controlled by parent; no buttons here. */}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <div className="forecast-chart-inner" style={{ minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={forecastData}
              margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                interval={0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  return (
                    <text
                      x={x}
                      y={y + 10}
                      textAnchor="end"
                      fontSize={13}
                      fill={isDarkMode ? '#fff' : '#222'}
                      transform={`rotate(-29,${x},${y + 2})`}
                    >
                      {payload.value}
                    </text>
                  );
                }}
                minTickGap={20}
                height={48}
                allowDataOverflow={false}
              />
              <Tooltip
                  cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                  contentStyle={{
                    background: isDarkMode ? '#1f2937' : '#ffffff',
                    borderRadius: 10,
                    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    fontSize: 13,
                    fontWeight: 500,
                    boxShadow: isDarkMode
                      ? '0 4px 16px rgba(0,0,0,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.10)',
                  }}
                  labelStyle={{
                    color: isDarkMode ? '#ffffff' : '#111827',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                  itemStyle={{
                    color: isDarkMode ? '#ffffff' : '#111827',
                    fontWeight: 500,
                  }}
                />
             <Bar
                dataKey="value"
                radius={[30, 30, 30, 30]}   // fully smooth rounded
                isAnimationActive={false}
                // animationDuration={1000}
                barSize={28}
                label={{
                  position: "top",
                  offset: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  fill: isDarkMode ? '#fff' : '#222',
                  formatter: (v: number) => (v ? Math.round(v) : "")
                }}
              >
                {forecastData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getAqiColor(entry.value)}
                    style={{
                      filter: "drop-shadow(0px 8px 18px rgba(0,0,0,0.12))",
                      transition: "all 0.3s ease"
                    }}
                  />
                ))}
              </Bar>
              {/* Fixed Y-axis for consistent scale */}
              <YAxis
                domain={[0, 400]}
                tick={{ fontSize: 12, fill: isDarkMode ? '#fff' : '#222' }}
                width={36}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export { ForecastChartInteractive };
export default ForecastChart;

