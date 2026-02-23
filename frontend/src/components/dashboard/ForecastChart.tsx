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

// ...existing code...

// Interactive forecast chart for multiple routes
import { useEffect, useState } from 'react';

interface PredictResponse {
  route_forecasts: {
    [route: string]: {
      forecast: Array<{
        time: string;
        aqi: number;
        health_info: {
          category: string;
          color: string;
        };
      }>;
    };
  };
}

const ForecastChartInteractive: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [routes, setRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [routeForecasts, setRouteForecasts] = useState<PredictResponse['route_forecasts']>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/routes/predict')
      .then((res) => res.json())
      .then((data: PredictResponse) => {
        const routeNames = Object.keys(data.route_forecasts);
        setRoutes(routeNames);
        setRouteForecasts(data.route_forecasts);
        setSelectedRoute(routeNames[0] || '');
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load forecasts');
        setLoading(false);
      });
  }, []);

  const forecastData: Array<{ time: string; value: number; level: 'low' | 'medium' | 'high'; color: string }> =
    selectedRoute && routeForecasts[selectedRoute]?.forecast
      ? routeForecasts[selectedRoute].forecast.map(f => ({
        time: f.time,
        value: f.aqi,
        level: (f.health_info.category === 'Satisfactory'
          ? 'low'
          : f.health_info.category === 'Moderate'
            ? 'medium'
            : 'high') as 'low' | 'medium' | 'high',
        color: f.health_info.color,
      }))
      : [];

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
      <div style={{ marginBottom: 16 }}>
        {routes.map(route => (
          <button
            key={route}
            className={`route-select-btn${selectedRoute === route ? ' active' : ''}`}
            style={{ marginRight: 8, padding: '4px 12px', borderRadius: 6, border: '1px solid #ccc', background: selectedRoute === route ? '#e0e0e0' : '#fff', fontWeight: selectedRoute === route ? 'bold' : 'normal' }}
            onClick={() => setSelectedRoute(route)}
          >
            {route.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : (
        <div className="forecast-chart-inner">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                {forecastData.map((entry, index) => (
                  <Cell key={index} fill={entry.color || barColor(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export { ForecastChartInteractive };
export default ForecastChart;

