import React from 'react';
import AqiCard from './AqiCard';

const Hero: React.FC = () => {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col gap-12 pt-10 pb-16 lg:flex-row lg:items-center lg:pt-16">
      <div className="relative z-10 w-full space-y-7 lg:max-w-xl">
        <div className="pill-tag">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-green/15 text-[10px] font-semibold text-accent-green-soft">
            New
          </span>
          <span>Available in 50+ Cities Globally</span>
        </div>

        <div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Breathe Easier
            <br />
            <span className="text-accent-green">on Every Journey</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-text sm:text-base">
            The world&apos;s first AI-powered navigation that prioritizes your lung health by finding
            routes with the lowest air pollution levels in real-time.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" className="primary-cta w-full sm:w-auto">
            Try EcoRoute Now
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-text">
          <span className="inline-flex items-center gap-1 rounded-pill bg-card-bg/70 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green-soft" />
            Real-time AQI
          </span>
          <span className="inline-flex items-center gap-1 rounded-pill bg-card-bg/70 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
            Hyperlocal Predictions
          </span>
        </div>
      </div>

      <div className="relative w-full lg:flex-1">
        <div className="hero-gradient absolute -inset-x-10 -top-10 -bottom-10 opacity-60 blur-3xl" />
        <div className="relative mx-auto w-full max-w-md rounded-[32px] border border-soft/70 bg-card-bg/80 p-6 shadow-card-soft backdrop-blur">
          <div className="mb-4 flex items-center justify-between text-xs text-muted-text">
            <span>Current Route</span>
            <span>Exposure forecast</span>
          </div>
          <AqiCard />
        </div>
      </div>
    </section>
  );
};

export default Hero;

