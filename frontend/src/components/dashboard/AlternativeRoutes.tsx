import React from 'react';
import { DashboardRouteInfo, RouteOption } from './dashboardData';


interface AlternativeRoutesProps {
  isDarkMode: boolean;
  routeInfo: DashboardRouteInfo | null;
  routes?: RouteOption[];
  selectedRouteIndex?: number | null;
  onRouteSelect?: (index: number | null) => void;
  recommendedRouteName?: string | null;
  routeQualities?: Record<string, 'best' | 'moderate' | 'poor'>;
}



const QUALITY_LABELS: Record<'best' | 'moderate' | 'poor' | 'unknown', string> = {
  best: 'BEST',
  moderate: 'MODERATE',
  poor: 'POOR',
  unknown: 'UNKNOWN',
};

const AlternativeRoutes: React.FC<AlternativeRoutesProps> = ({
  isDarkMode,
  routes = [],
  selectedRouteIndex = null,
  onRouteSelect,
  recommendedRouteName = null,
  routeQualities = {},
}) => {

  const getAqiLevel = (aqi?: number) => {
    if (aqi == null) return 'medium';
    if (aqi <= 50) return 'low';
    if (aqi <= 100) return 'medium';
    return 'high';
  };


  return (
    <section className="dashboard-card routes-card" style={{ background: 'var(--bg-surface)' }}>
      <header className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-[color:var(--text-primary)]">Alternative Routes</h2>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--bg-surface-2)', color: 'var(--text-primary)', opacity: 0.7 }}>
          {routes.length} Found
        </span>
      </header>
      <div className="flex flex-col gap-4">

        {routes.map((route, idx) => {
          const isSelected = selectedRouteIndex === idx;
          const aqi = route.avgExposureAqi ?? undefined;
          // If backend hasn't sent a label, show 'unknown' (gray)
          const quality: 'best' | 'moderate' | 'poor' | 'unknown' = routeQualities[route.name] || 'unknown';
          const isBest = quality === 'best';
          return (
            <article
              key={route.id}
              className={`flex flex-row gap-4 transition-all cursor-pointer p-5 rounded-2xl
                border
                ${isSelected
                  ? 'border-2 border-[var(--accent-bright)] bg-[var(--bg-surface-2)]'
                  : isDarkMode
                    ? 'border-[var(--border-subtle)] bg-[#00000050] shadow-[0_2px_8px_rgba(0,0,0,0.25)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}
              `}
              onClick={() => onRouteSelect?.(isSelected ? null : idx)}
              style={{ boxShadow: isSelected ? '0 2px 12px rgba(45, 122, 58, 0.08)' : undefined }}
            >
              {/* Left Column */}
              <div className="flex flex-col flex-1 justify-between">
                {/* Top Label */}
                <span
                  className={`uppercase tracking-wider text-xs font-bold mb-2 ${quality === 'best' ? 'text-green-700 bg-green-100' : quality === 'moderate' ? 'text-orange-700 bg-orange-100' : quality === 'poor' ? 'text-red-700 bg-red-100' : 'text-gray-600 bg-gray-200'}`}
                  style={{ letterSpacing: '0.08em', padding: '2px 12px', borderRadius: '6px', width: 'fit-content' }}
                >
                  {QUALITY_LABELS[quality]}
                </span>
                {/* Route Name */}
                <div className="text-xl font-bold text-[color:var(--text-primary)] mb-2">
                  {route.label || route.name}
                </div>
                {/* Duration & Distance */}
                <div className="flex flex-row items-center gap-4 text-sm text-[color:var(--text-primary)] opacity-80">
                  <span className="flex items-center gap-1">
                    {/* Clock SVG */}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 7v5l3 3" /></svg>
                    {route.duration ?? '--'}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* Diagonal Arrow SVG */}
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M7 7h10v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    {route.distance ?? '--'}
                  </span>
                </div>
              </div>
              {/* Right Column */}
              <div className="flex flex-col items-end justify-between min-w-[90px]">
                {isBest && (
                  <>
                    <span className="text-xs font-semibold mb-1 text-green-700" style={{ alignSelf: 'flex-end' }}>
                      Recommended
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mt-auto bg-green-100 text-green-700" style={{ alignSelf: 'flex-end' }}>
                      <span role="img" aria-label="leaf">🍃</span> Eco
                    </span>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AlternativeRoutes;