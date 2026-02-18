import React from 'react';
import { DashboardRouteInfo, RouteOption } from './dashboardData';

interface AlternativeRoutesProps {
  isDarkMode: boolean;
  routeInfo: DashboardRouteInfo | null;
  routes?: RouteOption[];
}

const AlternativeRoutes: React.FC<AlternativeRoutesProps> = ({ routeInfo, routes = [] }) => {
  const badgeColor = (level: 'low' | 'medium' | 'high') => {
    if (level === 'low') return 'badge-low';
    if (level === 'medium') return 'badge-medium';
    return 'badge-high';
  };

  const durationSuffix = routeInfo ? routeInfo.duration : undefined;

  return (
    <section className="dashboard-card routes-card">
      <header className="routes-header">
        <div>
          <h2>Alternative Routes</h2>
          <p className="muted">
            Choose the cleanest way to your destination, powered by live AQI.
          </p>
        </div>
        <span className="eco-pill">Eco</span>
      </header>

      <div className="routes-list">
        {routes.map((route) => (
          <article key={route.id} className="route-item">
            <div className={`route-label ${badgeColor(route.pollutionLevel)}`}>{route.label}</div>
            <div className="route-main">
              <div>
                <p className="route-name">{route.name}</p>
                <p className="route-meta">
                  <span>● {durationSuffix ?? route.duration} min</span>
                  <span>● {route.distance}</span>
                  {route.pollutionLevel === 'low' && <span>🌿 Eco</span>}
                </p>
              </div>
              <div className={`route-score ${badgeColor(route.pollutionLevel)}`}>
                {route.duration}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AlternativeRoutes;

