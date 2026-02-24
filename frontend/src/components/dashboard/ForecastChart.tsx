import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ForecastBar } from './dashboardData';

interface ForecastChartProps {
  isDarkMode: boolean;
  data?: ForecastBar[] | null;
}

// AQI color coding based on value
const getAqiColor = (aqi: number): string => {
  if (aqi <= 50) return '#007f2e'; // Deep Green - Good
  if (aqi <= 100) return '#7ed957'; // Green Light - Satisfactory
  if (aqi <= 200) return '#ffe600'; // Yellow - Moderate
  if (aqi <= 300) return '#ff9900'; // Orange - Poor
  if (aqi <= 400) return '#ff0000'; // Red - Very Poor
  return '#7e0023'; // Maroon - Severe
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
                minTickGap={8}
                height={48}
                allowDataOverflow={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                contentStyle={{
                  background: isDarkMode ? '#222' : '#fff',
                  color: isDarkMode ? '#fff' : '#222',
                  borderRadius: 8,
                  border: '1px solid #888',
                  fontSize: 13,
                  fontWeight: 500,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                }}
                labelStyle={{
                  color: isDarkMode ? '#fff' : '#222',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
                fill="#4caf50"
                label={{
                  position: 'top',
                  fill: isDarkMode ? '#fff' : '#222',
                  fontWeight: 600,
                  fontSize: 13,
                  formatter: (v: number) => (v != null ? Math.round(v) : ''),
                }}
                barSize={24}
                maxBarSize={28}
              >
                {forecastData.map((entry, index) => (
                  <Cell key={index} fill={getAqiColor(entry.value)} />
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

