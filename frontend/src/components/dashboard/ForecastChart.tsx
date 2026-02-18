import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ForecastBar } from './dashboardData';

interface ForecastChartProps {
  isDarkMode: boolean;
  data?: ForecastBar[] | null;
}

const barColor = (level: 'low' | 'medium' | 'high') => {
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

export default ForecastChart;

