import React from 'react';

const AqiCard: React.FC = () => {
  return (
    <div className="relative w-full max-w-sm rounded-3xl bg-card-elevated p-6 shadow-card-soft ring-1 ring-soft/60">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
            Current Route AQI
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-5xl font-semibold text-accent-green">78</span>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-accent-green-soft">
              Moderate
            </span>
          </div>
        </div>
        <div className="h-16 w-16 rounded-2xl bg-card-bg/60 p-2">
          <div className="flex h-full flex-col justify-between">
            <span className="text-[10px] font-medium text-muted-text">Pollution Saved</span>
            <span className="text-lg font-semibold text-white">32%</span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-muted-text">
        <span>Cleaner than 68% of nearby routes</span>
        <span className="inline-flex items-center gap-1 rounded-pill bg-accent-green/10 px-2 py-1 text-[10px] font-medium text-accent-green-soft">
          Live
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green-soft" />
        </span>
      </div>

      <div className="relative mt-4 h-24 rounded-2xl bg-gradient-to-r from-accent-blue/10 via-accent-green/10 to-accent-green-soft/15 p-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-muted-text">
          <span>Next 12 hours</span>
          <span>Exposure vs Typical</span>
        </div>
        <div className="relative mt-2 h-14 overflow-hidden rounded-xl bg-card-bg/80">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-accent-green-soft/10" />
          <div className="absolute left-3 bottom-2 h-6 w-6 rounded-full bg-accent-green-soft/80 blur-[2px]" />
          <div className="absolute inset-0 flex items-end justify-between px-3 pb-2">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="w-3 rounded-full bg-accent-green-soft/50"
                style={{ height: `${40 + (idx % 3) * 15}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-text">
        <span>
          <span className="font-semibold text-white">2.4kg</span> air pollutants avoided this month
        </span>
        <button
          type="button"
          className="text-[11px] font-medium text-accent-green-soft underline-offset-2 hover:underline"
        >
          View exposure history
        </button>
      </div>
    </div>
  );
};

export default AqiCard;

