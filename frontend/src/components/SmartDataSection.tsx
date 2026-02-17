import React from 'react';

const SmartDataSection: React.FC = () => {
  return (
    <section id = "Features" className="mx-auto mb-20 max-w-6xl scroll-mt-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="rounded-3xl border border-soft/70 bg-card-bg/80 p-6 shadow-card-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-green-soft">
            Air Quality Avoided
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold text-accent-green">2.4kg</p>
              <p className="mt-1 text-xs text-muted-text">Reduced inhalation of pollutants</p>
            </div>
            <div className="text-right text-xs text-muted-text">
              <p>&quot;By choosing cleaner routes, you avoided significant pollution this month.&quot;</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-text">
              <span>Weekly Goal</span>
              <span className="font-semibold text-accent-green-soft">85% to goal</span>
            </div>
            <div className="h-2 rounded-full bg-card-elevated">
              <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-accent-blue to-accent-green-soft" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-green-soft">
            Smart Data for Smarter Breathing
          </p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
            See the impact of every commute.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-text">
            Don&apos;t just see the AQI. Our models predict how pollution will move and shift
            throughout the day so you can consistently make healthier choices, not just lucky ones.
          </p>

          <div className="mt-6 space-y-4 text-sm text-muted-text">
            <div className="flex gap-3">
              <div className="mt-1 h-6 w-6 rounded-2xl bg-accent-green/15 text-center text-xs leading-6 text-accent-green-soft">
                📊
              </div>
              <div>
                <p className="font-semibold text-white/95">12-Hour AQI Prediction</p>
                <p className="mt-1 text-xs">
                  Understand how air quality will change during the day for the routes you take most.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-6 w-6 rounded-2xl bg-accent-blue/15 text-center text-xs leading-6 text-accent-blue">
                🛡️
              </div>
              <div>
                <p className="font-semibold text-white/95">Personal Exposure Tracking</p>
                <p className="mt-1 text-xs">
                  See how route choices affect your monthly exposure with clean, human-friendly
                  reports.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-6 w-6 rounded-2xl bg-card-elevated text-center text-xs leading-6 text-accent-green-soft">
                ⚡
              </div>
              <div>
                <p className="font-semibold text-white/95">Smart Alerts</p>
                <p className="mt-1 text-xs">
                  Get notified when air quality on your usual routes changes unexpectedly so you can
                  adapt in seconds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmartDataSection;

