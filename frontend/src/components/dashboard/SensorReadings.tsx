import React from 'react';
import { SensorData } from './dashboardData';

interface SensorReadingsProps {
  isDarkMode: boolean;
  data?: (SensorData & { co?: number }) | null;
}


const SensorReadings: React.FC<SensorReadingsProps> = ({ data, isDarkMode }) => {
  return (
    <section className="sensor-section w-full">
      {/* PREMIUM STYLED HEADER */}
      <div className="flex item.  -center gap-3 mb-6">
        <div className={`h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/40 ${isDarkMode ? 'to-emerald-500/10' : 'to-emerald-500/20'}`} />
        <p className="text-[10px] font-bold tracking-[0.25em] text-emerald-600 dark:text-emerald-400/90 uppercase whitespace-nowrap">
          Live Data
        </p>
        <div className="h-[2px] w-[2px] rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
        <div className={`h-[1px] flex-1 bg-gradient-to-l from-transparent via-emerald-500/40 ${isDarkMode ? 'to-emerald-500/10' : 'to-emerald-500/20'}`} />
      </div>

      {/* SENSOR LIST */}
      <ul className="grid grid-cols-1 gap-3">
        {[
          { 
            label: 'PM2.5', 
            value: data?.pm25, 
            unit: 'µg/m³', 
            color: 'bg-orange-500', 
            glow: 'shadow-[0_0_12px_rgba(249,115,22,0.3)]' 
          },
          { 
            label: 'PM10', 
            value: data?.pm10, 
            unit: 'µg/m³', 
            color: 'bg-blue-500 dark:bg-blue-400', 
            glow: 'shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
          },
          { 
            label: 'CO', 
            value: data?.co, 
            unit: 'µg/m³', 
            color: 'bg-emerald-500 dark:bg-emerald-400', 
            glow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
          },
        ].map((item, idx) => (
          <li 
            key={idx} 
            className={`
              group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-300 backdrop-blur-md hover:scale-[1.01]
              ${isDarkMode 
                ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10' 
                : 'bg-slate-900/[0.03] border-slate-900/5 hover:bg-slate-900/[0.06] hover:border-slate-900/10'}
            `}
          >
            {/* Left Side: Status Dot & Label */}
            <div className="flex items-center gap-4">
              <div className={`h-2.5 w-2.5 rounded-full ${item.color} ${item.glow} group-hover:scale-110 transition-transform duration-300`} />
              <span className={`text-[12px] font-bold tracking-[0.15em] uppercase ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
                {item.label}
              </span>
            </div>

            {/* Right Side: Scientific Value & Unit Logic */}
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-mono font-bold tabular-nums tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {item.value != null ? item.value : '—'}
              </span>
              
              {item.value != null && (
                <span className={`text-[10px] font-semibold tracking-tighter normal-case ${isDarkMode ? 'text-white/20' : 'text-slate-400'}`}>
                  {item.unit}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default SensorReadings;